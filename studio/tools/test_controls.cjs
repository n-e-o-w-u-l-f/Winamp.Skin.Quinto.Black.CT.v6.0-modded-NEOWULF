// Real Edge/CDP tests for the embedded geometry, sound, controls and paint cadence.
const fs=require('fs'), assert=require('assert');
const output=process.argv[2], base=process.argv[3], debug=process.argv[4]||'http://127.0.0.1:9225';
if(!output||!base)throw Error('Usage: node test_reference.cjs OUTPUT BASE_URL [CDP_URL]');
fs.mkdirSync(output,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function page(url,width,height){
 const info=await(await fetch(debug+'/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();
 const ws=new WebSocket(info.webSocketDebuggerUrl),pending=new Map(),errors=[],events=[];let id=0;
 await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.no(Error(JSON.stringify(m.error))):p.ok(m.result);}}else {events.push(m);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);}};
 const call=(method,params={})=>new Promise((ok,no)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);no(Error('CDP timeout '+method));},12000);pending.set(n,{ok,no,timer});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async(fn,...args)=>{const expression='('+fn.toString()+')('+args.map(x=>JSON.stringify(x)).join(',')+')',r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Runtime.enable');await call('Page.enable');await call('Page.bringToFront');
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
 const shot=async(name)=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(output+'/'+name+'.png',Buffer.from(r.data,'base64'));};
 const close=async()=>{for(const p of pending.values())clearTimeout(p.timer);ws.close();await fetch(debug+'/json/close/'+info.id);};
 return {call,evaluate,shot,close,errors,events};
}
async function ready(p,key){for(let i=0;i<60;i++){if(await p.evaluate(k=>Boolean(window[k]),key))return;await pause(100);}throw Error('UI failed to start '+key);}

