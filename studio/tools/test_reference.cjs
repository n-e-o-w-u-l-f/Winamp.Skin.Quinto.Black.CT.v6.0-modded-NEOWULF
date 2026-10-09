// Real Edge/CDP tests for the embedded geometry, sound, controls and paint cadence.
const fs=require('fs'), assert=require('assert');
const output=process.argv[2], base=process.argv[3], debug=process.argv[4]||'http://127.0.0.1:9225';
if(!output||!base)throw Error('Usage: node test_reference.cjs OUTPUT BASE_URL [CDP_URL]');
fs.mkdirSync(output,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function page(url,width,height){
 const info=await(await fetch(debug+'/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();
 const ws=new WebSocket(info.webSocketDebuggerUrl),pending=new Map(),errors=[];let id=0;
 await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.no(Error(JSON.stringify(m.error))):p.ok(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
 const call=(method,params={})=>new Promise((ok,no)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);no(Error('CDP timeout '+method));},12000);pending.set(n,{ok,no,timer});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async(fn,...args)=>{const expression='('+fn.toString()+')('+args.map(x=>JSON.stringify(x)).join(',')+')',r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Runtime.enable');await call('Page.enable');await call('Page.bringToFront');
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
 const shot=async(name)=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(output+'/'+name+'.png',Buffer.from(r.data,'base64'));};
 const close=async()=>{for(const p of pending.values())clearTimeout(p.timer);ws.close();await fetch(debug+'/json/close/'+info.id);};
 return {call,evaluate,shot,close,errors};
}
async function ready(p,key){for(let i=0;i<60;i++){if(await p.evaluate(k=>Boolean(window[k]),key))return;await pause(100);}throw Error('UI failed to start '+key);}
(async()=>{
 const result={observedUtc:new Date().toISOString(),environment:'BMAX Edge headless; embedded-size DPR2, not native Winamp paint proof',instruments:[],visualizers:[]};
 for(const model of ['synth','sampler','emx']){
  const p=await page(base+'/instrument.html?model='+model+'&embed=1',635,198);
  try{
   await ready(p,'neowulf');assert.equal(await p.evaluate(()=>document.querySelectorAll('[data-pad]').length),model==='emx'?14:16);
   await p.evaluate(async()=>{await neowulf.engine.enable();document.getElementById('play').click();});await pause(2200);
   assert(await p.evaluate(()=>neowulf.engine.playing));
   const stats=await p.evaluate(()=>neowulf.renderStats);assert(stats.measuredSpanMs>=1800);assert(stats.measuredFps>=20&&stats.measuredFps<=33,JSON.stringify(stats));
   const control=await p.evaluate(()=>{const e=document.querySelector('[data-param="cutoff"]'),before=neowulf.project.parts[0].cutoff;e.dispatchEvent(new WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true}));return {before,after:neowulf.project.parts[0].cutoff};});assert.notEqual(control.after,control.before);
   await p.shot('reference-'+model);await p.evaluate(()=>document.getElementById('stop').click());assert.equal(await p.evaluate(()=>neowulf.engine.playing),false);
   const audio=await p.evaluate(async()=>{const bytes=await(await neowulf.engine.renderWav(1)).arrayBuffer(),v=new DataView(bytes);let energy=0,peak=0;for(let i=44;i<bytes.byteLength;i+=2){const x=v.getInt16(i,true)/32768;energy+=x*x;peak=Math.max(peak,Math.abs(x));}return {bytes:bytes.byteLength,energy,peak,sampleRate:v.getUint32(24,true),state:neowulf.engine.ctx.state};});assert(audio.energy>1&&audio.peak>0&&audio.peak<1);assert.equal(audio.sampleRate,48000);assert.equal(audio.state,'running');
   const sample=await p.evaluate(async()=>{const e=neowulf.engine,part=neowulf.project.parts[0],b=e.ctx.createBuffer(1,4800,48000),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.sin(i*.13)*.3;await e.loadSample(encodeWav(b),'test-sine');part.sampleId='test-sine';part.start=.1;part.end=.9;part.reverse=true;part.loop=true;const voice=await e.hit(0,55),loop=voice.sources[0].loop;voice.release();const decoded=e.sampleFor(part).length;part.sampleId=null;const step=neowulf.project.patterns[neowulf.project.pattern].events[0][3],before=step.on;document.querySelector('[data-step="3"]').click();const changed=step.on!==before;const length=document.getElementById('length');length.value=neowulf.project.model==='emx'?'128':'64';length.dispatchEvent(new Event('change'));return {loop,decoded,changed,steps:neowulf.project.patterns[neowulf.project.pattern].length};});assert(sample.loop&&sample.changed);assert.equal(sample.decoded,4800);assert.equal(sample.steps,model==='emx'?128:64);
   await p.evaluate(()=>{const b=document.getElementById('bank');b.value='3';b.dispatchEvent(new Event('change'));document.querySelector('[data-pattern="2"]').click();});await pause(350);await p.call('Page.reload');await pause(300);await ready(p,'neowulf');assert.equal(await p.evaluate(()=>neowulf.project.pattern),26);
   assert.deepEqual(p.errors,[]);result.instruments.push({model,stats,control,audio,sample,storage:true});
  }finally{await p.close();}
 }
 for(const mode of ['osc','fire','horizontal','vertical','virtualizer']){
  const p=await page(base+'/visualizer.html?mode='+mode+'&embed=1',mode==='vertical'?142:547,mode==='vertical'?251:87);
  try{
   await ready(p,'neowulfVisualizer');await p.evaluate(()=>{const left=Array.from({length:512},(_,i)=>Math.sin(i*.17)*.6),right=Array(512).fill(0);window.testStream=setInterval(()=>neowulfAudio({playing:true,left:200,right:0,pcmLeft:left,pcmRight:right,sampleRate:48000}),30);});await pause(2400);
   const stats=await p.evaluate(()=>neowulfVisualizer.stats),levels=await p.evaluate(()=>neowulfVisualizer.levels),spectra=await p.evaluate(()=>({left:Math.max(...neowulfVisualizer.spectra.left),right:Math.max(...neowulfVisualizer.spectra.right)}));assert(stats.measuredFps>=20&&stats.measuredFps<=33,JSON.stringify(stats));assert(levels.left>.7&&levels.right===0);assert(spectra.left>.1&&spectra.right===0);await p.shot('reference-'+mode);
   await p.evaluate(()=>{clearInterval(window.testStream);neowulfAudio({playing:false,left:200,right:200});});await pause(1300);const silent=await p.evaluate(()=>neowulfVisualizer.levels);assert(silent.left<.01&&silent.right<.01);
   // Missing PCM, typed PCM and a scaled one-sided packet must also remain valid.
   await p.evaluate(()=>{neowulfAudio({playing:true,left:15});neowulfAudio({playing:true,left:32,right:0,pcmLeft:new Float32Array(512),pcmScale:32768});});await pause(100);assert.deepEqual(p.errors,[]);result.visualizers.push({mode,stats,levels,spectra,silent});
  }finally{await p.close();}
 }
 fs.writeFileSync(output+'/reference-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{fs.writeFileSync(output+'/reference-failure.txt',e.stack);console.error(e);process.exitCode=1;});
