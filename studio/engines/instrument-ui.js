import {MODELS,WAVES,Instrument,newProject,blankPattern,validateProject,encodeWav,clamp} from './audio-engine.js';
const query=new URLSearchParams(location.search),model=MODELS[query.get('model')]?query.get('model'):'synth',spec=MODELS[model];
const $=id=>document.getElementById(id),keys='qwerasdfzxcvtygh',storageKey=`neowulf.instrument.v1.${model}`;
let project;try{project=validateProject(JSON.parse(localStorage.getItem(storageKey)),model);}catch{project=newProject(model);}
let engine=new Instrument(project),selected=0,page=0,bank=Math.floor(project.pattern/8),record=false,motion=false,keyboard=false,linked=false,arp=false,clipboard=null,editStep=0,padVoices=new Map(),held=new Set(),saveTimer,toastTimer;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('neowulf.instruments.transport.v1'):null;
document.body.dataset.model=model;if(query.get('embed')==='1')document.body.classList.add('embedded');
$('modelTitle').textContent=spec.title;document.title=`NEOWULF · ${spec.title}`;
const params=[['cutoff','CUTOFF',30,20000,'log'],['resonance','RESONANCE',.1,18,'linear'],['pitch','PITCH',-36,36,'linear'],['volume','LEVEL',0,1,'linear'],['pan','PAN',-1,1,'linear'],['send','FX SEND',0,1,'linear'],['attack','ATTACK',.001,2,'log'],['decay','DECAY',.02,4,'log'],['release','RELEASE',.01,4,'log'],['drive','DRIVE',0,1,'linear']];
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function setStatus(msg){$('status').textContent=msg;}
function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify(project));}catch(e){toast('Speichern fehlgeschlagen: '+e.message);}},250);}
function pattern(){return project.patterns[project.pattern];}
function part(){return project.parts[selected];}
function active(id,state){$(id).classList.toggle('active',Boolean(state));}
function createButtons(){
  for(let i=0;i<spec.parts;i++){
    const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.dataset.part=i;b.onclick=()=>selectPart(i);$('parts').append(b);
    const p=document.createElement('button');p.className='pad';p.dataset.pad=i;p.innerHTML=`${String(i+1).padStart(2,'0')}<small></small>`;p.title=`Pad ${i+1} · Taste ${keys[i].toUpperCase()}`;
    p.onpointerdown=e=>{e.preventDefault();p.setPointerCapture(e.pointerId);hitPad(i);};p.onpointerup=()=>releasePad(i);p.onpointercancel=()=>releasePad(i);$('pads').append(p);
  }
  for(let i=0;i<16;i++){
    const b=document.createElement('button');b.className='step';b.dataset.step=i;b.onclick=e=>{
      const n=page*16+i;if(n>=pattern().length)return;
      if(e.shiftKey){editStep=n;const ev=pattern().events[selected][n];$('editNote').value=ev.note;$('editVelocity').value=ev.velocity;$('editGate').value=ev.gate;$('edit').showModal();}
      else{const ev=pattern().events[selected][n];ev.on=!ev.on;ev.note=Number($('note').value);if(motion)ev.lock=Object.fromEntries(params.map(([k])=>[k,part()[k]]));persist();renderSteps();}
    };$('steps').append(b);
  }
  for(let i=0;i<8;i++){const b=document.createElement('button');b.onclick=()=>engine.selectPattern(bank*8+i);b.dataset.pattern=i;$('patterns').append(b);}
  for(let i=0;i<32;i++)$('bank').add(new Option(String(i+1).padStart(2,'0'),i));
  for(let s=16;s<=spec.maxSteps;s+=16)$('length').add(new Option(`${s} STEPS`,s));
  for(let s=0;s<spec.maxSteps/16;s++)$('page').add(new Option(String(s+1),s));
  for(const [key,title,min,max,scale] of params){
    const box=document.createElement('div');box.className='knobbox';box.innerHTML=`<div class="knob" role="slider" tabindex="0" aria-label="${title}" data-param="${key}"></div><label>${title}</label><output></output>`;
    const knob=box.querySelector('.knob');let dragStart=null;
    const normalize=v=>scale==='log'?Math.log(v/min)/Math.log(max/min):(v-min)/(max-min);
    const denormalize=v=>scale==='log'?min*Math.pow(max/min,v):min+(max-min)*v;
    const change=v=>{part()[key]=denormalize(clamp(v,0,1));if(key==='pitch')part()[key]=Math.round(part()[key]);if(record&&motion&&engine.playing){const ev=pattern().events[selected][engine.lastStep??0];ev.lock??={};ev.lock[key]=part()[key];}renderKnobs();persist();};
    knob.onpointerdown=e=>{e.preventDefault();knob.setPointerCapture(e.pointerId);dragStart={y:e.clientY,v:normalize(part()[key])};};
    knob.onpointermove=e=>{if(dragStart)change(dragStart.v+(dragStart.y-e.clientY)/(e.shiftKey?900:160));};knob.onpointerup=()=>dragStart=null;knob.onpointercancel=()=>dragStart=null;
    knob.onwheel=e=>{e.preventDefault();change(normalize(part()[key])+(e.deltaY<0?.025:-.025));};
    knob.onkeydown=e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();change(normalize(part()[key])+(e.key==='ArrowUp'||e.key==='ArrowRight'?.01:-.01));}};
    knob.ondblclick=()=>{const v=prompt(title,String(part()[key]));if(v!==null&&Number.isFinite(Number(v)))change(normalize(clamp(Number(v),min,max)));};
    $('knobs').append(box);
  }
}
function selectPart(i){selected=i;renderParts();renderKnobs();renderSteps();}
function renderParts(){
  $('partName').textContent=`${String(selected+1).padStart(2,'0')} · ${part().name}`;$('engineKind').textContent=part().sampleId?'USER SAMPLE':part().type==='synth'?'OSC / FM':'PERCUSSION';
  document.querySelectorAll('[data-part]').forEach(b=>{const p=project.parts[Number(b.dataset.part)];b.classList.toggle('active',Number(b.dataset.part)===selected);b.style.opacity=p.mute?.45:1;b.title=p.name;});
  document.querySelectorAll('[data-pad]').forEach(b=>{const i=Number(b.dataset.pad);b.classList.toggle('selected',i===selected);b.querySelector('small').textContent=project.parts[i].name;});
  active('mute',part().mute);active('solo',part().solo);active('reverse',part().reverse);active('loop',part().loop);
  $('wave').replaceChildren();if(part().type==='synth'){for(const w of WAVES)$('wave').add(new Option(w.toUpperCase(),w));$('wave').value=part().wave;}
  else{for(const [i,n] of ['KICK','SNARE','CLOSED HAT','OPEN HAT','CLAP','LOW TOM','RIM','CRASH','PERC'].entries())$('wave').add(new Option(n,i));$('wave').value=part().drum;}
  $('sampleStart').value=part().start;$('sampleEnd').value=part().end;$('sampleName').textContent=part().sampleId?part().name:'Eigene synthetische Werksklänge';
}
function renderKnobs(){for(const [key,title,min,max,scale] of params){const knob=document.querySelector(`[data-param="${key}"]`),v=part()[key],n=scale==='log'?Math.log(v/min)/Math.log(max/min):(v-min)/(max-min);knob.style.setProperty('--v',n);knob.setAttribute('aria-valuemin',min);knob.setAttribute('aria-valuemax',max);knob.setAttribute('aria-valuenow',v.toFixed(3));knob.parentElement.querySelector('output').textContent=key==='cutoff'?`${Math.round(v)} Hz`:['attack','decay','release'].includes(key)?`${Math.round(v*1000)} ms`:key==='pitch'?`${v>0?'+':''}${v} st`:v.toFixed(2);}}
function renderSteps(current=-1){
  $('length').value=pattern().length;$('page').value=page;
  document.querySelectorAll('[data-step]').forEach(b=>{const s=page*16+Number(b.dataset.step),e=pattern().events[selected][s];b.disabled=s>=pattern().length;b.textContent=String(s+1).padStart(2,'0');b.classList.toggle('on',Boolean(e.on));b.classList.toggle('current',s===current);b.classList.toggle('beat',s%4===0);b.title=`Step ${s+1} · Note ${e.note} · Velocity ${Math.round(e.velocity*100)}%${e.lock?' · Motion':''}`;});
  if(current>=0)$('stepReadout').textContent=`${String(current+1).padStart(2,'0')} / ${pattern().length}`;
}
function renderPatterns(){
  $('bank').value=bank;$('patternName').textContent=`${String(project.pattern+1).padStart(3,'0')} · ${pattern().name}`;
  document.querySelectorAll('[data-pattern]').forEach(b=>{const id=bank*8+Number(b.dataset.pattern);b.textContent=String(id+1).padStart(3,'0');b.classList.toggle('active',id===project.pattern);b.title=project.patterns[id]?.name||'INIT';});
  active('chain',project.chain.length);renderSteps();
}
function renderGlobals(){ $('tempo').value=project.tempo;$('swing').value=project.swing;$('master').value=project.master;$('readout').textContent=`${project.tempo.toFixed(1)} BPM`;}
function bindEngine(){
  engine.onStep=(s,id)=>{if(id!==undefined&&id!==project.pattern)return;renderSteps(s);};
  engine.onPattern=()=>{renderPatterns();persist();};engine.onTrigger=(i,t)=>{const delay=Math.max(0,(t-(engine.ctx?.currentTime||0))*1000);setTimeout(()=>flashPad(i),delay);};
}
function flashPad(i){const el=document.querySelector(`[data-pad="${i}"]`);if(!el)return;el.classList.add('hit');setTimeout(()=>{if(!held.has(i))el.classList.remove('hit');},110);}
async function ensureAudio(){await engine.enable();document.body.classList.add('audio-on');$('power').textContent='AUDIO READY';setStatus(`${engine.ctx.sampleRate/1000} kHz · ECHTE AUDIOAUSGABE`);}
async function hitPad(i){
  try{await ensureAudio();held.add(i);const playedPart=keyboard?selected:i,note=keyboard?Number($('note').value)+i:Number($('note').value);if(!keyboard)selectPart(i);const voice=await engine.hit(playedPart,clamp(note,0,127));padVoices.set(i,voice);flashPad(i);
    if(record&&engine.playing){const s=engine.lastStep??0,ev=pattern().events[playedPart][s];ev.on=true;ev.note=note;ev.velocity=.85;persist();renderSteps(s);}
  }catch(e){toast(e.message);}
}
function releasePad(i){held.delete(i);if(keyboard)padVoices.get(i)?.release();padVoices.delete(i);document.querySelector(`[data-pad="${i}"]`)?.classList.remove('hit');}
async function play(epoch,broadcast=true){await ensureAudio();if(linked&&broadcast)epoch=Date.now()+180;await engine.start(epoch);active('play',true);setStatus('SEQUENCER LÄUFT');if(linked&&broadcast)channel?.postMessage({type:'play',tempo:project.tempo,epoch});}
function stop(broadcast=true){engine.stop();active('play',false);setStatus('GESTOPPT');if(linked&&broadcast)channel?.postMessage({type:'stop'});}
channel?.addEventListener('message',async({data})=>{if(!linked||!data)return;try{if(data.type==='play'){project.tempo=clamp(Number(data.tempo)||128,40,300);renderGlobals();await play(data.epoch,false);}if(data.type==='stop')stop(false);if(data.type==='tempo'){project.tempo=clamp(Number(data.value),40,300);renderGlobals();}}catch(e){toast(e.message);}});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),15000);}
async function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(`neowulf-${model}`,1);r.onupgradeneeded=()=>r.result.createObjectStore('samples');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function storeSample(id,blob){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('samples','readwrite');tx.objectStore('samples').put(blob,id);tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>{d.close();reject(tx.error);};});}
async function restoreSamples(){
  const ids=[...new Set(project.parts.map(p=>p.sampleId).filter(Boolean))];if(!ids.length)return;
  const d=await db();for(const id of ids){const blob=await new Promise((res,rej)=>{const r=d.transaction('samples').objectStore('samples').get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});if(blob)await engine.loadSample(blob,id);else toast(`Sample ${id} fehlt · neu laden`);}d.close();
}
function blobB64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
async function exportProject(){
  const out=structuredClone(project);out.samples={};for(const id of new Set(project.parts.map(p=>p.sampleId).filter(Boolean))){const buf=engine.samples.get(id);if(buf)out.samples[id]=await blobB64(encodeWav(buf));}
  download(new Blob([JSON.stringify(out)],{type:'application/json'}),`NEOWULF-${model}-${pattern().name.replace(/[^a-z0-9_-]/ig,'_')}.json`);toast('Projekt inklusive Samples exportiert');
}
async function importProject(file){
  if(file.size>100*1024*1024)throw Error('Projektdatei ist zu groß');const next=validateProject(JSON.parse(await file.text()),model);
  const samples=new Map();await ensureAudio();for(const [id,b64] of Object.entries(next.samples)){if(typeof b64!=='string'||b64.length>90000000)throw Error('Ungültiges Sample');const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'audio/wav'});const buf=await engine.ctx.decodeAudioData(bytes.buffer.slice(0));samples.set(id,buf);await storeSample(id,blob);}
  stop();engine.graph.panic();engine.samples=samples;engine.reversed.clear();next.samples={};project=next;engine.project=project;engine.graph.master.gain.setTargetAtTime(project.master,engine.ctx.currentTime,.015);selected=0;bank=Math.floor(project.pattern/8);page=0;renderAll();persist();toast('Projekt und Audio geladen');
}
function renderAll(){renderParts();renderKnobs();renderPatterns();renderGlobals();}
createButtons();bindEngine();renderAll();
$('power').onclick=()=>ensureAudio().catch(e=>toast(e.message));$('play').onclick=()=>play(linked?Date.now()+180:undefined).catch(e=>toast(e.message));$('stop').onclick=()=>stop();
$('record').onclick=()=>{record=!record;active('record',record);document.body.classList.toggle('recording',record);};$('motion').onclick=()=>{motion=!motion;active('motion',motion);};
$('link').onclick=()=>{linked=!linked;active('link',linked);toast(linked?'Instrumentdecks über gemeinsamen Transport verbunden':'Transport bleibt unabhängig');};
$('keyboard').onclick=()=>{keyboard=!keyboard;active('keyboard',keyboard);};$('arp').onclick=()=>{arp=!arp;active('arp',arp);};
$('tempo').onchange=()=>{project.tempo=clamp(Number($('tempo').value)||128,40,300);renderGlobals();persist();if(linked)channel?.postMessage({type:'tempo',value:project.tempo});};
$('swing').oninput=()=>{project.swing=Number($('swing').value);persist();};$('master').oninput=()=>{project.master=Number($('master').value);if(engine.graph)engine.graph.master.gain.setTargetAtTime(project.master,engine.ctx.currentTime,.015);persist();};
$('wave').onchange=()=>{if(part().type==='synth')part().wave=$('wave').value;else part().drum=Number($('wave').value);part().sampleId=null;renderParts();persist();};
for(const [id,key] of [['mute','mute'],['solo','solo'],['reverse','reverse'],['loop','loop']])$(id).onclick=()=>{part()[key]=!part()[key];renderParts();persist();};
$('sampleStart').oninput=()=>{part().start=Math.min(Number($('sampleStart').value),part().end-.01);persist();};$('sampleEnd').oninput=()=>{part().end=Math.max(Number($('sampleEnd').value),part().start+.01);persist();};
$('sampleImport').onclick=()=>$('sampleFile').click();$('sampleFile').onchange=async()=>{const file=$('sampleFile').files[0];if(!file)return;const index=selected;try{await ensureAudio();const id=`sample-${Date.now()}-${index}`,buf=await engine.loadSample(file,id);project.parts[index].sampleId=id;project.parts[index].name=file.name.slice(0,30);project.parts[index].start=0;project.parts[index].end=1;await storeSample(id,encodeWav(buf));renderParts();persist();toast(`${file.name}: ${buf.duration.toFixed(2)} s geladen`);}catch(e){toast(e.message);}$('sampleFile').value='';};
$('length').onchange=()=>{pattern().length=Number($('length').value);if(page*16>=pattern().length)page=0;renderSteps();persist();};$('page').onchange=()=>{page=Number($('page').value);renderSteps();};
$('bank').onchange=()=>{bank=Number($('bank').value);renderPatterns();};$('clear').onclick=()=>{pattern().events[selected]=blankPattern(1).events[0];renderSteps();persist();};
$('copy').onclick=()=>{clipboard=structuredClone(pattern().events[selected]);toast('Part-Sequenz kopiert');};$('paste').onclick=()=>{if(!clipboard)return toast('Zuerst eine Part-Sequenz kopieren');pattern().events[selected]=structuredClone(clipboard);renderSteps();persist();};
$('rename').onclick=()=>{const n=prompt('Patternname',pattern().name);if(n!==null){pattern().name=n.slice(0,32);renderPatterns();persist();}};
$('chain').onclick=()=>{const n=prompt('Song Chain: Patternnummern 1–256, getrennt durch Komma. Leer = aus.',project.chain.map(i=>i+1).join(','));if(n===null)return;const list=n.trim()?n.split(',').map(x=>Number(x.trim())-1):[];if(list.some(x=>!Number.isInteger(x)||x<0||x>255))return toast('Nur Patternnummern 1–256 eingeben');project.chain=list;engine.chainIndex=0;active('chain',list.length);persist();};
$('save').onclick=()=>exportProject().catch(e=>toast(e.message));$('load').onclick=()=>$('projectFile').click();$('projectFile').onchange=()=>{const f=$('projectFile').files[0];if(f)importProject(f).catch(e=>toast(e.message));$('projectFile').value='';};
$('wav').onclick=async()=>{const n=prompt('Pattern-Wiederholungen (1–16)','2');if(n===null)return;try{await ensureAudio();setStatus('WAV WIRD GERENDERT');const b=await engine.renderWav(clamp(Math.round(Number(n)||1),1,16));download(b,`NEOWULF-${model}-${project.pattern+1}.wav`);setStatus('WAV EXPORTIERT');}catch(e){toast(e.message);}};
$('editSave').onclick=()=>{const e=pattern().events[selected][editStep];e.note=clamp(Number($('editNote').value),0,127);e.velocity=Number($('editVelocity').value);e.gate=Number($('editGate').value);e.on=true;renderSteps();persist();};
$('midi').onclick=async()=>{try{if(!navigator.requestMIDIAccess)throw Error('MIDI ist in dieser Laufzeit nicht verfügbar');const midi=await navigator.requestMIDIAccess(),inputs=[...midi.inputs.values()];if(!inputs.length)throw Error('Kein MIDI-Eingang angeschlossen');for(const input of inputs)input.onmidimessage=async({data})=>{const [st,note,vel]=data;if((st&240)===144&&vel>0){await ensureAudio();const v=await engine.hit(selected,note,vel/127);padVoices.set(`m${note}`,v);}else if((st&240)===128||((st&240)===144&&vel===0)){padVoices.get(`m${note}`)?.release();padVoices.delete(`m${note}`);}};active('midi',true);toast(inputs.map(i=>i.name).join(', '));}catch(e){toast(e.message);}};
document.addEventListener('keydown',e=>{if(/input|select|textarea/i.test(e.target.tagName)||$('edit').open||e.ctrlKey||e.metaKey)return;if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(engine.playing)stop();else play().catch(x=>toast(x.message));}}const i=keys.indexOf(e.key.toLowerCase());if(i>=0&&i<spec.parts&&!e.repeat)hitPad(i);});
document.addEventListener('keyup',e=>{const i=keys.indexOf(e.key.toLowerCase());if(i>=0)releasePad(i);});window.addEventListener('blur',()=>{for(const i of [...held])releasePad(i);});
let arpLast=0,arpIndex=0,audioSent=0;const audioChannel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('neowulf.audio.v1'):null;const scope=$('scope'),sc=scope.getContext('2d'),data=new Float32Array(2048),pcmL=new Float32Array(512),pcmR=new Float32Array(512);
const renderClock=new HellfireRenderClock("instrument-"+model);
function draw(now){
  requestAnimationFrame(draw);
  if(arp&&held.size&&engine.ctx?.state==='running'&&now-arpLast>60000/project.tempo/4){arpLast=now;const notes=[0,3,7,12];engine.hit(selected,Number($('note').value)+notes[arpIndex++%4]).catch(()=>{});}
  if(!renderClock.due(now))return;const paintStarted=performance.now();
  const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(scope.clientWidth*dpr),h=Math.round(scope.clientHeight*dpr);if(scope.width!==w||scope.height!==h){scope.width=w;scope.height=h;}
  sc.fillStyle='#050608';sc.fillRect(0,0,w,h);sc.strokeStyle='#55202045';sc.lineWidth=dpr;for(let x=0;x<w;x+=w/8){sc.beginPath();sc.moveTo(x,0);sc.lineTo(x,h);sc.stroke();}for(let y=0;y<h;y+=h/4){sc.beginPath();sc.moveTo(0,y);sc.lineTo(w,y);sc.stroke();}
  if(engine.graph){engine.graph.analyser.getFloatTimeDomainData(data);sc.strokeStyle='#ff6650';sc.shadowColor='#ff3218';sc.shadowBlur=7*dpr;sc.lineWidth=1.1*dpr;sc.beginPath();for(let i=0;i<data.length;i++){const x=i*w/(data.length-1),y=h/2-data[i]*h*.8;if(i===0)sc.moveTo(x,y);else sc.lineTo(x,y);}sc.stroke();sc.shadowBlur=0;}
  if(audioChannel&&engine.graph&&now-audioSent>33){audioSent=now;engine.graph.leftAnalyser.getFloatTimeDomainData(pcmL);engine.graph.rightAnalyser.getFloatTimeDomainData(pcmR);const rms=a=>Math.min(255,Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length)*255*2);const left=rms(pcmL),right=rms(pcmR);audioChannel.postMessage({type:'instrument-audio',model,playing:engine.playing||held.size>0||left>1||right>1,left,right,pcmLeft:Array.from(pcmL),pcmRight:Array.from(pcmR),sampleRate:engine.ctx.sampleRate});}
  renderClock.record(now,performance.now()-paintStarted);
}requestAnimationFrame(draw);
restoreSamples().catch(e=>toast('Sample-Wiederherstellung: '+e.message));
window.neowulf={get renderStats(){return renderClock.stats;},get project(){return project;},get engine(){return engine;},selectPart,renderAll,validateProject,importProject,exportProject};
window.addEventListener('beforeunload',()=>{try{localStorage.setItem(storageKey,JSON.stringify(project));}catch{}engine.dispose();channel?.close();});
