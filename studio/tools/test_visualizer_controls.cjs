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


(async()=>{
 const result={environment:'Chrome headless on Legion; DPR 2; synthetic stereo validation signal, not Winamp PCM',modes:[]};
 for(const mode of ['osc','fire','horizontal','vertical','virtualizer']){
  const p=await page(base+'/visualizer.html?mode='+mode+'&embed=1',744,232);
  try{
   await ready(p,'neowulfVisualizer');
   await p.evaluate(()=>{const l=Array.from({length:512},(_,i)=>Math.sin(i*.17)*.6),r=Array.from({length:512},(_,i)=>Math.sin(i*.043)*.3);window.signal=setInterval(()=>neowulfAudio({playing:true,left:180,right:100,pcmLeft:l,pcmRight:r,sampleRate:48000}),30);});
   await pause(600);await p.evaluate(()=>neowulfVisualizer.resetRenderMeasurements());await pause(2000);
   const stats=await p.evaluate(()=>neowulfVisualizer.stats),hashes=[],states=[];
   assert(stats.measuredFps>20,JSON.stringify(stats));
   for(let i=0;i<3;i++){
    await pause(100);hashes.push(await p.evaluate(()=>{const c=document.getElementById('visual'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=0;for(let i=0;i<d.length;i++)hash=(Math.imul(hash,31)+d[i])|0;return hash;}));
    states.push(await p.evaluate(()=>neowulfVisualizer.mode));await p.shot(mode+'-'+i);
    await p.evaluate(()=>document.getElementById('variant').click());
   }
   assert.equal(new Set(hashes).size,3,'MODE must visibly change '+mode);
   await p.evaluate(()=>document.getElementById('crt').click());assert.equal(await p.evaluate(()=>document.getElementById('crt').getAttribute('aria-pressed')),'true');
   await p.evaluate(()=>{clearInterval(signal);const e=document.getElementById('source');e.value='studio';e.dispatchEvent(new Event('change'));});
   assert.deepEqual(await p.evaluate(()=>neowulfVisualizer.levels),{left:0,right:0});
   assert.equal(await p.evaluate(()=>Math.max(...neowulfVisualizer.spectra.left,...neowulfVisualizer.spectra.right)),0);
   await pause(300);assert.deepEqual(p.errors,[]);
   result.modes.push({mode,stats,hashes,states,sourceReset:true,crt:true});
  }finally{await p.close();}
 }
 fs.writeFileSync(output+'/visual-controls.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result.modes.map(x=>({mode:x.mode,fps:x.stats.measuredFps,states:x.states}))));
})().catch(e=>{fs.writeFileSync(output+'/visual-control-failure.txt',e.stack);console.error(e);process.exitCode=1;});
