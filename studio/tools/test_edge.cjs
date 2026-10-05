// Uses an installed Edge through CDP; no browser download or external JS needed.
const fs=require('fs'),assert=require('assert');
const root=process.argv[2]||'output',base=process.argv[3]||'http://127.0.0.1:8704';
fs.mkdirSync(root,{recursive:true});
async function attach(url){
 const info=await (await fetch('http://127.0.0.1:9225/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();
 const socket=new WebSocket(info.webSocketDebuggerUrl),pending=new Map();let id=0,errors=[];
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''));};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
 await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1100,height:720,deviceScaleFactor:1,mobile:false});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result.value;};
 const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(root+'/'+name+'.png',Buffer.from(r.data,'base64'));};
 return {call,evaluate,errors,shot,close:async()=>{socket.close();await fetch('http://127.0.0.1:9225/json/close/'+info.id);}};
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const findings=[];
 for(const model of ['synth','sampler','emx']){
  const p=await attach(base+'/instrument.html?model='+model);let ready=false;
  for(let i=0;i<50;i++){if(await p.evaluate('Boolean(window.neowulf)')){ready=true;break;}await pause(100);}assert(ready,'UI boot');
  await p.evaluate('localStorage.clear()');
  assert.equal(await p.evaluate('document.querySelectorAll("[data-pad]").length'),model==='emx'?14:16);
  const state=await p.evaluate('(async()=>{await neowulf.engine.enable();await neowulf.engine.hit(0);return {audio:neowulf.engine.ctx.state,rate:neowulf.engine.ctx.sampleRate};})()');assert.equal(state.audio,'running');
  await p.evaluate('document.getElementById("play").click()');await pause(350);assert(await p.evaluate('neowulf.engine.playing'));await p.evaluate('document.getElementById("stop").click()');assert.equal(await p.evaluate('neowulf.engine.playing'),false);
  const audio=await p.evaluate('(async()=>{const bytes=await(await neowulf.engine.renderWav(1)).arrayBuffer(),v=new DataView(bytes);let energy=0,peak=0;for(let i=44;i<bytes.byteLength;i+=2){const x=v.getInt16(i,true)/32768;energy+=x*x;peak=Math.max(peak,Math.abs(x));}return {bytes:bytes.byteLength,energy,peak,rate:v.getUint32(24,true)};})()');assert(audio.energy>1);assert(audio.peak<1);assert.equal(audio.rate,48000);
  // Test real filter effect, PCM sample decoding, motion, sequencing and storage.
  const checks=await p.evaluate('(async()=>{const e=neowulf.engine,p=neowulf.project;const s=e.ctx.createBuffer(1,4800,48000),d=s.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.sin(i*0.13)*0.3;const wav=encodeWav(s);await e.loadSample(wav,"test-sine");const part=p.parts[0];part.sampleId="test-sine";part.start=.1;part.end=.9;part.reverse=true;part.loop=true;const voice=await e.hit(0,55);if(!voice.sources[0].loop)throw Error("Sample loop failed");voice.release();part.sampleId=null;const st=p.patterns[p.pattern].events[0][3],before=st.on;document.querySelector("[data-step=\\\"3\\\"]").click();if(st.on===before)throw Error("Step edit failed");const el=document.getElementById("length");el.value=p.model==="emx"?"128":"64";el.dispatchEvent(new Event("change"));return {sampleDecode:true,sampleReverse:e.sampleFor({...part,sampleId:"test-sine"}).length===4800,steps:p.patterns[p.pattern].length};})()');
  assert.equal(checks.steps,model==='emx'?128:64);assert(checks.sampleReverse);
  await p.shot('NEOWULF-'+model+'-Deck');await p.evaluate('document.getElementById("bank").value="3";document.getElementById("bank").dispatchEvent(new Event("change"));document.querySelector("[data-pattern=\\\"2\\\"]").click()');await pause(350);assert.equal(await p.evaluate('neowulf.project.pattern'),26);
  await p.call('Page.reload');await pause(600);assert.equal(await p.evaluate('neowulf.project.pattern'),26);assert.deepEqual(p.errors,[]);findings.push({model,...state,...audio,...checks,storage:true});await p.close();
 }
 for(const mode of ['osc','fire','horizontal','vertical','virtualizer']){
  const p=await attach(base+'/visualizer.html?mode='+mode);await pause(400);
  await p.evaluate('window.neowulfAudio({playing:true,left:135,right:90,pcmLeft:Array.from({length:512},(_,i)=>Math.sin(i*.17)*.35),pcmRight:Array.from({length:512},(_,i)=>Math.sin(i*.23)*.25),sampleRate:48000})');await pause(220);await p.shot('NEOWULF-'+mode+'-Deck');assert.deepEqual(p.errors,[]);findings.push({mode,renderer:true,source:'known test PCM'});await p.close();
 }
 fs.writeFileSync(root+'/instrument-verification.json',JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
