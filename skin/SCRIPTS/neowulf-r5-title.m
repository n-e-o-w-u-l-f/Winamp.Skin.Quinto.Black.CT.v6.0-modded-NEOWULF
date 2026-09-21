#include <lib/std.mi>
Global Group g;
Global Text label;
Global Timer refresh;
Global String key, def, id, last;
Global int lastShow;

System.onScriptLoaded() {
  g = getScriptGroup();
  String p = getParam();
  key = getToken(p, "|", 0);
  def = getToken(p, "|", 1);
  id = getToken(p, "|", 2);
  label = g.findObject(id);
  last = "";
  lastShow = -1;
  refresh = new Timer;
  refresh.setDelay(350);
  refresh.start();
}
System.onScriptUnloading() { refresh.stop(); delete refresh; }
refresh.onTimer() {
  if (!label) return;
  String v = getPrivateString("NEOWULF R5", "title." + key, def);
  int show = getPrivateInt("NEOWULF R5", "titles.visible", 1);
  if (v != last) { label.setText(v); last = v; }
  if (show != lastShow) {
    if (show) label.setAlpha(255); else label.setAlpha(0);
    lastShow = show;
  }
}

