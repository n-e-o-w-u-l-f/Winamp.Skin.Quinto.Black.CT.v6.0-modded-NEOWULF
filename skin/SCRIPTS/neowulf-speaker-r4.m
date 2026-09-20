[Reading 62 lines from start (total: 62 lines, 0 remaining)]

#include <lib/std.mi>

Global Group g;
Global AnimatedLayer woofer1, woofer2, woofer3;
Global Timer meter;
Global int f1, f2, f3;
Global String side;

System.onScriptLoaded() {
  g = getScriptGroup();
  side = getParam();

  if (side == "left") {
    woofer1 = g.findObject("neowulf.ls.left.woofer1");
    woofer2 = g.findObject("neowulf.ls.left.woofer2");
    woofer3 = g.findObject("neowulf.ls.left.woofer3");
  } else {
    woofer1 = g.findObject("neowulf.ls.right.woofer1");
    woofer2 = g.findObject("neowulf.ls.right.woofer2");
    woofer3 = g.findObject("neowulf.ls.right.woofer3");
  }

  f1 = 0;
  f2 = 0;
  f3 = 0;
  meter = new Timer;
  meter.setDelay(16);
  meter.start();
}

System.onScriptUnloading() {
  meter.stop();
  delete meter;
}

meter.onTimer() {
  int v;
  if (side == "left") v = System.getLeftVuMeter();
  else v = System.getRightVuMeter();

  int target1 = (v * 63) / 255;
  int target2 = (target1 * 58) / 63;
  int target3 = (target1 * 54) / 63;

  if (target1 > f1) { f1 += 5; if (f1 > target1) f1 = target1; }
  else if (target1 < f1) { f1 -= 3; if (f1 < target1) f1 = target1; }

  if (target2 > f2) { f2 += 4; if (f2 > target2) f2 = target2; }
  else if (target2 < f2) { f2 -= 2; if (f2 < target2) f2 = target2; }

  if (target3 > f3) { f3 += 3; if (f3 > target3) f3 = target3; }
  else if (target3 < f3) { f3 -= 2; if (f3 < target3) f3 = target3; }

  if (f1 < 0) f1 = 0; if (f1 > 63) f1 = 63;
  if (f2 < 0) f2 = 0; if (f2 > 63) f2 = 63;
  if (f3 < 0) f3 = 0; if (f3 > 63) f3 = 63;

  woofer1.gotoFrame(f1);
  woofer2.gotoFrame(f2);
  woofer3.gotoFrame(f3);
}


[executed on device: legion (e48c5469-353c-41fb-8775-8370b4be1316)]