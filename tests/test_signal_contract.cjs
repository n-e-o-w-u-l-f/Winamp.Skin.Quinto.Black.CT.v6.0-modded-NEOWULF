// Deterministic renderer/audio-data contracts. This is not browser/native FPS proof.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const results={environment:'Node VM, controlled time, canvas command validation; no browser/audio-device or native Winamp proof',models:[],renderers:[]};
const context=vm.createContext({console,Blob});
const source=read('studio/engines/instrument-app.js').split('const query=new URLSearchParams')[0];
vm.runInContext(source+';globalThis.api={newProject,validateProject};',context);
for(const [model,parts,max] of [['synth',16,64],['sampler',16,64],['emx',14,128]]){
 const p=context.api.newProject(model);assert.equal(p.parts.length,parts);assert(p.patterns[0].events.some(row=>row.some(e=>e.on)));
 p.patterns[0].length=1000;p.parts[0].cutoff=Infinity;p.parts[0].pan=-500;
 const fixed=context.api.validateProject(p,model);assert.equal(fixed.patterns[0].length,max);assert.equal(fixed.parts[0].cutoff,6000);assert.equal(fixed.parts[0].pan,-1);
 assert.throws(()=>context.api.validateProject(p,model==='emx'?'synth':'emx'),/another instrument/);
 results.models.push({model,parts,maxSteps:max,validation:true});
}
for(const mode of ['osc','fire','horizontal','vertical','virtualizer']){
 let now=0,frame,commands=0;const gradients=[];
 const canvas={clientWidth:mode==='vertical'?142:547,clientHeight:mode==='vertical'?251:87,width:0,height:0};
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop:(offset,color)=>gradients.push({offset,color})})},{get:(o,k)=>k in o?o[k]:(...args)=>{commands++;for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),'Non-finite canvas coordinate '+String(k));}});
 canvas.getContext=()=>ctx;const sourceNode={value:'winamp',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
 const nativeListeners={},studioListeners={};
 const nodes={visual:canvas,source:sourceNode,title:{},variant:{},crt:{},meter:{}};
 const document={hidden:false,title:'',body:{classList:{add(){},toggle(){}}},getElementById:id=>nodes[id],querySelector:()=>canvas};
 const c=vm.createContext({document,location:{search:'?mode='+mode+'&embed=1'},URLSearchParams,performance:{now:()=>now},devicePixelRatio:2,requestAnimationFrame:f=>frame=f,console,
  chrome:{webview:{addEventListener:(name,fn)=>nativeListeners[name]=fn}},
  BroadcastChannel:class{addEventListener(name,fn){studioListeners[name]=fn;}}});
 vm.runInContext('Math.random=(()=>{let s=0x4846;return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);})();',c);
 c.window=c;vm.runInContext(read('studio/engines/render-clock.js'),c);vm.runInContext(read('studio/engines/visualizer.js'),c);
 const v=c.neowulfVisualizer,left=Array.from({length:512},(_,i)=>Math.sin(i*.17)*.6),right=Array(512).fill(0);
 function run(ms,packet){const end=now+ms;while(now<end){now+=1000/60;if(packet)v.receive(packet);frame(now);}}
 run(2400,{playing:true,left:200,right:0,pcmLeft:left,pcmRight:right});
 assert(v.levels.left>.78&&v.levels.right===0);assert(Math.max(...v.spectra.left)>.1);assert.equal(Math.max(...v.spectra.right),0);
 const simulatedFps=v.stats.measuredFps;assert(simulatedFps>29&&simulatedFps<31);
 v.receive({playing:true,left:200,right:0,pcmLeft:new Float32Array(left)});assert.equal(v.packet.stereo,false);assert.equal(Math.max(...v.spectra.right),0,'Missing R must never duplicate L');
 v.receive({playing:true,pcmLeft:left});assert(v.packet.left>100,'PCM-only left signal must drive the VU meter');assert.equal(v.packet.right,0);
 v.receive({playing:true,pcmRight:left});assert(v.packet.right>100,'PCM-only right signal must drive the VU meter');assert.equal(v.packet.left,0);
 v.receive({playing:true,left:17,right:0,pcmLeft:left});assert.equal(v.packet.left,17,'Explicit valid meter level has priority over derived RMS');
 v.receive({playing:true,pcmLeft:Array(512).fill(0)});assert.equal(v.packet.left,0,'Silent PCM must not generate meter energy');
 v.receive({playing:true,left:200,right:230,pcmLeft:left});assert.equal(v.packet.right,0,'Missing R PCM must silence its level');assert.equal(v.packet.pcmChannels,'left');assert.equal(Math.max(...v.spectra.right),0);
 v.receive({playing:true,left:230,right:200,pcmRight:left});assert.equal(v.packet.left,0,'Missing L PCM must silence its level');assert.equal(v.packet.pcmChannels,'right');assert(Math.max(...v.spectra.right)>.1);assert.equal(Math.max(...v.spectra.left),0);
 v.receive({playing:true,left:200,right:230,pcmLeft:left,pcmRight:[]});assert.equal(v.packet.right,0,'Empty R PCM must silence its level');
 v.receive({playing:true,left:200,right:230,spectrum:[8]});assert.equal(Math.max(...v.spectra.right),0,'Legacy packet clears stale PCM spectra');assert.equal(Math.max(...v.spectra.left),0);
 v.receive({playing:true,left:200,right:230,pcmLeft:Array(9000).fill(.3),spectrum:Array(800).fill(4),wave:Array(800).fill(-5)});assert.equal(v.packet.pcmLeft.length,8192);assert.equal(v.packet.spectrum.length,75);assert.equal(v.packet.wave.length,75);assert.equal(v.packet.right,0);
 v.receive({playing:false,left:255,right:255});run(1300);assert(v.levels.left<.01&&v.levels.right<.01);assert.equal(Math.max(...v.spectra.left),0);
 run(800,{playing:true,left:200,right:0,pcmLeft:left,pcmRight:right});run(1900);assert(v.levels.left<.01,'Stale audio must fade');
 v.receive({playing:true,left:-40,right:Infinity,pcmLeft:new Float32Array([NaN,Infinity,1]),pcmScale:32768});run(100);assert(v.levels.left>=0&&v.levels.right===0);
 v.receive({playing:true,left:255,right:0,pcmLeft:[Number.MAX_VALUE,-Number.MAX_VALUE],pcmScale:Number.MIN_VALUE});run(100);assert.deepEqual(Array.from(v.packet.pcmLeft),[1,-1]);
 v.receive({playing:true,left:255,right:0,wave:[Number.MAX_VALUE,-Number.MAX_VALUE],spectrum:[Number.MAX_VALUE,-100]});run(100);assert.deepEqual(Array.from(v.packet.wave),[16,-16]);assert.deepEqual(Array.from(v.packet.spectrum),[16,0]);
 const accepted=v.transport.accepted;v.receive(null);assert.equal(v.transport.rejected,1);assert.equal(v.transport.accepted,accepted);
 nativeListeners.message({data:{playing:true,left:205,right:0,pcmLeft:left}});assert.equal(v.transport.lastOrigin,'winamp');assert.equal(v.transport.bySource.winamp,1);
 const dropped=v.transport.ignored;studioListeners.message({data:{playing:true,left:50,right:50}});assert.equal(v.transport.ignored,dropped+1,'Studio packets are ignored in Winamp mode');
 sourceNode.value='studio';sourceNode.handlers.change();assert.equal(v.transport.lastPacketAgeMs,null);assert.equal(v.levels.left,0);assert.equal(v.levels.right,0);assert.equal(Math.max(...v.spectra.left),0);
 const nativeIgnored=v.transport.ignored;nativeListeners.message({data:{playing:true,left:55,right:55}});assert.equal(v.transport.ignored,nativeIgnored+1,'Native packets are ignored in Studio mode');
 studioListeners.message({data:{playing:true,left:80,right:0,pcmLeft:left}});assert.equal(v.transport.lastOrigin,'studio');assert.equal(v.transport.bySource.studio,1);
 sourceNode.value='winamp';sourceNode.handlers.change();
 const before=v.stats.frames;document.hidden=true;run(1000);assert.equal(v.stats.frames,before);document.hidden=false;run(200);assert(v.stats.frames>before);
 if(['fire','virtualizer'].includes(mode)){assert(gradients.some(x=>x.offset===0&&x.color==='#fff0b9'));assert(gradients.some(x=>x.offset===1&&x.color==='#440406'));}
 assert(commands>0);results.renderers.push({mode,commands,simulatedCadenceFps:simulatedFps,stereoSeparation:true,missingChannelSilence:true,stopAndStaleFade:true,finiteCoordinates:true,extremeInputClamped:true,hiddenPaintPaused:true,sourceRouting:true,transportDiagnostics:true});
}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
