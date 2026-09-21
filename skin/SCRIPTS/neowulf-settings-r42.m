#include <lib/std.mi>

Global Group g;
Global Edit emain, esa, eeq, evu, e1, e2, e3, esl, esr;
Global Button saveBtn, resetBtn, titleBtn, m1Btn, m2Btn, m3Btn;
Global Text statusText, titleState, mode1State, mode2State, mode3State;
Global int showTitles, mode1, mode2, mode3;

Function loadSettings();
Function saveSettings();
Function applyLive();
Function setModeLabels();
Function applyTitle(String cid, String tid, String value, int alpha);
Function applyMode(String cid, String vid, int modeValue);

System.onScriptLoaded() {
  g = getScriptGroup();
  emain = g.findObject("neowulf.cfg.edit.main");
  esa = g.findObject("neowulf.cfg.edit.spectrum");
  eeq = g.findObject("neowulf.cfg.edit.equalizer");
  evu = g.findObject("neowulf.cfg.edit.vu");
  e1 = g.findObject("neowulf.cfg.edit.deck1");
  e2 = g.findObject("neowulf.cfg.edit.deck2");
  e3 = g.findObject("neowulf.cfg.edit.deck3");
  esl = g.findObject("neowulf.cfg.edit.speaker.left");
  esr = g.findObject("neowulf.cfg.edit.speaker.right");
  saveBtn = g.findObject("neowulf.cfg.button.save");
  resetBtn = g.findObject("neowulf.cfg.button.reset");
  titleBtn = g.findObject("neowulf.cfg.button.titles");
  m1Btn = g.findObject("neowulf.cfg.button.mode1");
  m2Btn = g.findObject("neowulf.cfg.button.mode2");
  m3Btn = g.findObject("neowulf.cfg.button.mode3");
  statusText = g.findObject("neowulf.cfg.status");
  titleState = g.findObject("neowulf.cfg.titles.state");
  mode1State = g.findObject("neowulf.cfg.mode1.state");
  mode2State = g.findObject("neowulf.cfg.mode2.state");
  mode3State = g.findObject("neowulf.cfg.mode3.state");
  loadSettings();
}

loadSettings() {
  emain.setText(getPrivateString("NEOWULF R4.2", "MainTitle", "NEOWULF"));
  esa.setText(getPrivateString("NEOWULF R4.2", "SpectrumTitle", "SPECTROSCOPE"));
  eeq.setText(getPrivateString("NEOWULF R4.2", "EqualizerTitle", "EQUALIZER"));
  evu.setText(getPrivateString("NEOWULF R4.2", "VUTitle", "DIGITAL VU // L-R"));
  e1.setText(getPrivateString("NEOWULF R4.2", "OscDeck1Title", "OSCILLOSCOPE // WIDE"));
  e2.setText(getPrivateString("NEOWULF R4.2", "OscDeck2Title", "OSCILLOSCOPE // SOLID"));
  e3.setText(getPrivateString("NEOWULF R4.2", "OscDeck3Title", "SPECTRAL FIRE"));
  esl.setText(getPrivateString("NEOWULF R4.2", "SpeakerLeftTitle", "TEUFEL // MK ULTRA"));
  esr.setText(getPrivateString("NEOWULF R4.2", "SpeakerRightTitle", "TEUFEL // MK ULTRA"));
  showTitles = getPrivateInt("NEOWULF R4.2", "ShowDeckTitles", 1);
  mode1 = getPrivateInt("NEOWULF R4.2", "OscDeck1Mode", 2);
  mode2 = getPrivateInt("NEOWULF R4.2", "OscDeck2Mode", 2);
  mode3 = getPrivateInt("NEOWULF R4.2", "OscDeck3Mode", 1);
  setModeLabels();
  statusText.setText("Backend settings loaded");
}

setModeLabels() {
  if (showTitles) titleState.setText("ON"); else titleState.setText("OFF");
  mode1State.setText(integerToString(mode1));
  mode2State.setText(integerToString(mode2));
  mode3State.setText(integerToString(mode3));
}

