#include <lib/std.mi>
Global Group g;
Global Edit eMain,eScope,eEq,eFrg,eVu,e1,e2,e3,eSL,eSR,eVuA,eVuR,eSpA,eSpR;
Global Button saveBtn,resetBtn,titleBtn,d1Btn,d2Btn,d3Btn;
Global Text statusText,titleState,d1State,d2State,d3State;

Function loadAll();
Function saveAll();
Function refreshStates();
Function String nextStyle(String s);

System.onScriptLoaded() {
  g=getScriptGroup();
  eMain=g.findObject("neowulf.r5.edit.main"); eScope=g.findObject("neowulf.r5.edit.scope");
  eEq=g.findObject("neowulf.r5.edit.eq"); eFrg=g.findObject("neowulf.r5.edit.frg");
  eVu=g.findObject("neowulf.r5.edit.vu"); e1=g.findObject("neowulf.r5.edit.deck1");
  e2=g.findObject("neowulf.r5.edit.deck2"); e3=g.findObject("neowulf.r5.edit.deck3");
  eSL=g.findObject("neowulf.r5.edit.speaker.left"); eSR=g.findObject("neowulf.r5.edit.speaker.right");
  eVuA=g.findObject("neowulf.r5.edit.vu.attack"); eVuR=g.findObject("neowulf.r5.edit.vu.release");
  eSpA=g.findObject("neowulf.r5.edit.speaker.attack"); eSpR=g.findObject("neowulf.r5.edit.speaker.release");
  saveBtn=g.findObject("neowulf.r5.button.save"); resetBtn=g.findObject("neowulf.r5.button.reset");
  titleBtn=g.findObject("neowulf.r5.button.titles"); d1Btn=g.findObject("neowulf.r5.button.deck1");
  d2Btn=g.findObject("neowulf.r5.button.deck2"); d3Btn=g.findObject("neowulf.r5.button.deck3");
  statusText=g.findObject("neowulf.r5.status"); titleState=g.findObject("neowulf.r5.state.titles");
  d1State=g.findObject("neowulf.r5.state.deck1"); d2State=g.findObject("neowulf.r5.state.deck2");
  d3State=g.findObject("neowulf.r5.state.deck3");
  loadAll();
}

loadAll() {
  eMain.setText(getPrivateString("NEOWULF R5","title.main","NEOWULF"));
  eScope.setText(getPrivateString("NEOWULF R5","title.scope","SPECTROSCOPE"));
  eEq.setText(getPrivateString("NEOWULF R5","title.eq","EQUALIZER"));
  eFrg.setText(getPrivateString("NEOWULF R5","title.frg","FREQUENCY RESPONSE"));
  eVu.setText(getPrivateString("NEOWULF R5","title.vu","DIGITAL VU // LEFT + RIGHT"));
  e1.setText(getPrivateString("NEOWULF R5","title.deck1","OSCILLOSCOPE // WIDE"));
  e2.setText(getPrivateString("NEOWULF R5","title.deck2","OSCILLOSCOPE // SOLID"));
  e3.setText(getPrivateString("NEOWULF R5","title.deck3","SPECTRAL FIRE"));
  eSL.setText(getPrivateString("NEOWULF R5","title.speaker.left","TEUFEL // MK ULTRA"));
  eSR.setText(getPrivateString("NEOWULF R5","title.speaker.right","TEUFEL // MK ULTRA"));
  eVuA.setText(integerToString(getPrivateInt("NEOWULF R5","vu.attack",6)));
  eVuR.setText(integerToString(getPrivateInt("NEOWULF R5","vu.release",2)));
  eSpA.setText(integerToString(getPrivateInt("NEOWULF R5","speaker.attack",6)));
  eSpR.setText(integerToString(getPrivateInt("NEOWULF R5","speaker.release",3)));
  refreshStates();
  statusText.setText("Backend configuration loaded");
}

