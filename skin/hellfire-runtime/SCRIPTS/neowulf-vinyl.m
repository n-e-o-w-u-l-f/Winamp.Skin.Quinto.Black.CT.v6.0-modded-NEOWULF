#include <lib/std.mi>
Global Group g;
Global Layer vinyl, led;
Global Button closeButton, rpm33, rpm45, power;
Global Slider pitch;
Global Timer clock;
Global Double phase, rpm, speed;
Global Double phaseCos, phaseSin;
Global Int lastTime, running;
System.onScriptLoaded() {
  g = getScriptGroup();
  vinyl=g.findObject("nw.vinyl"); led=g.findObject("nw.pulse");
  closeButton=g.findObject("nw.close"); rpm33=g.findObject("nw.rpm33"); rpm45=g.findObject("nw.rpm45");
  power=g.findObject("nw.power"); pitch=g.findObject("nw.pitch");
  pitch.setPosition(50); rpm=33.333333; speed=0; phase=0; running=1; lastTime=System.getTimeOfDay();
  phaseCos=1;phaseSin=0;
  Region disc=new Region;disc.loadFromBitmap("nw.vinyl.clip");vinyl.setRegion(disc);delete disc;
  // Keep mesh corners unclamped; the stationary Region hides wrapped copies.
  vinyl.fx_setGridSize(1,1); vinyl.fx_setBgFx(0); vinyl.fx_setWrap(1);
  vinyl.fx_setBilinear(1); vinyl.fx_setRect(1); vinyl.fx_setClear(1);
  vinyl.fx_setLocalized(1); vinyl.fx_setRealtime(0); vinyl.fx_setEnabled(1);
  vinyl.fx_update(); clock = new Timer; clock.setDelay(16); clock.start();
}
vinyl.fx_onGetPixelX(Double r, Double d, Double x, Double y) { return x*phaseCos-y*phaseSin; }
vinyl.fx_onGetPixelY(Double r, Double d, Double x, Double y) { return x*phaseSin+y*phaseCos; }
rpm33.onLeftClick() { rpm=33.333333; }
rpm45.onLeftClick() { rpm=45; }
power.onLeftClick() { running=1-running; }
closeButton.onLeftClick() { g.getParentLayout().getContainer().hide(); }
clock.onTimer() {
  Int now=System.getTimeOfDay(); Double dt=(now-lastTime)*0.001; lastTime=now;
  if(dt<0)dt=0.016; if(dt>0.1)dt=0.1;
  Double target=0;
  if(System.getStatus()==1 && running)target=rpm*(0.92+pitch.getPosition()*0.0016);
  speed=speed+(target-speed)*dt*4;
  phase=phase+6.28318530718*speed*dt/60;
  if(phase>6.28318530718)phase=phase-6.28318530718;
  phaseCos=System.cos(phase);phaseSin=System.sin(phase);
  if(g.isVisible())vinyl.fx_update();
  led.setAlpha(135+100*System.sin(now*0.002));
}
System.onScriptUnloading() { clock.stop(); delete clock; }
