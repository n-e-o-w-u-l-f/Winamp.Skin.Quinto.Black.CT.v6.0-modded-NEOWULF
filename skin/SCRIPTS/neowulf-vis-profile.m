#include <lib/std.mi>

Global Group g;
Global Vis visClassic, visModern;
Global Timer reapply;
Global String target;
Global Int passes;

Function applyProfile();
Function applyVis(Vis v);

System.onScriptLoaded()
{
  g = getScriptGroup();
  target = getParam();

  if (target == "sa")
  {
    visClassic = g.findObject("sa.vis.classic");
    visModern  = g.findObject("sa.vis.modern");
  }
  else
  {
    visClassic = g.findObject("mp.vis.classic");
    visModern  = g.findObject("mp.vis.modern");
  }

  passes = 0;
  reapply = new Timer;
  reapply.setDelay(200);
  reapply.start();
  applyProfile();
}

System.onScriptUnloading()
{
  reapply.stop();
  delete reapply;
}

reapply.onTimer()
{
  applyProfile();
  passes++;
  if (passes > 24) reapply.stop();
}

applyProfile()
{
  if (visClassic) applyVis(visClassic);
  if (visModern) applyVis(visModern);
}

applyVis(Vis v)
{
  v.setMode(1);
  v.setXmlParam("bandwidth", "thin");
  v.setXmlParam("fps", "60");
  v.setXmlParam("coloring", "normal");
  v.setXmlParam("peaks", "1");
  v.setXmlParam("falloff", "2");
  v.setXmlParam("peakfalloff", "2");
  v.setXmlParam("colorbandpeak", "217,104,50");

  v.setXmlParam("colorband1", "54,4,4");
  v.setXmlParam("colorband2", "72,5,5");
  v.setXmlParam("colorband3", "90,6,5");
  v.setXmlParam("colorband4", "109,8,6");
  v.setXmlParam("colorband5", "129,10,7");
  v.setXmlParam("colorband6", "149,13,8");
  v.setXmlParam("colorband7", "170,17,10");
  v.setXmlParam("colorband8", "190,23,12");
  v.setXmlParam("colorband9", "211,32,15");
  v.setXmlParam("colorband10", "230,42,18");
  v.setXmlParam("colorband11", "242,57,21");
  v.setXmlParam("colorband12", "247,74,25");
  v.setXmlParam("colorband13", "250,94,32");
  v.setXmlParam("colorband14", "252,117,43");
  v.setXmlParam("colorband15", "254,151,65");
  v.setXmlParam("colorband16", "255,196,106");

  v.setXmlParam("colorosc1", "184,48,36");
  v.setXmlParam("colorosc2", "155,37,29");
  v.setXmlParam("colorosc3", "127,27,23");
  v.setXmlParam("colorosc4", "100,19,16");
  v.setXmlParam("colorosc5", "72,12,11");
}
