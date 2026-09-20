[Reading 74 lines from start (total: 74 lines, 0 remaining)]

#include <lib/std.mi>

Global Group g;
Global AnimatedLayer leftMeter, rightMeter;
Global Timer refresh;
Global int leftLevel, rightLevel, phase;
Global String mode;

System.onScriptLoaded() {
  g = getScriptGroup();
  mode = getParam();

  if (mode == "analog") {
    leftMeter = g.findObject("neowulf.vu.r4.left");
    rightMeter = g.findObject("neowulf.vu.r4.right");
  } else if (mode == "horizontal") {
    leftMeter = g.findObject("neowulf.vu.mdh.r4.left");
    rightMeter = g.findObject("neowulf.vu.mdh.r4.right");
  } else if (mode == "vertical") {
    leftMeter = g.findObject("neowulf.vu.mdv.r4.left");
    rightMeter = g.findObject("neowulf.vu.mdv.r4.right");
  } else {
    leftMeter = g.findObject("neowulf.mp.vu.r4.left");
    rightMeter = g.findObject("neowulf.mp.vu.r4.right");
  }

  leftLevel = 0;
  rightLevel = 0;
  phase = 0;
  leftMeter.gotoFrame(0);
  rightMeter.gotoFrame(1);

  refresh = new Timer;
  refresh.setDelay(16);
  refresh.start();
}

System.onScriptUnloading() {
  refresh.stop();
  delete refresh;
}

refresh.onTimer() {
  int tl = (System.getLeftVuMeter() * 39) / 255;
  int tr = (System.getRightVuMeter() * 39) / 255;

  if (tl > leftLevel) {
    leftLevel += 4;
    if (leftLevel > tl) leftLevel = tl;
  } else if (tl < leftLevel) {
    leftLevel -= 2;
    if (leftLevel < tl) leftLevel = tl;
  }

  if (tr > rightLevel) {
    rightLevel += 4;
    if (rightLevel > tr) rightLevel = tr;
  } else if (tr < rightLevel) {
    rightLevel -= 2;
    if (rightLevel < tr) rightLevel = tr;
  }

  if (leftLevel < 0) leftLevel = 0;
  if (rightLevel < 0) rightLevel = 0;
  if (leftLevel > 39) leftLevel = 39;
  if (rightLevel > 39) rightLevel = 39;

  phase++;
  if (phase > 2) phase = 0;

  leftMeter.gotoFrame(leftLevel * 3 + phase);
  rightMeter.gotoFrame(rightLevel * 3 + ((phase + 1) % 3));
}


[executed on device: legion (e48c5469-353c-41fb-8775-8370b4be1316)]