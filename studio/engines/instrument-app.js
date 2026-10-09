/* NEOWULF original instrument engine. No Korg firmware or factory PCM is used. */
const MODELS = {
  synth: {title:'Electribe 2 · Synth', parts:16, synths:7, maxSteps:64, accent:'#ff342c'},
  sampler: {title:'Electribe 2 · Sampler', parts:16, synths:0, maxSteps:64, accent:'#d63830'},
  emx: {title:'EMX-1', parts:14, synths:5, maxSteps:128, accent:'#ea3830'}
};
const WAVES=['sawtooth','square','triangle','sine','fm','noise'];
const DRUMS=['KICK','SNARE','CLOSED HAT','OPEN HAT','CLAP','LOW TOM','RIM','CRASH','PERC'];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const hz=n=>440*Math.pow(2,(n-69)/12);
function blankPattern(parts,length=16){
  return {name:'INIT',length,events:Array.from({length:parts},()=>Array.from({length:128},()=>({on:false,note:48,velocity:.8,gate:.72,lock:null})))};
}
function newProject(model){
  const spec=MODELS[model]; if(!spec)throw Error('Unknown instrument');
  const parts=Array.from({length:spec.parts},(_,i)=>{
    const drum=model==='sampler'||i>=spec.synths;
    const d=(model==='sampler'?i:i-spec.synths+9)%9;
    return {name:drum?DRUMS[d]:`SYNTH ${i+1}`,type:drum?'drum':'synth',wave:WAVES[i%4],drum:d,
      volume:drum?.68:.42,pan:0,cutoff:drum?17000:5200,resonance:.7,attack:.003,decay:.24,release:.09,
      pitch:0,drive:.12,send:.16,mute:false,solo:false,start:0,end:1,reverse:false,loop:false,sampleId:null};
  });
  const p=blankPattern(spec.parts);p.name='HELLFIRE 01';
  const kick=spec.synths,hat=(spec.synths+2)%spec.parts,snare=(spec.synths+1)%spec.parts;
  for(let s=0;s<16;s++){
    if(s%4===0)p.events[kick][s].on=true;
    if(s%2===0)p.events[hat][s].on=true;
    if(s%8===4)p.events[snare][s].on=true;
    if(spec.synths&&s%4===2){p.events[0][s].on=true;p.events[0][s].note=[36,36,39,34][Math.floor(s/4)];}
  }
  return {format:'NEOWULF-INSTRUMENT',version:1,model,tempo:128,swing:0,master:.55,pattern:0,patterns:{0:p},parts,chain:[],samples:{}};
}
function validateProject(value,model){
  if(value?.format!=='NEOWULF-INSTRUMENT'||value.version!==1||value.model!==model)throw Error('Project belongs to another instrument or format');
  const spec=MODELS[model];
  if(!Array.isArray(value.parts)||value.parts.length!==spec.parts||!value.patterns||typeof value.patterns!=='object')throw Error('Invalid part or pattern count');
  value.tempo=clamp(Number(value.tempo)||128,40,300);value.swing=clamp(Number(value.swing)||0,0,.45);value.master=clamp(Number(value.master)||0,0,1);
  value.pattern=clamp(Math.floor(Number(value.pattern)||0),0,255);
  for(const p of value.parts){
    for(const [key,lo,hi,def] of [['volume',0,1,.5],['pan',-1,1,0],['cutoff',30,20000,6000],['resonance',.1,18,.7],['attack',.001,2,.003],['decay',.02,4,.24],['release',.01,4,.1],['pitch',-36,36,0],['drive',0,1,0],['send',0,1,.15],['start',0,.99,0],['end',.01,1,1]])p[key]=clamp(Number.isFinite(Number(p[key]))?Number(p[key]):def,lo,hi);
    p.end=Math.max(p.start+.01,p.end);p.type=p.type==='synth'?'synth':'drum';p.wave=WAVES.includes(p.wave)?p.wave:'sawtooth';p.drum=clamp(Math.floor(Number(p.drum)||0),0,8);
    p.name=String(p.name||'PART').slice(0,32);p.sampleId=typeof p.sampleId==='string'?p.sampleId:null;
    for(const k of ['mute','solo','reverse','loop'])p[k]=Boolean(p[k]);
  }
  const out={};
  for(const [id,p] of Object.entries(value.patterns)){
    if(!/^\d+$/.test(id)||Number(id)>255)continue;
    if(!Array.isArray(p.events)||p.events.length!==spec.parts)throw Error('Invalid pattern events');
    p.length=clamp(Math.floor(Number(p.length)||16),1,spec.maxSteps);p.name=String(p.name||'INIT').slice(0,32);
    p.events=p.events.map(row=>Array.from({length:128},(_,s)=>{
      const e=row?.[s]||{};return {on:Boolean(e.on),note:clamp(Math.floor(Number(e.note)||48),0,127),velocity:clamp(Number.isFinite(Number(e.velocity))?Number(e.velocity):.8,0,1),gate:clamp(Number(e.gate)||.72,.05,8),lock:e.lock&&typeof e.lock==='object'?Object.fromEntries(Object.entries(e.lock).filter(([k,v])=>['cutoff','resonance','pitch','volume','pan','drive','send'].includes(k)&&Number.isFinite(v))):null};
    }));out[id]=p;
  }
  value.patterns=out;if(!out[value.pattern])value.patterns[value.pattern]=blankPattern(spec.parts);
  value.chain=Array.isArray(value.chain)?value.chain.filter(n=>Number.isInteger(n)&&n>=0&&n<=255).slice(0,256):[];
  value.samples=value.samples&&typeof value.samples==='object'?value.samples:{};
  return value;
}
function curve(amount){const a=new Float32Array(2048),k=amount*35;for(let i=0;i<a.length;i++){const x=i*2/(a.length-1)-1;a[i]=k?Math.tanh(x*(1+k))/Math.tanh(1+k):x;}return a;}
function noiseBuffer(ctx,seconds=2){const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);let seed=38719;for(let i=0;i<d.length;i++){seed=(seed*1664525+1013904223)>>>0;d[i]=seed/2147483648-1;}return b;}
class AudioGraph {
  constructor(ctx,master=.55){
    this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=master;
    this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-8;this.limiter.knee.value=6;this.limiter.ratio.value=8;
    this.analyser=ctx.createAnalyser();this.analyser.fftSize=2048;this.master.connect(this.limiter);this.limiter.connect(this.analyser);this.analyser.connect(ctx.destination);
    this.splitter=ctx.createChannelSplitter(2);this.leftAnalyser=ctx.createAnalyser();this.rightAnalyser=ctx.createAnalyser();this.leftAnalyser.fftSize=512;this.rightAnalyser.fftSize=512;this.limiter.connect(this.splitter);this.splitter.connect(this.leftAnalyser,0);this.splitter.connect(this.rightAnalyser,1);
    this.delay=ctx.createDelay(2);this.delay.delayTime.value=.234375;this.feedback=ctx.createGain();this.feedback.gain.value=.28;this.wet=ctx.createGain();this.wet.gain.value=.25;
    this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.wet);this.wet.connect(this.master);this.noise=noiseBuffer(ctx);
    this.voices=new Set();this.samples=new Map();
  }
  trigger(part,event,time,duration,sample){
    const ctx=this.ctx,p={...part,...(event.lock||{})},t=Math.max(ctx.currentTime,time),gate=Math.max(.015,duration*event.gate);
    const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),drive=ctx.createWaveShaper(),pan=ctx.createStereoPanner(),send=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=clamp(p.cutoff,30,ctx.sampleRate*.45);filter.Q.value=clamp(p.resonance,.1,18);drive.curve=curve(clamp(p.drive,0,1));drive.oversample='2x';pan.pan.value=clamp(p.pan,-1,1);send.gain.value=clamp(p.send,0,1);
    filter.connect(drive);drive.connect(gain);gain.connect(pan);pan.connect(this.master);pan.connect(send);send.connect(this.delay);
    const sources=[];let stopAt=t+gate+p.release+.06;const pitch=event.note-48+p.pitch;
    if(sample){
      const src=ctx.createBufferSource();src.buffer=sample;src.playbackRate.value=Math.pow(2,pitch/12);src.loop=Boolean(p.loop);
      const start=clamp(p.start,0,.99)*sample.duration,end=clamp(p.end,p.start+.01,1)*sample.duration;
      src.loopStart=start;src.loopEnd=end;src.connect(filter);
      if(src.loop)src.start(t,start);else src.start(t,start,(end-start)/1);
      sources.push(src);if(!src.loop)stopAt=Math.min(stopAt,t+(end-start)/src.playbackRate.value+.02);
    }else if(p.type==='synth'){
      const osc=ctx.createOscillator();osc.type=p.wave==='fm'?'sine':p.wave==='noise'?'sawtooth':p.wave;osc.frequency.value=hz(event.note+p.pitch);osc.connect(filter);sources.push(osc);
      if(p.wave==='fm'){const mod=ctx.createOscillator(),depth=ctx.createGain();mod.frequency.value=hz(event.note+p.pitch)*2;depth.gain.value=hz(event.note+p.pitch)*1.6;mod.connect(depth);depth.connect(osc.frequency);sources.push(mod);}
      if(p.wave==='noise'){osc.disconnect();const n=ctx.createBufferSource();n.buffer=this.noise;n.loop=true;n.connect(filter);sources.push(n);}
      for(const s of sources)s.start(t);
    }else{
      const kind=p.drum;
      if([0,5,6,8].includes(kind)){
        const osc=ctx.createOscillator();osc.type=kind===6?'triangle':'sine';const f=kind===0?155:kind===5?210:kind===6?700:350;
        osc.frequency.setValueAtTime(f*Math.pow(2,p.pitch/12),t);osc.frequency.exponentialRampToValueAtTime(Math.max(28,f*.24)*Math.pow(2,p.pitch/12),t+.17);osc.connect(filter);osc.start(t);sources.push(osc);
      }
      if([1,2,3,4,7,8].includes(kind)){
        const n=ctx.createBufferSource(),hp=ctx.createBiquadFilter();n.buffer=this.noise;hp.type='highpass';hp.frequency.value=[0,1600,8500,6200,1800,0,0,5000,3200][kind];n.connect(hp);hp.connect(filter);n.start(t);sources.push(n);
      }
      const drumDecay=[.42,.21,.065,.36,.15,.33,.055,.8,.17][kind];stopAt=t+drumDecay+p.release+.04;
    }
    const end=Math.max(t+.006,stopAt-p.release-.015),amp=clamp(p.volume,0,1)*clamp(event.velocity,0,1)*.6;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(amp,t+Math.min(p.attack,(end-t)*.3));
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001,amp*.55),Math.min(end,t+p.attack+p.decay));
    gain.gain.setTargetAtTime(.00001,end,Math.max(.004,p.release/4));
    const voice={sources,gain,stopAt,release:(when=ctx.currentTime)=>{const a=Math.max(t,when);gain.gain.cancelScheduledValues(a);gain.gain.setTargetAtTime(.00001,a,Math.max(.004,p.release/4));for(const s of sources){try{s.stop(a+p.release+.03);}catch{}}}};
    this.voices.add(voice);for(const s of sources){try{s.stop(stopAt);}catch{}}
    if(sources[0])sources[0].onended=()=>{this.voices.delete(voice);for(const node of [gain,filter,drive,pan,send])node.disconnect();};
    return voice;
  }
  panic(){for(const v of this.voices){for(const s of v.sources){try{s.stop();}catch{}}}this.voices.clear();}
}
class Instrument {
  constructor(project){this.project=project;this.ctx=null;this.graph=null;this.samples=new Map();this.reversed=new Map();this.playing=false;this.step=0;this.nextTime=0;this.timer=null;this.pendingPattern=null;this.chainIndex=0;this.scheduled=[];this.onStep=()=>{};this.onPattern=()=>{};this.onTrigger=()=>{};}
  async enable(){
    if(!this.ctx){this.ctx=new AudioContext({latencyHint:'interactive'});this.graph=new AudioGraph(this.ctx,this.project.master);}
    if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx;
  }
  async loadSample(file,id){
    await this.enable();if(file.size>64*1024*1024)throw Error('Sample exceeds 64 MB');
    const data=await file.arrayBuffer(),buf=await this.ctx.decodeAudioData(data);
    if(buf.duration>120)throw Error('Sample exceeds 120 seconds');this.samples.set(id,buf);this.reversed.delete(id);return buf;
  }
  sampleFor(part){
    const b=this.samples.get(part.sampleId);if(!b||!part.reverse)return b;
    if(!this.reversed.has(part.sampleId)){const r=this.ctx.createBuffer(b.numberOfChannels,b.length,b.sampleRate);for(let c=0;c<b.numberOfChannels;c++)r.getChannelData(c).set(Float32Array.from(b.getChannelData(c)).reverse());this.reversed.set(part.sampleId,r);}return this.reversed.get(part.sampleId);
  }
  async start(epoch){await this.enable();if(this.playing)return;this.playing=true;this.step=0;this.chainIndex=0;this.nextTime=this.ctx.currentTime+(epoch?Math.max(.02,(epoch-Date.now())/1000):.06);this.tick();this.timer=setInterval(()=>this.tick(),20);}
  stop(){this.playing=false;clearInterval(this.timer);this.timer=null;this.graph?.panic();this.scheduled=[];this.onStep(-1);}
  tick(){
    if(!this.playing||this.ctx.state!=='running')return;
    if(this.nextTime<this.ctx.currentTime-.2){this.nextTime=this.ctx.currentTime+.02;this.scheduled=[];}
    let guard=0;
    while(this.nextTime<this.ctx.currentTime+.12&&guard++<32){
      const pr=this.project,pat=pr.patterns[pr.pattern],base=60/pr.tempo/4;
      const swing=this.step%2===1?base*pr.swing:0,t=this.nextTime+swing;
      const solo=pr.parts.some(p=>p.solo);
      pr.parts.forEach((p,i)=>{const e=pat.events[i][this.step];if(e?.on&&!p.mute&&(!solo||p.solo)){this.graph.trigger(p,e,t,base,this.sampleFor(p));this.onTrigger(i,t);}});
      this.scheduled.push({step:this.step,time:t,pattern:pr.pattern});this.nextTime+=base;this.step++;
      if(this.step>=pat.length){this.step=0;if(pr.chain.length){this.chainIndex=(this.chainIndex+1)%pr.chain.length;this.setPattern(pr.chain[this.chainIndex]);}else if(this.pendingPattern!==null){this.setPattern(this.pendingPattern);this.pendingPattern=null;}}
    }
    while(this.scheduled.length&&this.scheduled[0].time<=this.ctx.currentTime){const x=this.scheduled.shift();this.lastStep=x.step;this.onStep(x.step,x.pattern);}
  }
  setPattern(id){id=clamp(Math.floor(id),0,255);if(!this.project.patterns[id])this.project.patterns[id]=blankPattern(MODELS[this.project.model].parts);this.project.pattern=id;this.onPattern(id);}
  selectPattern(id){if(this.playing)this.pendingPattern=id;else this.setPattern(id);}
  async hit(part,note=48,velocity=.85){await this.enable();const p=this.project.parts[part];this.onTrigger(part,this.ctx.currentTime);return this.graph.trigger(p,{note,velocity,gate:1},this.ctx.currentTime,.28,this.sampleFor(p));}
  async renderWav(repeats=1){
    repeats=clamp(Math.floor(Number(repeats)||1),1,16);
    const pr=this.project,pat=pr.patterns[pr.pattern],beat=60/pr.tempo/4,duration=pat.length*beat*clamp(repeats,1,16);
    const ctx=new OfflineAudioContext(2,Math.ceil((duration+2)*48000),48000),graph=new AudioGraph(ctx,pr.master);
    const solo=pr.parts.some(p=>p.solo);
    for(let s=0;s<pat.length*repeats;s++)pr.parts.forEach((p,i)=>{
      const e=pat.events[i][s%pat.length];if(e?.on&&!p.mute&&(!solo||p.solo))graph.trigger(p,e,.01+s*beat+(s%2===1?beat*pr.swing:0),beat,this.sampleFor(p));
    });
    return encodeWav(await ctx.startRendering());
  }
  dispose(){this.stop();this.ctx?.close();this.ctx=null;this.graph=null;}
}
function encodeWav(buf){
  const n=buf.length,c=buf.numberOfChannels,rate=buf.sampleRate,bytes=new ArrayBuffer(44+n*c*2),v=new DataView(bytes);
  const text=(o,t)=>[...t].forEach((x,i)=>v.setUint8(o+i,x.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,36+n*c*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,c,true);v.setUint32(24,rate,true);v.setUint32(28,rate*c*2,true);v.setUint16(32,c*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*c*2,true);
  const channels=Array.from({length:c},(_,i)=>buf.getChannelData(i));let o=44;
  for(let i=0;i<n;i++)for(let k=0;k<c;k++){v.setInt16(o,Math.round(clamp(channels[k][i],-1,1)*32767),true);o+=2;}
  return new Blob([bytes],{type:'audio/wav'});
}

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
