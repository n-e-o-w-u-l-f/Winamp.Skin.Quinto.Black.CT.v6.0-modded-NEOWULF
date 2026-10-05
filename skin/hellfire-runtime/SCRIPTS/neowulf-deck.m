#include <lib/std.mi>
Global Group g;
Global Button closeButton;
Global Layer pulse;
Global Timer clock;
Global Int started;
System.onScriptLoaded() {
  g = getScriptGroup();
  closeButton = g.findObject("nw.close");
  pulse = g.findObject("nw.pulse");
  started = System.getTimeOfDay();
  clock = new Timer;
  clock.setDelay(20);
  clock.start();
}
closeButton.onLeftClick() { g.getParentLayout().getContainer().hide(); }
clock.onTimer() {
  if (pulse != NULL) pulse.setAlpha(170 + 75 * System.sin((System.getTimeOfDay()-started)*0.0018));
}
System.onScriptUnloading() { clock.stop(); delete clock; }