async function dialog(p,button,value){
 const work=p.evaluate(id=>document.getElementById(id).click(),button);
 for(let n=0;n<50&&!p.events.some(e=>e.method==='Page.javascriptDialogOpening');n++)await pause(20);
 assert(p.events.some(e=>e.method==='Page.javascriptDialogOpening'),'Missing dialog '+button);
 await p.call('Page.handleJavaScriptDialog',{accept:true,promptText:value});await work;
 p.events.splice(0,p.events.length);
}
async function click(p,id){await p.evaluate(id=>document.getElementById(id).click(),id);}
async function input(p,id,value,event='change'){await p.evaluate((id,value,event)=>{const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event(event,{bubbles:true}));},id,value,event);}
async function pad(p,index,down){
 const pos=await p.evaluate(i=>{const r=document.querySelector('[data-pad="'+i+'"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};},index);
 await p.call('Input.dispatchMouseEvent',{type:down?'mousePressed':'mouseReleased',...pos,button:'left',clickCount:1});
}
async function pickFile(p,id,file){
 p.events.splice(0,p.events.length);await p.call('Page.setInterceptFileChooserDialog',{enabled:true});await click(p,id);
 for(let n=0;n<50&&!p.events.some(e=>e.method==='Page.fileChooserOpened');n++)await pause(20);
 const event=p.events.find(e=>e.method==='Page.fileChooserOpened');assert(event,'File chooser '+id);
 await p.call('DOM.setFileInputFiles',{files:[file],backendNodeId:event.params.backendNodeId});
}
async function downloaded(dir,extension){
 for(let n=0;n<100;n++){const name=fs.readdirSync(dir).find(x=>x.endsWith(extension));if(name)return dir+'/'+name;await pause(50);}throw Error('Download missing '+extension);
}
(async()=>{
 const result={observedUtc:new Date().toISOString(),environment:'Legion Chrome headless; real Web Audio; MIDI simulated; native Winamp not tested',instruments:[]};
 for(const model of ['synth','sampler','emx']){
  const p=await page(base+'/instrument.html?model='+model+'&embed=1',744,232);
  const checks=[];
  try{
   await ready(p,'neowulf');
   const anchors=await p.evaluate(()=>[...document.querySelectorAll('.reference-face button,.reference-face .knob')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.dataset.param,x:r.x,y:r.y,w:r.width,h:r.height};}));
   const noHandler=await p.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>!e.onclick&&!e.onpointerdown&&!(e.closest('form')&&e.value==='cancel')).map(e=>e.id||e.textContent));
   assert.deepEqual(noHandler,[]);
   await click(p,'power');await pause(150);assert.equal(await p.evaluate(()=>neowulf.engine.ctx.state),'running');
   await click(p,'power');await pause(100);assert.equal(await p.evaluate(()=>neowulf.engine.ctx.state),'suspended');
   await click(p,'power');await pause(100);checks.push('power on/off/resume');
   await pad(p,0,true);await pause(80);assert(await p.evaluate(()=>neowulf.engine.graph.voices.size>0));await pad(p,0,false);checks.push('pad audio');
   await click(p,'advanced');assert.equal(await p.evaluate(()=>document.getElementById('advancedPanel').hidden),false);
   await click(p,'back');assert.equal(await p.evaluate(()=>document.getElementById('advancedPanel').hidden),true);checks.push('SEQ/DECK');
   const knobs=await p.evaluate(()=>[...document.querySelectorAll('[data-param]')].map(e=>e.dataset.param));
   for(const key of knobs){
    const a=await p.evaluate(key=>{neowulf.selectPart(0);const part=neowulf.project.parts[0],before=part[key];document.querySelector('[data-param="'+key+'"]').dispatchEvent(new WheelEvent('wheel',{deltaY:120,cancelable:true,bubbles:true}));return{before,after:part[key]};},key);
    assert.notEqual(a.before,a.after,'Knob '+key);
   }checks.push('all '+knobs.length+' knobs');
   const live=await p.evaluate(async()=>{const en=neowulf.engine,part=neowulf.project.parts[0];part.release=.01;window.voice=en.graph.trigger(part,{note:48,velocity:.8,gate:1},en.ctx.currentTime,3);const before=voice.filter.frequency.value;document.querySelector('[data-param="cutoff"]').dispatchEvent(new WheelEvent('wheel',{deltaY:120,cancelable:true}));await new Promise(r=>setTimeout(r,120));return {before,after:voice.filter.frequency.value,expected:part.cutoff};});
   assert(Math.abs(live.after-live.expected)<5&&live.after!==live.before,JSON.stringify(live));checks.push('live cutoff');
   await click(p,'mute');await pause(200);assert.equal(await p.evaluate(()=>[...neowulf.engine.graph.voices].filter(v=>v.part===neowulf.project.parts[0]).length),0);
   assert.equal(await p.evaluate(()=>document.getElementById('faceMute').getAttribute('aria-pressed')),'true');
   await click(p,'faceMute');assert.equal(await p.evaluate(()=>neowulf.project.parts[0].mute),false);checks.push('mute and faceMute release');
   await p.evaluate(async()=>{neowulf.selectPart(1);const en=neowulf.engine,part=neowulf.project.parts[1];part.release=.01;en.graph.trigger(part,{note:48,velocity:.8,gate:1},en.ctx.currentTime,3);neowulf.selectPart(0);});
   await click(p,'solo');await pause(200);assert.equal(await p.evaluate(()=>[...neowulf.engine.graph.voices].filter(v=>v.part===neowulf.project.parts[1]).length),0);await click(p,'solo');checks.push('solo releases excluded voices');
   await input(p,'tempo','20');assert.equal(await p.evaluate(()=>neowulf.project.tempo),20);
   await input(p,'tempo','240');await input(p,'swing','-.5','input');assert.equal(await p.evaluate(()=>neowulf.project.swing),-.5);await input(p,'swing','.5','input');assert.equal(await p.evaluate(()=>neowulf.project.swing),.5);await input(p,'swing','0','input');checks.push('tempo and signed swing');
   await click(p,'clear');assert(await p.evaluate(()=>neowulf.project.patterns[0].events[0].every(e=>!e.on)));
   await p.evaluate(()=>document.querySelector('[data-step="0"]').click());assert(await p.evaluate(()=>neowulf.project.patterns[0].events[0][0].on));
   await input(p,'length',model==='emx'?'128':'64');await input(p,'page','1');
   await p.evaluate(()=>document.querySelector('[data-step="3"]').click());assert(await p.evaluate(()=>neowulf.project.patterns[0].events[0][19].on));
   await p.evaluate(()=>document.querySelector('[data-step="3"]').dispatchEvent(new MouseEvent('click',{shiftKey:true,bubbles:true})));assert(await p.evaluate(()=>document.getElementById('edit').open));
   await input(p,'editNote','0');await input(p,'editVelocity','.25','input');await input(p,'editGate','2','input');await click(p,'editSave');
   assert.equal(await p.evaluate(()=>neowulf.project.patterns[0].events[0][19].note),0);checks.push('steps, length, page and edit');
   await click(p,'copy');await p.evaluate(()=>neowulf.selectPart(1));await click(p,'paste');assert(await p.evaluate(()=>JSON.stringify(neowulf.project.parts[0])===JSON.stringify(neowulf.project.parts[1])&&neowulf.project.patterns[0].events[1][19].note===0));checks.push('full part copy/paste');
   await p.evaluate(()=>neowulf.selectPart(0));await input(p,'length','16');await input(p,'page','0');await click(p,'clear');await click(p,'record');await click(p,'motion');await click(p,'play');await pause(220);
   await pad(p,0,true);await pause(80);
   await p.evaluate(()=>document.querySelector('[data-param="attack"]').dispatchEvent(new WheelEvent('wheel',{deltaY:-120,cancelable:true})));await pad(p,0,false);await click(p,'stop');
   assert(await p.evaluate(()=>neowulf.project.patterns[0].events[0].some(e=>e.on)&&neowulf.project.patterns[0].events[0].some(e=>e.lock?.attack)));
   assert(await p.evaluate(()=>{const copy=neowulf.validateProject(structuredClone(neowulf.project),neowulf.project.model);return copy.patterns[0].events[0].some(e=>e.lock?.attack);}));
   await click(p,'record');await click(p,'motion');checks.push('record and ADSR motion roundtrip');
   await click(p,'keyboard');await input(p,'note','60');
   await pad(p,2,true);await pause(100);await pad(p,2,false);
   assert.equal(await p.evaluate(()=>document.getElementById('keyboard').getAttribute('aria-pressed')),'true');await click(p,'keyboard');
   await p.evaluate(()=>{window.hits=0;const original=neowulf.engine.onTrigger;neowulf.engine.onTrigger=(...a)=>{hits++;original(...a);};});
   await click(p,'arp');await pad(p,0,true);await pause(650);await pad(p,0,false);await click(p,'arp');
   assert(await p.evaluate(()=>hits>=3));checks.push('keyboard and arpeggiator');
   await dialog(p,'rename','CONTROL TEST');assert.equal(await p.evaluate(()=>neowulf.project.patterns[0].name),'CONTROL TEST');
   await dialog(p,'chain','1,2');assert.deepEqual(await p.evaluate(()=>neowulf.project.chain),[0,1]);await dialog(p,'chain','');checks.push('name and song chain');
   await p.evaluate(async()=>{const e=neowulf.engine,b=e.ctx.createBuffer(1,4800,48000);for(let i=0;i<4800;i++)b.getChannelData(0)[i]=Math.sin(i*.13)*.3;const file=new File([encodeWav(b)],'control-sample.wav',{type:'audio/wav'}),dt=new DataTransfer();dt.items.add(file);const el=document.getElementById('sampleFile');el.files=dt.files;el.dispatchEvent(new Event('change'));});
   for(let n=0;n<50&&!await p.evaluate(()=>Boolean(neowulf.project.parts[0].sampleId));n++)await pause(50);
   await click(p,'reverse');await click(p,'loop');await input(p,'sampleStart','.2','input');await input(p,'sampleEnd','.7','input');
   const sample=await p.evaluate(async()=>{const e=neowulf.engine,v=await e.hit(0,48);const a={loop:v.sources[0].loop,start:v.sources[0].loopStart,end:v.sources[0].loopEnd,reverse:neowulf.project.parts[0].reverse};v.release();return a;});
   assert(sample.loop&&sample.reverse);assert(Math.abs(sample.start-.03)<.0001&&Math.abs(sample.end-.08)<.0001,JSON.stringify(sample));checks.push('sample import, reverse selected region and loop');
   const restore=await p.evaluate(async()=>{const original=structuredClone(neowulf.project);const validated=neowulf.validateProject(structuredClone(original),original.model);return validated.patterns[0].events[0].some(e=>e.note===0)||validated.parts[0].note===60;});assert(restore);
   // The actual synthesizer renders a stereo WAV, and zero master produces silence.
   const sound=await p.evaluate(async()=>{const pr=neowulf.project,e=neowulf.engine;pr.parts[0].sampleId=null;pr.parts[0].mute=false;pr.parts[0].solo=true;pr.patterns[0].events[0][0].on=true;pr.patterns[0].events[0][0].lock=null;pr.master=.6;const energy=async()=>{const b=await(await e.renderWav(1)).arrayBuffer(),v=new DataView(b);let sum=0;for(let i=44;i<b.byteLength;i+=2)sum+=v.getInt16(i,true)**2;return{sum,channels:v.getUint16(22,true),rate:v.getUint32(24,true)};};const normal=await energy();pr.master=0;const silent=await energy();pr.master=.55;pr.parts[0].solo=false;return{normal,silent};});
   assert(sound.normal.sum>0&&sound.silent.sum===0);assert.equal(sound.normal.channels,2);assert.equal(sound.normal.rate,48000);checks.push('WAV and master silence');
   const downloads=output+'/downloads-'+model;fs.mkdirSync(downloads,{recursive:true});
   await p.call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
   await p.evaluate(()=>{neowulf.project.parts[0].sampleId=[...neowulf.engine.samples.keys()][0];neowulf.renderAll();});
   await click(p,'save');const projectFile=await downloaded(downloads,'.json'),exported=JSON.parse(fs.readFileSync(projectFile,'utf8'));assert.equal(Object.keys(exported.samples).length,1);
   await p.evaluate(()=>{neowulf.project.patterns[neowulf.project.pattern].name='TEMPORARY';});
   await pickFile(p,'load',projectFile);
   for(let n=0;n<100&&await p.evaluate(()=>neowulf.project.patterns[neowulf.project.pattern].name!=='CONTROL TEST');n++)await pause(30);
   assert.equal(await p.evaluate(()=>neowulf.project.patterns[neowulf.project.pattern].name),'CONTROL TEST');
   const sampleFile=downloads+'/roundtrip.wav';fs.writeFileSync(sampleFile,Buffer.from(Object.values(exported.samples)[0],'base64'));
   for(const button of ['faceSample','sampleImport']){
    await pickFile(p,button,sampleFile);await pause(120);assert.equal(await p.evaluate(()=>neowulf.project.parts[0].name),'roundtrip.wav');
   }
   fs.renameSync(sampleFile,downloads+'/roundtrip.fixture');
   await dialog(p,'wav','1');const wavFile=await downloaded(downloads,'.wav'),wav=fs.readFileSync(wavFile);assert.equal(wav.subarray(0,4).toString(),'RIFF');assert(wav.length>44);
   checks.push('SAVE/LOAD with samples, both sample selectors and WAV button');
   // MIDI wiring is tested with a fake port, never described as a hardware pass.
   await p.evaluate(()=>{window.fakePort={name:'test MIDI'};Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>({inputs:new Map([['test',fakePort]]),onstatechange:null})});document.getElementById('midi').disabled=false;});
   await click(p,'midi');await pause(50);assert(await p.evaluate(()=>typeof fakePort.onmidimessage==='function'));
   await p.evaluate(async()=>{await fakePort.onmidimessage({data:[144,60,100]});await fakePort.onmidimessage({data:[128,60,0]});});await click(p,'midi');assert.equal(await p.evaluate(()=>fakePort.onmidimessage),null);checks.push('MIDI connect/notes/disconnect (simulated)');
   await input(p,'wave','synth:square');assert.equal(await p.evaluate(()=>neowulf.project.parts[0].type),'synth');
   assert.equal(await p.evaluate(()=>neowulf.project.parts[0].wave),'square');
   await p.evaluate(()=>{neowulf.project.parts[0].cutoff=1234;document.querySelector('[data-pattern="1"]').click();});
   await p.evaluate(()=>{neowulf.project.parts[0].cutoff=9876;document.querySelector('[data-pattern="0"]').click();});
   assert.equal(await p.evaluate(()=>neowulf.project.parts[0].cutoff),1234);
   await p.evaluate(()=>{document.querySelector('[data-pattern="1"]').click();});assert.equal(await p.evaluate(()=>neowulf.project.parts[0].cutoff),9876);
   await p.evaluate(()=>{document.querySelector('[data-pattern="0"]').click();});
   await dialog(p,'chain','3,4');await click(p,'play');await pause(80);assert.equal(await p.evaluate(()=>neowulf.project.pattern),2);await click(p,'stop');await dialog(p,'chain','');
   checks.push('sound type, waveform, independent pattern sounds and chain start');
   await input(p,'bank','2');await p.evaluate(()=>document.querySelector('[data-pattern="3"]').click());assert.equal(await p.evaluate(()=>neowulf.project.pattern),19);await pause(350);
   p.events.splice(0,p.events.length);await p.call('Page.reload');for(let n=0;n<100&&!p.events.some(e=>e.method==='Page.loadEventFired');n++)await pause(20);await ready(p,'neowulf');assert.equal(await p.evaluate(()=>neowulf.project.pattern),19);checks.push('bank/pattern persistence');
   assert.deepEqual(p.errors,[]);result.instruments.push({model,checks,knobs,anchors,sound});
   fs.writeFileSync(output+'/control-progress.json',JSON.stringify(result,null,2));
  }finally{await p.close();}
 }
 // Two actual pages must share transport through BroadcastChannel.
 const a=await page(base+'/instrument.html?model=synth&embed=1',744,232),b=await page(base+'/instrument.html?model=emx&embed=1',744,232);
 try{await ready(a,'neowulf');await ready(b,'neowulf');await click(a,'link');await click(b,'link');await click(a,'play');await pause(450);assert(await b.evaluate(()=>neowulf.engine.playing));await click(a,'stop');await pause(100);assert.equal(await b.evaluate(()=>neowulf.engine.playing),false);result.linkTransport=true;}finally{await a.close();await b.close();}
 fs.writeFileSync(output+'/control-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({models:result.instruments.map(x=>({model:x.model,checks:x.checks.length,knobs:x.knobs.length})),linkTransport:result.linkTransport}));
})().catch(e=>{fs.writeFileSync(output+'/control-failure.txt',e.stack);console.error(e);process.exitCode=1;});
