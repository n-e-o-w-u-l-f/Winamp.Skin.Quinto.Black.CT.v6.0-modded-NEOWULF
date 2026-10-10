#include <lib/std.mi>
Global Group g;
Global Layer volume, needleL, needleR, pulse, vinyl, arm, chassisOn;
Global Button closeButton, resetButton;
Global Timer tick;
Global List ledsL, ledsR;
Global Double levelL, levelR;
Global Double rotation, leftAngle, rightAngle, brightness;
Global Double phase, speed, armAngle;
Global Double phaseCos, phaseSin, vinylPivotX, vinylPivotY;
Global Double vinylRadiusX, vinylRadiusY;
Global Double vinylM00, vinylM01, vinylM02, vinylM10, vinylM11, vinylM12, vinylM20, vinylM21, vinylM22;
Global Int vinylGridX, vinylGridY;
Global Int lastTime, sampleTime, frameCount;
Global Int drag, mouseY, initialVolume, kind;
Function setup(Layer target);
setup(Layer target) {
  target.fx_setGridSize(1,1); target.fx_setBgFx(0); target.fx_setWrap(0);
  target.fx_setBilinear(1); target.fx_setRect(0); target.fx_setClear(0);
  target.fx_setLocalized(1); target.fx_setRealtime(0); target.fx_setEnabled(1);
}
System.onScriptLoaded() {
  g=getScriptGroup(); kind=System.stringToInteger(System.getToken(getParam(),"|",0));
  vinylPivotX=System.stringToFloat(System.getToken(getParam(),"|",1));
  vinylPivotY=System.stringToFloat(System.getToken(getParam(),"|",2));
  vinylRadiusX=System.stringToFloat(System.getToken(getParam(),"|",3));
  vinylRadiusY=System.stringToFloat(System.getToken(getParam(),"|",4));
  vinylM00=System.stringToFloat(System.getToken(getParam(),"|",5));
  vinylM01=System.stringToFloat(System.getToken(getParam(),"|",6));
  vinylM02=System.stringToFloat(System.getToken(getParam(),"|",7));
  vinylM10=System.stringToFloat(System.getToken(getParam(),"|",8));
  vinylM11=System.stringToFloat(System.getToken(getParam(),"|",9));
  vinylM12=System.stringToFloat(System.getToken(getParam(),"|",10));
  vinylM20=System.stringToFloat(System.getToken(getParam(),"|",11));
  vinylM21=System.stringToFloat(System.getToken(getParam(),"|",12));
  vinylM22=System.stringToFloat(System.getToken(getParam(),"|",13));
  vinylGridX=System.stringToInteger(System.getToken(getParam(),"|",14));
  vinylGridY=System.stringToInteger(System.getToken(getParam(),"|",15));
  phaseCos=1;phaseSin=0;
  closeButton=g.findObject("ref.close"); resetButton=g.findObject("ref.reset");
  volume=g.findObject("ref.volume"); pulse=g.findObject("ref.pulse");
  vinyl=g.findObject("ref.vinyl");arm=g.findObject("ref.arm");chassisOn=g.findObject("ref.chassis.on");
  needleL=g.findObject("ref.needle.left"); needleR=g.findObject("ref.needle.right");
  if(volume!=NULL)setup(volume);
  if(vinyl!=NULL){
    // Map the projected chassis plane back into the physical record, then
    // rotate its texture. The measured spindle and fixed ellipse stay put.
    // wrap=0 still clips corners before interpolation: retain wrap=1 + Region.
    Region disc=new Region;disc.loadFromBitmap("ref.vinyl.clip");
    vinyl.setRegion(disc);delete disc;
    setup(vinyl);vinyl.fx_setWrap(1);vinyl.fx_setRect(1);vinyl.fx_setClear(1);
    vinyl.fx_setGridSize(vinylGridX,vinylGridY);
    vinyl.fx_update();
  }
  if(arm!=NULL){setup(arm);arm.fx_setRect(1);}
  if(needleL!=NULL)setup(needleL); if(needleR!=NULL)setup(needleR);
  rotation=0; leftAngle=0; rightAngle=0; brightness=0;
  phase=0;speed=0;armAngle=-0.45;
  ledsL=new List; ledsR=new List; levelL=0; levelR=0;
  for(Int i=0;i<48;i++) {
    Layer a=g.findObject("ref.led.l."+System.integerToString(i));
    Layer b=g.findObject("ref.led.r."+System.integerToString(i));
    if(a!=NULL)ledsL.addItem(a); if(b!=NULL)ledsR.addItem(b);
  }
  lastTime=System.getTimeOfDay();sampleTime=lastTime;frameCount=0;
  tick=new Timer; tick.setDelay(33); tick.start();
}
closeButton.onLeftClick() { g.getParentLayout().getContainer().hide(); }
resetButton.onLeftClick() { for(Int i=0;i<10;i++)System.setEqBand(i,0); System.setEqPreamp(0); }
volume.onLeftButtonDown(Int x, Int y) { drag=1; mouseY=y; initialVolume=System.getVolume(); }
volume.onLeftButtonUp(Int x, Int y) { drag=0; }
volume.onMouseMove(Int x, Int y) { if(drag){Int v=initialVolume+(mouseY-y)*2;if(v<0)v=0;if(v>255)v=255;System.setVolume(v);} }
volume.onMouseWheelUp(Int clicked, Int lines) { Int v=System.getVolume()+5;if(v>255)v=255;System.setVolume(v); return 1; }
volume.onMouseWheelDown(Int clicked, Int lines) { Int v=System.getVolume()-5;if(v<0)v=0;System.setVolume(v); return 1; }
volume.fx_onGetPixelR(Double r, Double d, Double x, Double y) { return r+rotation; }
vinyl.fx_onGetPixelX(Double r, Double d, Double x, Double y) { return vinylPivotX+vinylRadiusX*((vinylM00*x+vinylM01*y+vinylM02)*phaseCos-(vinylM10*x+vinylM11*y+vinylM12)*phaseSin)/(vinylM20*x+vinylM21*y+vinylM22); }
vinyl.fx_onGetPixelY(Double r, Double d, Double x, Double y) { return vinylPivotY+vinylRadiusY*((vinylM00*x+vinylM01*y+vinylM02)*phaseSin+(vinylM10*x+vinylM11*y+vinylM12)*phaseCos)/(vinylM20*x+vinylM21*y+vinylM22); }
// Winamp's documented LayerFX x/y range is -1..1. Rotate about the mounting
// attachment in physical layer pixels rather than the bitmap centre.
arm.fx_onGetPixelX(Double r, Double d, Double x, Double y) {
  return 0.87+(x-0.87)*System.cos(armAngle)+(y+0.45)*170.0/289.0*System.sin(armAngle);
}
arm.fx_onGetPixelY(Double r, Double d, Double x, Double y) {
  return -0.45+(-(x-0.87)*System.sin(armAngle)+(y+0.45)*170.0/289.0*System.cos(armAngle))*289.0/170.0;
}
needleL.fx_onGetPixelR(Double r, Double d, Double x, Double y) { return r+leftAngle; }
needleR.fx_onGetPixelR(Double r, Double d, Double x, Double y) { return r+rightAngle; }
tick.onTimer() {
  Int now=System.getTimeOfDay();Double dt=(now-lastTime)*0.001;lastTime=now;
  if(dt<0)dt=0.033;if(dt>0.1)dt=0.1;
  if(!g.isVisible()){frameCount=0;sampleTime=now;return;}
  frameCount++;
  if(now-sampleTime>=2000){System.setPrivateInt("NEOWULF.Reference",g.getId()+".tick_millifps",frameCount*1000000/(now-sampleTime));frameCount=0;sampleTime=now;}
  if(volume!=NULL){Double nextRotation=-2.35619449+System.getVolume()*4.71238898/255;if(nextRotation!=rotation){rotation=nextRotation;volume.fx_update();}}
  Double speedTarget=0,armTarget=-0.45;if(System.getStatus()==1){speedTarget=33.333333;armTarget=0;}
  speed=speed+(speedTarget-speed)*(1-System.pow(2.718281828,-dt/0.65));
  phase=phase+6.28318530718*speed*dt/60;if(phase>6.28318530718)phase=phase-6.28318530718;
  phaseCos=System.cos(phase);phaseSin=System.sin(phase);
  armAngle=armAngle+(armTarget-armAngle)*(1-System.pow(2.718281828,-dt/0.8));
  if(vinyl!=NULL&&speed>0.01)vinyl.fx_update();if(arm!=NULL)arm.fx_update();
  Double l=System.getLeftVuMeter()/255.0, r=System.getRightVuMeter()/255.0;
  if(System.getStatus()!=1){l=0;r=0;}
  Double tauL=0.24,tauR=0.24;if(l>levelL)tauL=0.025;if(r>levelR)tauR=0.025;
  levelL=levelL+(l-levelL)*(1-System.pow(2.718281828,-dt/tauL));levelR=levelR+(r-levelR)*(1-System.pow(2.718281828,-dt/tauR));
  for(Int i=0;i<ledsL.getNumItems();i++){Layer a=ledsL.enumItem(i);Int alpha=20;if(i<levelL*48)alpha=255;a.setAlpha(alpha);}
  for(Int i=0;i<ledsR.getNumItems();i++){Layer b=ledsR.enumItem(i);Int alpha=20;if(i<levelR*48)alpha=255;b.setAlpha(alpha);}
  if(needleL!=NULL){leftAngle=leftAngle+(l*1.7-leftAngle)*(1-System.pow(2.718281828,-dt/0.12));needleL.fx_update();}
  if(needleR!=NULL){rightAngle=rightAngle+(r*1.7-rightAngle)*(1-System.pow(2.718281828,-dt/0.12));needleR.fx_update();}
  if(pulse!=NULL){Double target=0;if(System.getStatus()==1)target=180+65*System.sin(now*0.0022);brightness=brightness+(target-brightness)*(1-System.pow(2.718281828,-dt/0.65));pulse.setAlpha(brightness);}
  if(chassisOn!=NULL){Double target=0;if(System.getStatus()==1)target=205+50*System.sin(now*0.0022);brightness=brightness+(target-brightness)*(1-System.pow(2.718281828,-dt/0.65));chassisOn.setAlpha(brightness);}
}
System.onScriptUnloading() { tick.stop(); delete tick; delete ledsL; delete ledsR; }
