#include <lib/std.mi>
Global Group g;
Global AnimatedLayer w1, w2, w3;
Global Timer tick;
Global int f1, f2, f3, attackStep, releaseStep;
Global String side;

System.onScriptLoaded() {
  g = getScriptGroup(); side = getParam();
  if (side == "left") {
    w1 = g.findObject("neowulf.ls.left.r5.woofer1");
    w2 = g.findObject("neowulf.ls.left.r5.woofer2");
    w3 = g.findObject("neowulf.ls.left.r5.woofer3");
  } else {
    w1 = g.findObject("neowulf.ls.right.r5.woofer1");
    w2 = g.findObject("neowulf.ls.right.r5.woofer2");
    w3 = g.findObject("neowulf.ls.right.r5.woofer3");
  }
  f1=0; f2=0; f3=0;
  tick = new Timer; tick.setDelay(16); tick.start();
}
System.onScriptUnloading() { tick.stop(); delete tick; }

tick.onTimer() {
  attackStep = getPrivateInt("NEOWULF R5", "speaker.attack", 6);
  releaseStep = getPrivateInt("NEOWULF R5", "speaker.release", 3);
  if (attackStep < 1) attackStep = 1; if (attackStep > 12) attackStep = 12;
  if (releaseStep < 1) releaseStep = 1; if (releaseStep > 8) releaseStep = 8;
  int v; if (side == "left") v = System.getLeftVuMeter(); else v = System.getRightVuMeter();
  int t1=(v*63)/255; int t2=(t1*59)/63; int t3=(t1*55)/63;
  if (t1>f1) { f1+=attackStep; if(f1>t1)f1=t1; } else if(t1<f1){ f1-=releaseStep; if(f1<t1)f1=t1; }
  if (t2>f2) { f2+=attackStep; if(f2>t2)f2=t2; } else if(t2<f2){ f2-=releaseStep; if(f2<t2)f2=t2; }
  if (t3>f3) { f3+=attackStep; if(f3>t3)f3=t3; } else if(t3<f3){ f3-=releaseStep; if(f3<t3)f3=t3; }
  if(f1<0)f1=0; if(f2<0)f2=0; if(f3<0)f3=0;
  if(f1>63)f1=63; if(f2>63)f2=63; if(f3>63)f3=63;
  if(w1)w1.gotoFrame(f1); if(w2)w2.gotoFrame(f2); if(w3)w3.gotoFrame(f3);
}