saveSettings() {
  setPrivateString("NEOWULF R4.2", "MainTitle", emain.getText());
  setPrivateString("NEOWULF R4.2", "SpectrumTitle", esa.getText());
  setPrivateString("NEOWULF R4.2", "EqualizerTitle", eeq.getText());
  setPrivateString("NEOWULF R4.2", "VUTitle", evu.getText());
  setPrivateString("NEOWULF R4.2", "OscDeck1Title", e1.getText());
  setPrivateString("NEOWULF R4.2", "OscDeck2Title", e2.getText());
  setPrivateString("NEOWULF R4.2", "OscDeck3Title", e3.getText());
  setPrivateString("NEOWULF R4.2", "SpeakerLeftTitle", esl.getText());
  setPrivateString("NEOWULF R4.2", "SpeakerRightTitle", esr.getText());
  setPrivateInt("NEOWULF R4.2", "ShowDeckTitles", showTitles);
  setPrivateInt("NEOWULF R4.2", "OscDeck1Mode", mode1);
  setPrivateInt("NEOWULF R4.2", "OscDeck2Mode", mode2);
  setPrivateInt("NEOWULF R4.2", "OscDeck3Mode", mode3);
  applyLive();
  statusText.setText("Saved + applied");
}

applyTitle(String cid, String tid, String value, int alpha) {
  Container c = getContainer(cid);
  if (!c) return;
  Layout l = c.getLayout("normal");
  if (!l) return;
  Text t = l.findObject(tid);
  if (!t) return;
  t.setText(value);
  t.setAlpha(alpha);
}

applyMode(String cid, String vid, int modeValue) {
  Container c = getContainer(cid);
  if (!c) return;
  Layout l = c.getLayout("normal");
  if (!l) return;
  Vis v = l.findObject(vid);
  if (!v) return;
  v.setMode(modeValue);
  v.setRealtime(1);
}

applyLive() {
  int a = 0;
  if (showTitles) a = 255;
  applyTitle("main", "neowulf.mp.title", emain.getText(), a);
  applyTitle("spectrum.analyzer", "neowulf.sa.title", esa.getText(), a);
  applyTitle("equalizer", "neowulf.eq.title", eeq.getText(), a);
  applyTitle("vu.meter.analog", "neowulf.vu.title", evu.getText(), a);
  applyTitle("neowulf.oscillator.deck1.r42", "neowulf.osc.deck1.title", e1.getText(), a);
  applyTitle("neowulf.oscillator.deck2.r42", "neowulf.osc.deck2.title", e2.getText(), a);
  applyTitle("neowulf.oscillator.deck3.r42", "neowulf.osc.deck3.title", e3.getText(), a);
  applyTitle("loudspeaker.left", "neowulf.ls.left.title", esl.getText(), a);
  applyTitle("loudspeaker.right", "neowulf.ls.right.title", esr.getText(), a);
  applyMode("neowulf.oscillator.deck1.r42", "neowulf.osc.deck1.vis", mode1);
  applyMode("neowulf.oscillator.deck2.r42", "neowulf.osc.deck2.vis", mode2);
  applyMode("neowulf.oscillator.deck3.r42", "neowulf.osc.deck3.vis", mode3);
}

saveBtn.onLeftClick() { saveSettings(); }

resetBtn.onLeftClick() {
  emain.setText("NEOWULF");
  esa.setText("SPECTROSCOPE");
  eeq.setText("EQUALIZER");
  evu.setText("DIGITAL VU // L-R");
  e1.setText("OSCILLOSCOPE // WIDE");
  e2.setText("OSCILLOSCOPE // SOLID");
  e3.setText("SPECTRAL FIRE");
  esl.setText("TEUFEL // MK ULTRA");
  esr.setText("TEUFEL // MK ULTRA");
  showTitles = 1; mode1 = 2; mode2 = 2; mode3 = 1;
  setModeLabels();
  saveSettings();
}

titleBtn.onLeftClick() {
  if (showTitles) showTitles = 0; else showTitles = 1;
  setModeLabels();
}

m1Btn.onLeftClick() { if (mode1 == 1) mode1 = 2; else mode1 = 1; setModeLabels(); }
m2Btn.onLeftClick() { if (mode2 == 1) mode2 = 2; else mode2 = 1; setModeLabels(); }
m3Btn.onLeftClick() { if (mode3 == 1) mode3 = 2; else mode3 = 1; setModeLabels(); }

