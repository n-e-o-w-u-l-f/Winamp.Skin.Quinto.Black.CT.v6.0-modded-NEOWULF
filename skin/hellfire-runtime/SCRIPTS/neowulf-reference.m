#include <lib/std.mi>
Global Group g;
Global Layer volume, needleL, needleR, pulse;
Global Button closeButton, resetButton;
Global Timer tick;
Global List ledsL, ledsR;
Global Double levelL, levelR;
Global Double rotation, leftAngle, rightAngle, brightness;
Global Int drag, mouseY, initialVolume, kind;
Function setup(Layer target);
setup(Layer target) {
  target.fx_setGridSize(1,1); target.fx_setBgFx(0); target.fx_setWrap(0);
  target.fx_setBilinear(1); target.fx_setRect(0); target.fx_setClear(0);
  target.fx_setLocalized(1); target.fx_setRealtime(0); target.fx_setEnabled(1);
}
System.onScriptLoaded() {
  g=getScriptGroup(); kind=System.stringToInteger(getParam());
  closeButton=g.findObject("ref.close"); resetButton=g.findObject("ref.reset");
  volume=g.findObject("ref.volume"); pulse=g.findObject("ref.pulse");
  needleL=g.findObject("ref.needle.left"); needleR=g.findObject("ref.needle.right");
  if(volume!=NULL)setup(volume);
  if(needleL!=NULL)setup(needleL); if(needleR!=NULL)setup(needleR);
  rotation=0; leftAngle=0; rightAngle=0; brightness=0;
  ledsL=new List; ledsR=new List; levelL=0; levelR=0;
  for(Int i=0;i<48;i++) {
    Layer a=g.findObject("ref.led.l."+System.integerToString(i));
    Layer b=g.findObject("ref.led.r."+System.integerToString(i));
    if(a!=NULL)ledsL.addItem(a); if(b!=NULL)ledsR.addItem(b);
  }
  tick=new Timer; tick.setDelay(16); tick.start();
}
closeButton.onLeftClick() { g.getParentLayout().getContainer().hide(); }
resetButton.onLeftClick() { for(Int i=0;i<10;i++)System.setEqBand(i,0); System.setEqPreamp(0); }
volume.onLeftButtonDown(Int x, Int y) { drag=1; mouseY=y; initialVolume=System.getVolume(); }
volume.onLeftButtonUp(Int x, Int y) { drag=0; }
volume.onMouseMove(Int x, Int y) { if(drag){Int v=initialVolume+(mouseY-y)*2;if(v<0)v=0;if(v>255)v=255;System.setVolume(v);} }
volume.onMouseWheelUp(Int clicked, Int lines) { Int v=System.getVolume()+5;if(v>255)v=255;System.setVolume(v); return 1; }
volume.onMouseWheelDown(Int clicked, Int lines) { Int v=System.getVolume()-5;if(v<0)v=0;System.setVolume(v); return 1; }
volume.fx_onGetPixelR(Double r, Double d, Double x, Double y) { return r+rotation; }
needleL.fx_onGetPixelR(Double r, Double d, Double x, Double y) { return r+leftAngle; }
needleR.fx_onGetPixelR(Double r, Double d, Double x, Double y) { return r+rightAngle; }
tick.onTimer() {
  if(!g.isVisible())return;
  if(volume!=NULL){rotation=-2.35619449+System.getVolume()*4.71238898/255;volume.fx_update();}
  Double l=System.getLeftVuMeter()/255.0, r=System.getRightVuMeter()/255.0;
  if(System.getStatus()!=1){l=0;r=0;}
  Double attackL=0.04,attackR=0.04;if(l>levelL)attackL=0.22;if(r>levelR)attackR=0.22;
  levelL=levelL+(l-levelL)*attackL;levelR=levelR+(r-levelR)*attackR;
  for(Int i=0;i<ledsL.getNumItems();i++){Layer a=ledsL.enumItem(i);Int alpha=20;if(i<levelL*48)alpha=255;a.setAlpha(alpha);}
  for(Int i=0;i<ledsR.getNumItems();i++){Layer b=ledsR.enumItem(i);Int alpha=20;if(i<levelR*48)alpha=255;b.setAlpha(alpha);}
  if(needleL!=NULL){leftAngle=leftAngle+(l*1.7-leftAngle)*0.14;needleL.fx_update();}
  if(needleR!=NULL){rightAngle=rightAngle+(r*1.7-rightAngle)*0.14;needleR.fx_update();}
  if(pulse!=NULL){Double target=25;if(System.getStatus()==1)target=135+100*System.sin(System.getTimeOfDay()*0.002);brightness=brightness+(target-brightness)*0.07;pulse.setAlpha(brightness);}
}
System.onScriptUnloading() { tick.stop(); delete tick; delete ledsL; delete ledsR; }
