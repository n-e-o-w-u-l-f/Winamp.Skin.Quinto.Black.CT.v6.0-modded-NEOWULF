/* NEOWULF original instrument engine. No Korg firmware or factory PCM is used. */
export const MODELS = {
  synth: {title:'Electribe 2 · Synth', parts:16, synths:7, maxSteps:64, accent:'#ff342c'},
  sampler: {title:'Electribe 2 · Sampler', parts:16, synths:0, maxSteps:64, accent:'#d63830'},
  emx: {title:'EMX-1', parts:14, synths:5, maxSteps:128, accent:'#ea3830'}
};
export const WAVES=['sawtooth','square','triangle','sine','fm','noise'];
const DRUMS=['KICK','SNARE','CLOSED HAT','OPEN HAT','CLAP','LOW TOM','RIM','CRASH','PERC'];
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const hz=n=>440*Math.pow(2,(n-69)/12);
export function blankPattern(parts,length=16){
  return {name:'INIT',length,events:Array.from({length:parts},()=>Array.from({length:128},()=>({on:false,note:48,velocity:.8,gate:.72,lock:null})))};
}
export function newProject(model){
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
export function validateProject(value,model){
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
export class AudioGraph {
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
export class Instrument {
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
export function encodeWav(buf){
  const n=buf.length,c=buf.numberOfChannels,rate=buf.sampleRate,bytes=new ArrayBuffer(44+n*c*2),v=new DataView(bytes);
  const text=(o,t)=>[...t].forEach((x,i)=>v.setUint8(o+i,x.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,36+n*c*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,c,true);v.setUint32(24,rate,true);v.setUint32(28,rate*c*2,true);v.setUint16(32,c*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*c*2,true);
  const channels=Array.from({length:c},(_,i)=>buf.getChannelData(i));let o=44;
  for(let i=0;i<n;i++)for(let k=0;k<c;k++){v.setInt16(o,Math.round(clamp(channels[k][i],-1,1)*32767),true);o+=2;}
  return new Blob([bytes],{type:'audio/wav'});
}
