#include <lib/std.mi>

Global Group g;
Global Text componentTitle;
Global String which;

System.onScriptLoaded() {
  g = getScriptGroup();
  which = getParam();

  if (which == "main") {
    componentTitle = g.findObject("neowulf.mp.title");
    if (componentTitle) componentTitle.setText(getPrivateString("NEOWULF R4.2", "MainTitle", "NEOWULF"));
  } else if (which == "spectrum") {
    componentTitle = g.findObject("neowulf.sa.title");
    if (componentTitle) componentTitle.setText(getPrivateString("NEOWULF R4.2", "SpectrumTitle", "SPECTROSCOPE"));
  } else if (which == "equalizer") {
    componentTitle = g.findObject("neowulf.eq.title");
    if (componentTitle) componentTitle.setText(getPrivateString("NEOWULF R4.2", "EqualizerTitle", "EQUALIZER"));
  } else if (which == "vu") {
    componentTitle = g.findObject("neowulf.vu.title");
    if (componentTitle) componentTitle.setText(getPrivateString("NEOWULF R4.2", "VUTitle", "DIGITAL VU // L-R"));
  }

  if (componentTitle) {
    if (getPrivateInt("NEOWULF R4.2", "ShowDeckTitles", 1)) componentTitle.setAlpha(255);
    else componentTitle.setAlpha(0);
  }
}

