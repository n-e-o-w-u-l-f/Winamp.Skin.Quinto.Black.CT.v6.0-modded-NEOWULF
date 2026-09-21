#include <lib/std.mi>

Global Group g;
Global Text deckTitle;
Global Vis oscVis;
Global String which;

System.onScriptLoaded() {
  g = getScriptGroup();
  which = getParam();

  if (which == "1") {
    deckTitle = g.findObject("neowulf.osc.deck1.title");
    oscVis = g.findObject("neowulf.osc.deck1.vis");
    if (deckTitle) deckTitle.setText(getPrivateString("NEOWULF R4.2", "OscDeck1Title", "OSCILLOSCOPE // WIDE"));
    if (oscVis) {
      oscVis.setMode(getPrivateInt("NEOWULF R4.2", "OscDeck1Mode", 2));
      oscVis.setRealtime(1);
    }
  } else if (which == "2") {
    deckTitle = g.findObject("neowulf.osc.deck2.title");
    oscVis = g.findObject("neowulf.osc.deck2.vis");
    if (deckTitle) deckTitle.setText(getPrivateString("NEOWULF R4.2", "OscDeck2Title", "OSCILLOSCOPE // SOLID"));
    if (oscVis) {
      oscVis.setMode(getPrivateInt("NEOWULF R4.2", "OscDeck2Mode", 2));
      oscVis.setRealtime(1);
    }
  } else if (which == "3") {
    deckTitle = g.findObject("neowulf.osc.deck3.title");
    oscVis = g.findObject("neowulf.osc.deck3.vis");
    if (deckTitle) deckTitle.setText(getPrivateString("NEOWULF R4.2", "OscDeck3Title", "SPECTRAL FIRE"));
    if (oscVis) {
      oscVis.setMode(getPrivateInt("NEOWULF R4.2", "OscDeck3Mode", 1));
      oscVis.setRealtime(1);
    }
  } else if (which == "speaker-left") {
    deckTitle = g.findObject("neowulf.ls.left.title");
    if (deckTitle) deckTitle.setText(getPrivateString("NEOWULF R4.2", "SpeakerLeftTitle", "TEUFEL // MK ULTRA"));
  } else if (which == "speaker-right") {
    deckTitle = g.findObject("neowulf.ls.right.title");
    if (deckTitle) deckTitle.setText(getPrivateString("NEOWULF R4.2", "SpeakerRightTitle", "TEUFEL // MK ULTRA"));
  }

  if (deckTitle) {
    if (getPrivateInt("NEOWULF R4.2", "ShowDeckTitles", 1)) deckTitle.setAlpha(255);
    else deckTitle.setAlpha(0);
  }
}

