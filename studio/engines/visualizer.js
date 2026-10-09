/* Render at display resolution. Waveforms are acquired, never synthesized for show. */
(()=>{
const q=new URLSearchParams(location.search),mode=q.get('mode')||'fire',canvas=document.getElementById('visual'),ctx=canvas.getContext('2d',{alpha:false}),source=document.getElementById('source');
if(q.get('embed')==='1')document.body.classList.add('embedded');if(mode==='vertical')document.body.classList.add('vertical');
const names={osc:'NEOWULF · OSZILLATOR',fire:'NEOWULF · FIRE VU STEREO',horizontal:'NEOWULF · VU HORIZONTAL',vertical:'NEOWULF · VU VERTIKAL',virtualizer:'NEOWULF · HELLFIRE VIRTUALIZER'};
document.getElementById('title').textContent=names[mode];document.title=names[mode];let variant=0;
document.getElementById('variant').onclick=()=>{variant=(variant+1)%3;document.getElementById('variant').textContent=['MODE 1','MODE 2','MODE 3'][variant];};document.getElementById('crt').onclick=()=>{document.body.classList.toggle('crt');};
let packet={playing:false,left:0,right:0,spectrum:Array(75).fill(0),wave:Array(75).fill(0)},lastPacket=0,left=0,right=0,particles=[];
const spectral=new Float32Array(256),spectralL=new Float32Array(256),spectralR=new Float32Array(256),re=new Float32Array(512),im=new Float32Array(512),clock=new HellfireRenderClock(mode);
const ch=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('neowulf.audio.v1'):null;
function receive(data){
 if(!data||typeof data!=='object')return;
 const clean=a=>Array.isArray(a)||ArrayBuffer.isView(a)?Array.from(a,x=>Number.isFinite(x)?x:0):null;
 const scale=Number.isFinite(data.pcmScale)&&data.pcmScale>0?data.pcmScale:1,a=clean(data.pcmLeft),b=clean(data.pcmRight);
 const pcm=x=>Math.max(-1,Math.min(1,x/scale));
 packet={playing:data.playing!==false,left:Number.isFinite(data.left)?data.left:0,right:Number.isFinite(data.right)?data.right:0,
  spectrum:(clean(data.spectrum)||Array(75).fill(0)).map(x=>Math.max(0,Math.min(16,x))),wave:(clean(data.wave)||Array(75).fill(0)).map(x=>Math.max(-16,Math.min(16,x))),
  pcmLeft:a?.map(pcm),pcmRight:(b||(a?Array(a.length).fill(0):null))?.map(pcm),stereo:Boolean(a&&b),sampleRate:Number.isFinite(data.sampleRate)&&data.sampleRate>0?data.sampleRate:48000};
 lastPacket=performance.now();if(packet.pcmLeft){fftSpectrum(packet.pcmLeft,spectralL);fftSpectrum(packet.pcmRight,spectralR);for(let i=0;i<256;i++)spectral[i]=(spectralL[i]+spectralR[i])*.5;}
}
window.neowulfAudio=receive;window.chrome?.webview?.addEventListener('message',e=>{if(source.value==='winamp')receive(e.data);});ch?.addEventListener('message',e=>{if(source.value==='studio')receive(e.data);});
function fftSpectrum(samples,out){
 const N=512;im.fill(0);
 for(let i=0;i<N;i++)re[i]=(samples[i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));
 for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
 for(let len=2;len<=N;len<<=1){const angle=-2*Math.PI/len;for(let base=0;base<N;base+=len)for(let k=0;k<len/2;k++){const c=Math.cos(angle*k),s=Math.sin(angle*k),u=base+k,v=u+len/2,tr=re[v]*c-im[v]*s,ti=re[v]*s+im[v]*c;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;}}
 for(let i=0;i<256;i++)out[i]=Math.min(1,Math.hypot(re[i],im[i])/36);
}
function gradient(y,h){const g=ctx.createLinearGradient(0,y+h,0,y);g.addColorStop(0,'#fff0b9');g.addColorStop(.12,'#ffc34f');g.addColorStop(.32,'#ff6822');g.addColorStop(.62,'#d62614');g.addColorStop(1,'#440406');return g;}
function interpolate(a,x){const p=x*(a.length-1),i=Math.floor(p),t=p-i;return (a[i]||0)*(1-t)+(a[Math.min(a.length-1,i+1)]||0)*t;}
function db(v){return v>.0001?(20*Math.log10(v)).toFixed(1):'−∞';}
function grid(w,h){ctx.strokeStyle='#5b231522';ctx.lineWidth=1;for(let x=0;x<w;x+=w/10){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=h/6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
function drawOsc(w,h){
 grid(w,h);const a=packet.pcmLeft||packet.wave.map(x=>x/16),b=packet.pcmRight||a;
 ctx.lineWidth=Math.max(1,w/550);ctx.shadowBlur=8;ctx.shadowColor='#ff3e1b';
 if(variant===2&&packet.pcmLeft){ctx.beginPath();ctx.strokeStyle='#ff9662';const n=Math.min(a.length,b.length);for(let i=0;i<n;i++){const x=w/2+a[i]*w*.45,y=h/2-b[i]*h*.45;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}
 else{const rows=variant===1?1:2;for(let row=0;row<rows;row++){const arr=row?b:a,center=rows===1?h/2:h*(row?.74:.26),height=rows===1?h*.4:h*.21;ctx.strokeStyle=row?'#ffb270':'#ff5540';ctx.beginPath();for(let x=0;x<w;x++){const y=center-interpolate(arr,x/w)*height*2;if(x)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}}
 ctx.shadowBlur=0;ctx.fillStyle='#9a5142';ctx.font=`${Math.max(9,h/17)}px Consolas,monospace`;ctx.fillText(packet.pcmLeft?(packet.stereo?(variant===2?'STEREO XY · PCM':'STEREO PCM · L / R'):'PCM · L ONLY'):'WINAMP OSZILLOSKOP · LEGACY MONO',10,18);
}
function drawMeters(w,h,vertical){
 const levels=[left,right];for(let c=0;c<2;c++){
  const strips=vertical?60:70,margin=vertical?w*.16:h*.18,gap=vertical?w*.09:h*.1,barW=vertical?(w-margin*2-gap)/2:w*.87,barH=vertical?h*.81:(h-margin*2-gap)/2;
  const x=vertical?margin+c*(barW+gap):w*.07,y=vertical?h*.06:margin+c*(barH+gap),lit=Math.round(Math.sqrt(levels[c])*strips);
  for(let i=0;i<strips;i++){
   const t=i/(strips-1),xx=vertical?x:x+t*barW,yy=vertical?y+barH-(i+1)*barH/strips:y,ww=vertical?barW:barW/strips*.69,hh=vertical?barH/strips*.58:barH;
   ctx.fillStyle=i<lit?`hsl(${40-t*39} ${96-t*14}% ${76-t*58}%)`:'#28110f';if(i<lit){ctx.shadowBlur=5;ctx.shadowColor='#ff4021';}ctx.fillRect(xx,yy,ww,hh);ctx.shadowBlur=0;
  }
  ctx.fillStyle='#d24b39';ctx.font=`${Math.max(9,Math.min(w,h)/18)}px Consolas,monospace`;ctx.fillText(c?'R':'L',vertical?x+barW*.42:w*.018,vertical?y+barH+18:y+barH*.6);
 }
}
function drawFire(w,h,now){
 const rows=w/h>3,levels=[left,right];for(let c=0;c<2;c++){
  const ox=rows?w*.055:w*(c?.54:.07),width=w*(rows?.93:.39),height=h*(rows?.36:.9),base=h*(rows?(c?.96:.48):.95),energy=Math.sqrt(levels[c]);
  const g=gradient(base-height,height);ctx.fillStyle=g;ctx.shadowColor='#f53213';ctx.shadowBlur=12;
  ctx.beginPath();ctx.moveTo(ox,base);
  for(let i=0;i<=100;i++){const t=i/100,x=ox+t*width,edge=Math.sin(Math.PI*t)**.45,ripple=.10*Math.sin(i*.43+now*.009)+.05*Math.sin(i*.94-now*.006),freq=packet.pcmLeft?interpolate(c?spectralR:spectralL,t):interpolate(packet.spectrum,t)/16;const y=base-height*energy*edge*Math.max(.05,.72+ripple+freq*.25);ctx.lineTo(x,y);}ctx.lineTo(ox+width,base);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  const strips=28;for(let i=0;i<strips;i++){const x=ox+i*width/strips,top=base-energy*height*(.32+.4*Math.sin(Math.PI*i/strips));ctx.globalAlpha=.22;ctx.fillStyle='#ffd88b';ctx.fillRect(x,top,width/strips*.18,base-top);ctx.globalAlpha=1;}
  ctx.fillStyle='#b04733';ctx.font=`${Math.max(9,Math.min(12,h/20))}px Consolas,monospace`;ctx.fillText(c?'R':'L',rows?3:ox+width*.39,rows?base-height*.35:18);
  if(energy>.08&&particles.length<220){for(let i=0;i<Math.ceil(energy*3);i++)particles.push({x:ox+Math.random()*width,y:base-energy*height*.6,vy:20+Math.random()*60,life:.4+Math.random()*.8});}
 }
}
function drawVirtual(w,h,now){
 const bands=96,g=gradient(0,h),energy=(left+right)/2;ctx.fillStyle=g;ctx.shadowColor='#ff3e17';ctx.shadowBlur=5;
 if(variant===1){const cx=w/2,cy=h/2,r=Math.min(w,h)*.27;for(let i=0;i<bands;i++){const t=i/bands,a=t*Math.PI*2,v=packet.pcmLeft?interpolate(spectral,t):interpolate(packet.spectrum,t)/16;ctx.lineWidth=Math.max(1,w/300);ctx.strokeStyle=`hsl(${40-t*40},95%,${55-v*25}%)`;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.lineTo(cx+Math.cos(a)*(r+v*h*.26),cy+Math.sin(a)*(r+v*h*.26));ctx.stroke();}}
 else for(let i=0;i<bands;i++){const t=i/bands,v=packet.pcmLeft?interpolate(spectral,t):interpolate(packet.spectrum,t)/16,height=Math.min(h*.95,Math.pow(Math.max(0,v),.65)*h*.92),x=t*w;ctx.fillRect(x,h-height,w/bands*.62,height);if(variant===2){ctx.globalAlpha=.2;ctx.fillRect(x,0,w/bands*.62,height);ctx.globalAlpha=1;}}
 ctx.shadowBlur=0;ctx.fillStyle='#9c4634';ctx.font=`${Math.max(9,h/20)}px Consolas,monospace`;ctx.fillText(packet.pcmLeft?'FFT · 512 PCM SAMPLES':'WINAMP · 75 FREQUENZBÄNDER',10,18);
}
let previous=performance.now();function draw(now){
 requestAnimationFrame(draw);if(!clock.due(now))return;const started=performance.now();
 const delta=Math.min(.1,(now-previous)/1000);previous=now;const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const fresh=packet.playing&&now-lastPacket<600,tl=fresh?Math.max(0,Math.min(1,packet.left/255)):0,tr=fresh?Math.max(0,Math.min(1,packet.right/255)):0;
 left+=(tl-left)*(1-Math.exp(-delta/(tl>left?.025:.24)));right+=(tr-right)*(1-Math.exp(-delta/(tr>right?.025:.24)));
 if(!fresh){packet.wave.fill(0);packet.spectrum.fill(0);packet.pcmLeft=null;packet.pcmRight=null;spectral.fill(0);spectralL.fill(0);spectralR.fill(0);}ctx.fillStyle='#010102';ctx.fillRect(0,0,w,h);
 if(mode==='osc')drawOsc(w,h);else if(mode==='horizontal')drawMeters(w,h,false);else if(mode==='vertical')drawMeters(w,h,true);else if(mode==='virtualizer')drawVirtual(w,h,now);else drawFire(w,h,now);
 particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=delta;p.y-=p.vy*delta;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle='#ffc478';ctx.fillRect(p.x,p.y,1.5*dpr,2*dpr);}ctx.globalAlpha=1;
 document.getElementById('meter').textContent=`L ${db(left)} dB · R ${db(right)} dB`;clock.record(now,performance.now()-started);
}requestAnimationFrame(draw);window.neowulfVisualizer={receive,get packet(){return packet;},get stats(){return clock.stats;},get levels(){return {left,right};},get spectra(){return {left:Array.from(spectralL),right:Array.from(spectralR)};}};
})();
