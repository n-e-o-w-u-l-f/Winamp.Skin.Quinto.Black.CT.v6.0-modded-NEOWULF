#include <lib/std.mi>

Global Group g;
Global AnimatedLayer leftMeter, rightMeter;
Global Timer refresh;
Global int leftLevel, rightLevel, phase, attackStep, releaseStep;
Global String target;

System.onScriptLoaded() {
  g = getScriptGroup();
  target = getParam();

  if (target == "lr") {
    leftMeter = g.findObject("neowulf.vu.r42.left");
    rightMeter = g.findObject("neowulf.vu.r42.right");
  } else if (target == "horizontal") {
    leftMeter = g.findObject("neowulf.vu.mdh.r42.left");
    rightMeter = g.findObject("neowulf.vu.mdh.r42.right");
  } else if (target == "vertical") {
    leftMeter = g.findObject("neowulf.vu.mdv.r42.left");
    rightMeter = g.findObject("neowulf.vu.mdv.r42.right");
  } else {
    leftMeter = g.findObject("neowulf.mp.vu.r42.left");
    rightMeter = g.findObject("neowulf.mp.vu.r42.right");
  }

  attackStep = getPrivateInt("NEOWULF R4.2", "VUAttack", 6);
  releaseStep = getPrivateInt("NEOWULF R4.2", "VURelease", 2);
  if (attackStep < 1) attackStep = 1;
  if (attackStep > 12) attackStep = 12;
  if (releaseStep < 1) releaseStep = 1;
  if (releaseStep > 8) releaseStep = 8;

  leftLevel = 0;
  rightLevel = 0;
  phase = 0;
  if (leftMeter) leftMeter.gotoFrame(0);
  if (rightMeter) rightMeter.gotoFrame(1);

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
    leftLevel += attackStep;
    if (leftLevel > tl) leftLevel = tl;
  } else if (tl < leftLevel) {
    leftLevel -= releaseStep;
    if (leftLevel < tl) leftLevel = tl;
  }

  if (tr > rightLevel) {
    rightLevel += attackStep;
    if (rightLevel > tr) rightLevel = tr;
  } else if (tr < rightLevel) {
    rightLevel -= releaseStep;
    if (rightLevel < tr) rightLevel = tr;
  }

  if (leftLevel < 0) leftLevel = 0;
  if (rightLevel < 0) rightLevel = 0;
  if (leftLevel > 39) leftLevel = 39;
  if (rightLevel > 39) rightLevel = 39;

  phase++;
  if (phase > 2) phase = 0;

  if (leftMeter) leftMeter.gotoFrame(leftLevel * 3 + phase);
  if (rightMeter) rightMeter.gotoFrame(rightLevel * 3 + ((phase + 1) % 3));
}

