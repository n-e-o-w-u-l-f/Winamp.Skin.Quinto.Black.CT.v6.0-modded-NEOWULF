#include <lib/std.mi>

Global Group g;
Global Button openButton, b1, b2, b3;
Global Container deck1, deck2, deck3;
Global String mode;

Function showDeck(int which);

System.onScriptLoaded() {
  g = getScriptGroup();
  mode = getParam();

  deck1 = System.getContainer("neowulf.oscillator.deck.fire.wide.r41");
  deck2 = System.getContainer("neowulf.oscillator.deck.dual.lr.r41");
  deck3 = System.getContainer("neowulf.oscillator.deck.twin.mirror.r41");

  if (mode == "main") {
    openButton = g.findObject("mp.button.osc.r41");
  } else {
    b1 = g.findObject("neowulf.osc.button.1");
    b2 = g.findObject("neowulf.osc.button.2");
    b3 = g.findObject("neowulf.osc.button.3");
  }
}

showDeck(int which) {
  deck1.hide();
  deck2.hide();
  deck3.hide();

  if (which == 1) deck1.show();
  if (which == 2) deck2.show();
  if (which == 3) deck3.show();
}

openButton.onLeftClick() { showDeck(1); }
b1.onLeftClick() { showDeck(1); }
b2.onLeftClick() { showDeck(2); }
b3.onLeftClick() { showDeck(3); }
