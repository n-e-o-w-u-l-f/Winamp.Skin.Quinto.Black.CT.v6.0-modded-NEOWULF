#include <lib/std.mi>
Global Group g;
Global Layer cone1,cone2,cone3,led;
Global Button closeButton;
Global Timer clock;
Global Double energy;
Global Int channel,x1,y1,w1,x2,y2,w2,x3,y3,w3;
Function moveCone(Layer cone, Int x,Int y,Int w,Double value);
System.onScriptLoaded(){
 g=getScriptGroup(); channel=System.stringToInteger(System.getParam());
 closeButton=g.findObject("nw.close");led=g.findObject("nw.pulse");
 cone1=g.findObject("nw.cone1");cone2=g.findObject("nw.cone2");cone3=g.findObject("nw.cone3");
 if(cone1!=NULL){x1=cone1.getLeft();y1=cone1.getTop();w1=cone1.getWidth();}
 if(cone2!=NULL){x2=cone2.getLeft();y2=cone2.getTop();w2=cone2.getWidth();}
 if(cone3!=NULL){x3=cone3.getLeft();y3=cone3.getTop();w3=cone3.getWidth();}
 energy=0;clock=new Timer;clock.setDelay(16);clock.start();
}
moveCone(Layer cone,Int x,Int y,Int w,Double value){
 if(cone==NULL)return;
 Int size=w+value*3;
 cone.resize(x-(size-w)/2,y-(size-w)/2,size,size);
}
closeButton.onLeftClick(){g.getParentLayout().getContainer().hide();}
clock.onTimer(){
 if(!g.isVisible())return;
 Double target=0;
 if(System.getStatus()==1){
  if(channel==0)target=System.getLeftVuMeter()/255.0;
  else if(channel==1)target=System.getRightVuMeter()/255.0;
  else target=(System.getLeftVuMeter()+System.getRightVuMeter())/510.0;
 }
 if(target>energy)energy=energy+(target-energy)*0.48;
 else energy=energy+(target-energy)*0.1;
 Double displacement=energy*System.sin(System.getTimeOfDay()*0.026);
 moveCone(cone1,x1,y1,w1,displacement);moveCone(cone2,x2,y2,w2,displacement);moveCone(cone3,x3,y3,w3,displacement);
 if(led!=NULL)led.setAlpha(130+110*energy);
}
System.onScriptUnloading(){clock.stop();delete clock;}
