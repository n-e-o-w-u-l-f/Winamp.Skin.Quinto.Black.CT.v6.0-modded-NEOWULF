#include <lib/std.mi>

Global Group g;
Global AnimatedLayer lp;
Global Button b33, b45;
Global Timer spin;
Global int spinFrame, delayms, currentBank;

System.onScriptLoaded() {
  g = getScriptGroup();
  lp = g.findObject("vrp.layer.vinyl");
  b33 = g.findObject("vrp.button.33");
  b45 = g.findObject("vrp.button.45");
  spinFrame = 0;
  currentBank = 0;
  delayms = 15; // 120 frames / 1.8 s = 66.7 fps at 33 1/3 RPM
  lp.setXmlParam("image", "neowulf.vrp.lp.rotation.a");
  lp.gotoFrame(0);
  spin = new Timer;
  spin.setDelay(delayms);
  if (System.getStatus() == 1) spin.start();
}

System.onScriptUnloading() { spin.stop(); delete spin; }
System.onPlay() { spin.start(); }
System.onResume() { spin.start(); }
System.onPause() { spin.stop(); }
System.onStop() { spin.stop(); }

b33.onLeftClick() { delayms = 15; spin.setDelay(delayms); }
b45.onLeftClick() { delayms = 11; spin.setDelay(delayms); }

spin.onTimer() {
  spinFrame++;
  if (spinFrame > 119) spinFrame = 0;
  int newBank = spinFrame / 60;
  int localFrame = spinFrame - (newBank * 60);
  if (newBank != currentBank) {
    currentBank = newBank;
    if (currentBank == 0) lp.setXmlParam("image", "neowulf.vrp.lp.rotation.a");
    else lp.setXmlParam("image", "neowulf.vrp.lp.rotation.b");
  }
  lp.gotoFrame(localFrame);
}
