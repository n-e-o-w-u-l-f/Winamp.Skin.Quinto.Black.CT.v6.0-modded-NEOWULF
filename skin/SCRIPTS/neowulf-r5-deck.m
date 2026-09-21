#include <lib/std.mi>
Global Group g;
Global Vis visualizer;
Global Timer refresh;
Global String which, lastStyle;
Global int lastPeaks;

Function applySettings();

System.onScriptLoaded() {
  g = getScriptGroup();
  which = getParam();
  if (which == "1") visualizer = g.findObject("neowulf.r5.deck1.vis");
  else if (which == "2") visualizer = g.findObject("neowulf.r5.deck2.vis");
  else visualizer = g.findObject("neowulf.r5.deck3.vis");
  lastStyle = "";
  lastPeaks = -1;
  applySettings();
  refresh = new Timer;
  refresh.setDelay(350);
  refresh.start();
}
System.onScriptUnloading() { refresh.stop(); delete refresh; }

applySettings() {
  if (!visualizer) return;
  if (which == "1") {
    String s1 = getPrivateString("NEOWULF R5", "deck1.oscstyle", "lines");
    if (s1 != lastStyle) {
      visualizer.setXmlParam("oscstyle", s1);
      visualizer.setMode(2);
      visualizer.setRealtime(1);
      lastStyle = s1;
    }
  } else if (which == "2") {
    String s2 = getPrivateString("NEOWULF R5", "deck2.oscstyle", "solid");
    if (s2 != lastStyle) {
      visualizer.setXmlParam("oscstyle", s2);
      visualizer.setMode(2);
      visualizer.setRealtime(1);
      lastStyle = s2;
    }
  } else {
    int pk = getPrivateInt("NEOWULF R5", "deck3.peaks", 1);
    if (pk != lastPeaks) {
      if (pk) visualizer.setXmlParam("peaks", "1"); else visualizer.setXmlParam("peaks", "0");
      visualizer.setMode(1);
      visualizer.setRealtime(1);
      lastPeaks = pk;
    }
  }
}
refresh.onTimer() { applySettings(); }