saveAll() {
  setPrivateString("NEOWULF R5","title.main",eMain.getText());
  setPrivateString("NEOWULF R5","title.scope",eScope.getText());
  setPrivateString("NEOWULF R5","title.eq",eEq.getText());
  setPrivateString("NEOWULF R5","title.frg",eFrg.getText());
  setPrivateString("NEOWULF R5","title.vu",eVu.getText());
  setPrivateString("NEOWULF R5","title.deck1",e1.getText());
  setPrivateString("NEOWULF R5","title.deck2",e2.getText());
  setPrivateString("NEOWULF R5","title.deck3",e3.getText());
  setPrivateString("NEOWULF R5","title.speaker.left",eSL.getText());
  setPrivateString("NEOWULF R5","title.speaker.right",eSR.getText());
  setPrivateInt("NEOWULF R5","vu.attack",stringToInteger(eVuA.getText()));
  setPrivateInt("NEOWULF R5","vu.release",stringToInteger(eVuR.getText()));
  setPrivateInt("NEOWULF R5","speaker.attack",stringToInteger(eSpA.getText()));
  setPrivateInt("NEOWULF R5","speaker.release",stringToInteger(eSpR.getText()));
  statusText.setText("Saved; runtime scripts apply changes automatically");
}

refreshStates() {
  if(getPrivateInt("NEOWULF R5","titles.visible",1)) titleState.setText("ON"); else titleState.setText("OFF");
  d1State.setText(getPrivateString("NEOWULF R5","deck1.oscstyle","lines"));
  d2State.setText(getPrivateString("NEOWULF R5","deck2.oscstyle","solid"));
  if(getPrivateInt("NEOWULF R5","deck3.peaks",1)) d3State.setText("PEAKS ON"); else d3State.setText("PEAKS OFF");
}
String nextStyle(String s) {
  if(s=="lines") return "dots";
  if(s=="dots") return "solid";
  return "lines";
}

saveBtn.onLeftClick() { saveAll(); refreshStates(); }
resetBtn.onLeftClick() {
  setPrivateString("NEOWULF R5","title.main","NEOWULF");
  setPrivateString("NEOWULF R5","title.scope","SPECTROSCOPE");
  setPrivateString("NEOWULF R5","title.eq","EQUALIZER");
  setPrivateString("NEOWULF R5","title.frg","FREQUENCY RESPONSE");
  setPrivateString("NEOWULF R5","title.vu","DIGITAL VU // LEFT + RIGHT");
  setPrivateString("NEOWULF R5","title.deck1","OSCILLOSCOPE // WIDE");
  setPrivateString("NEOWULF R5","title.deck2","OSCILLOSCOPE // SOLID");
  setPrivateString("NEOWULF R5","title.deck3","SPECTRAL FIRE");
  setPrivateString("NEOWULF R5","title.speaker.left","TEUFEL // MK ULTRA");
  setPrivateString("NEOWULF R5","title.speaker.right","TEUFEL // MK ULTRA");
  setPrivateInt("NEOWULF R5","titles.visible",1);
  setPrivateString("NEOWULF R5","deck1.oscstyle","lines");
  setPrivateString("NEOWULF R5","deck2.oscstyle","solid");
  setPrivateInt("NEOWULF R5","deck3.peaks",1);
  setPrivateInt("NEOWULF R5","vu.attack",6); setPrivateInt("NEOWULF R5","vu.release",2);
  setPrivateInt("NEOWULF R5","speaker.attack",6); setPrivateInt("NEOWULF R5","speaker.release",3);
  loadAll(); statusText.setText("Defaults restored");
}
titleBtn.onLeftClick() {
  int v=getPrivateInt("NEOWULF R5","titles.visible",1);
  if(v)setPrivateInt("NEOWULF R5","titles.visible",0); else setPrivateInt("NEOWULF R5","titles.visible",1);
  refreshStates();
}
d1Btn.onLeftClick() {
  String s=getPrivateString("NEOWULF R5","deck1.oscstyle","lines");
  setPrivateString("NEOWULF R5","deck1.oscstyle",nextStyle(s)); refreshStates();
}
d2Btn.onLeftClick() {
  String s=getPrivateString("NEOWULF R5","deck2.oscstyle","solid");
  setPrivateString("NEOWULF R5","deck2.oscstyle",nextStyle(s)); refreshStates();
}
d3Btn.onLeftClick() {
  int p=getPrivateInt("NEOWULF R5","deck3.peaks",1);
  if(p)setPrivateInt("NEOWULF R5","deck3.peaks",0); else setPrivateInt("NEOWULF R5","deck3.peaks",1);
  refreshStates();
}

