/* Render at display resolution. Waveforms are acquired, never synthesized for show. */
(()=>{
const q=new URLSearchParams(location.search),mode=q.get('mode')||'fire',canvas=document.getElementById('visual'),ctx=canvas.getContext('2d',{alpha:false}),source=document.getElementById('source');
if(q.get('embed')==='1')document.body.classList.add('embedded');if(mode==='vertical')document.body.classList.add('vertical');
const names={osc:'NEOWULF · OSZILLATOR',fire:'NEOWULF · FIRE VU STEREO',horizontal:'NEOWULF · VU HORIZONTAL',vertical:'NEOWULF · VU VERTIKAL',virtualizer:'NEOWULF · HELLFIRE VIRTUALIZER'};
document.getElementById('title').textContent=names[mode];document.title=names[mode];let variant=0;
const modeNames={osc:['STEREO','MONO L','XY'],fire:['FLAME','FLOW','EMBERS'],horizontal:['SEGMENTS','CONTINUOUS','PEAK HOLD'],vertical:['SEGMENTS','CONTINUOUS','PEAK HOLD'],virtualizer:['SPECTRUM','RADIAL','MIRROR']};
function modeLabel(){document.getElementById('variant').textContent=(modeNames[mode]||modeNames.fire)[variant];}
modeLabel();document.getElementById('variant').onclick=()=>{variant=(variant+1)%3;modeLabel();};document.getElementById('crt').onclick=()=>{const on=document.body.classList.toggle('crt');document.getElementById('crt').setAttribute('aria-pressed',String(on));};
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
source.onchange=()=>{receive({playing:false});left=0;right=0;particles=[];spectral.fill(0);spectralL.fill(0);spectralR.fill(0);meterPeaks.fill(0);};
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
const meterPeaks=[0,0],peakUntil=[0,0];
function drawMeters(w,h,vertical){
 const levels=[left,right],now=performance.now();for(let c=0;c<2;c++){
  const value=Math.sqrt(levels[c]);
  if(value>=meterPeaks[c]){meterPeaks[c]=value;peakUntil[c]=now+650;}
  else if(now>peakUntil[c])meterPeaks[c]=Math.max(value,meterPeaks[c]-.015);
  const strips=vertical?60:70,margin=vertical?w*.16:h*.18,gap=vertical?w*.09:h*.1,barW=vertical?(w-margin*2-gap)/2:w*.87,barH=vertical?h*.81:(h-margin*2-gap)/2;
  const x=vertical?margin+c*(barW+gap):w*.07,y=vertical?h*.06:margin+c*(barH+gap),lit=Math.round(value*strips);
  if(variant===1){
   ctx.fillStyle='#28110f';ctx.fillRect(x,y,barW,barH);
   const g=vertical?ctx.createLinearGradient(x,y+barH,x,y):ctx.createLinearGradient(x,y,x+barW,y);
   for(const [at,color] of [[0,'#fff0b9'],[.25,'#ffae39'],[.65,'#ef411d'],[1,'#641008']])g.addColorStop(at,color);
   ctx.fillStyle=g;ctx.fillRect(x,vertical?y+barH*(1-value):y,vertical?barW:barW*value,vertical?barH*value:barH);
  }else for(let i=0;i<strips;i++){
   const t=i/(strips-1),xx=vertical?x:x+t*barW,yy=vertical?y+barH-(i+1)*barH/strips:y,ww=vertical?barW:barW/strips*.69,hh=vertical?barH/strips*.58:barH;
   ctx.fillStyle=i<lit?'hsl('+(40-t*39)+' '+(96-t*14)+'% '+(76-t*58)+'%)':'#28110f';
   if(i<lit){ctx.shadowBlur=5;ctx.shadowColor='#ff4021';}ctx.fillRect(xx,yy,ww,hh);ctx.shadowBlur=0;
  }
  if(variant===2&&meterPeaks[c]>.003){ctx.fillStyle='#fff0bd';const peak=meterPeaks[c];ctx.fillRect(vertical?x:x+barW*peak,vertical?y+barH*(1-peak):y,vertical?barW:Math.max(2,w/500),vertical?Math.max(2,h/180):barH);}
  ctx.fillStyle='#d24b39';ctx.font=Math.max(9,Math.min(w,h)/18)+'px Consolas,monospace';ctx.fillText(c?'R':'L',vertical?x+barW*.42:w*.018,vertical?y+barH+18:y+barH*.6);
 }
}

let flameRenderer,flameBackend='uninitialized';
function createFlameRenderer(){
 if(q.get('renderer')==='canvas')return null;
 try{
  const surface=document.createElement('canvas'),gl=surface.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});
  if(!gl)return null;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
  const fragment=compile(gl.FRAGMENT_SHADER,`
precision highp float;
uniform vec2 resolution,levels;
uniform float time,style;
uniform sampler2D bands;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p+7.1;a*=.5;}return n;}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 float channel=step(.5,uv.x),x=fract(uv.x*2.),y=uv.y;
 float energy=sqrt(max(0.,mix(levels.x,levels.y,channel)));
 vec3 black=vec3(.004,.004,.008);
 if(energy<.002){gl_FragColor=vec4(black,1.);return;}
 float band=texture2D(bands,vec2(x,.25+channel*.5)).r;
 float t=time+channel*11.7;
 float warp=fbm(vec2(x*4.,y*3.-t*.6));
 float n=fbm(vec2(x*(12.+style*2.)+(warp-.5)*4.,y*2.8-t*(1.8+style*.2)));
 float edge=smoothstep(0.,.12,x)*(1.-smoothstep(.88,1.,x));
 float height=energy*edge*(.12+.85*pow(clamp(n*1.55,0.,1.),2.8)+.12*band);
 float tip=smoothstep(-.006,.045,height-y);
 float fuel=exp(-y/(.005+.025*energy))*edge;
 float density=clamp(tip*(.23+.85*n)+fuel,0.,1.);
 float heat=clamp(1.-y/max(.06,energy*.7),0.,1.);
 vec3 color=mix(vec3(.18,.003,.002),vec3(1.,.12,.006),smoothstep(.05,.7,heat));
 color=mix(color,vec3(1.,.6,.08),smoothstep(.7,.95,heat));
 color=mix(color,vec3(1.,.96,.68),fuel*.8);
 float glow=exp(-abs(height-y)*24.)*.12*edge*energy;
 vec3 rgb=black+color*density+vec3(.8,.08,.004)*glow;
 if(style>1.5){vec2 p=vec2(x*31.,y*10.-time*.7);float spark=pow(max(0.,1.-length(fract(p)-.5)*2.),12.);spark*=step(.94,hash(floor(p)))*energy*smoothstep(.05,.3,y);rgb+=vec3(1.,.42,.04)*spark;}
 gl_FragColor=vec4(rgb,1.);
}`);
  const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','levels','time','style','bands'].map(k=>[k,gl.getUniformLocation(program,k)]));
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
  for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
  const bins=new Uint8Array(128);gl.uniform1i(uniforms.bands,0);
  return (w,h,now)=>{
   if(gl.isContextLost())return false;
   if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;gl.viewport(0,0,w,h);}
   for(let c=0;c<2;c++)for(let i=0;i<64;i++){const at=(Math.exp(i/63*Math.log(256))-1)/255;bins[c*64+i]=Math.round(255*(packet.pcmLeft?interpolate(c?spectralR:spectralL,at):interpolate(packet.spectrum,at)/16));}
   gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,64,2,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,bins);
   gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.levels,left,right);gl.uniform1f(uniforms.time,now*.001);gl.uniform1f(uniforms.style,variant);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);ctx.drawImage(surface,0,0,w,h);return true;
  };
 }catch{return null;}
}
function drawFire(w,h,now){
 if(flameRenderer===undefined){flameRenderer=createFlameRenderer();flameBackend=flameRenderer?'WebGL density field':'Canvas smooth contours';}
 if(flameRenderer&&flameRenderer(w,h,now))return;
 flameBackend='Canvas smooth contours';
 for(let c=0;c<2;c++){
  const energy=Math.sqrt(c?right:left),ox=w*(c?.535:.055),width=w*.41,base=h*.94,height=h*.84;
  if(energy<.002)continue;
  const count=variant===1?12:20;
  ctx.fillStyle=gradient(base-height,height);
  for(let layer=0;layer<3;layer++){
   ctx.globalAlpha=.4+layer*.15;
   for(let i=0;i<count;i++){
    const phase=i*2.399+c*1.7,t=i/(count-1),xx=ox+t*width;
    const flame=height*energy*Math.pow(Math.sin(Math.PI*t),.4)*(.28+.32*(.5+.5*Math.sin(phase+now*.0023)));
    const tip=base-flame*(1-layer*.18),radius=width/count*(1.5-layer*.25),curl=Math.sin(phase+now*.0027)*radius*1.7;
    ctx.beginPath();ctx.moveTo(xx-radius,base);
    ctx.bezierCurveTo(xx-radius*1.4,base-flame*.25,xx+curl-radius*.5,tip+flame*.2,xx+curl,tip);
    ctx.bezierCurveTo(xx+curl+radius*.3,tip+flame*.4,xx+radius,base-flame*.2,xx+radius,base);ctx.closePath();ctx.fill();
   }
  }
  ctx.globalAlpha=1;
  if(variant===2&&energy>.08&&particles.length<218)for(let i=0;i<2;i++)particles.push({x:ox+Math.random()*width,y:base-height*energy*.35,vy:h*(.1+Math.random()*.15),life:.4+Math.random()*.6});
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
 particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=delta;p.y-=p.vy*delta;ctx.globalAlpha=Math.min(1,Math.max(0,p.life));ctx.fillStyle='#ffc478';ctx.fillRect(p.x,p.y,1.5*dpr,2*dpr);}ctx.globalAlpha=1;
 document.getElementById('meter').textContent=`L ${db(left)} dB · R ${db(right)} dB`;clock.record(now,performance.now()-started);
}requestAnimationFrame(draw);window.neowulfVisualizer={resetRenderMeasurements:()=>clock.resetMeasurements(),receive,get mode(){return {mode,variant,label:(modeNames[mode]||modeNames.fire)[variant],flameBackend};},get packet(){return packet;},get stats(){return clock.stats;},get levels(){return {left,right};},get spectra(){return {left:Array.from(spectralL),right:Array.from(spectralR)};}};
})();