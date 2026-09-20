#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageChops
import sys, statistics
root=Path(sys.argv[1]); errors=[]
def need(c,m):
    if not c: errors.append(m)
for rel in ["PNG/led.png","PNG/power-indicator.png","PNG/neowulf-vu-fire-r4.png","PNG/neowulf-vu-lr-component-r4.png","PNG/neowulf-osc-deck1-r4.png","PNG/neowulf-osc-deck2-r4.png","PNG/neowulf-osc-deck3-r4.png","PNG/neowulf-ls-tower-left-r4.png","PNG/neowulf-ls-tower-right-r4.png"]:
    p=root/rel; need(p.exists(),f"missing {rel}")
    if p.exists(): need(Image.open(p).mode=="RGBA",f"{rel}: not RGBA truecolor")
led=Image.open(root/"PNG/led.png").convert("RGBA")
need(led.crop((0,0,30,30)).getbbox() is None,"LED background frame is not transparent")
need(led.crop((0,33,30,63)).getbbox() is None,"LED blue-background frame is not transparent")
bb=led.crop((0,231,30,261)).getbbox(); need(bb is not None and bb[3]-bb[1]<=18,"red LED is too tall/round")
vu=(root/"XML/vu-meter-analog.xml").read_text(encoding="utf-8")
need("group.power.indicator" not in vu,"legacy framed power lamp remains in digital VU")
need('default_visible="1"' in vu,"digital L/R VU is not visible on first load")
fa=Image.open(root/"PNG/neowulf-vu-fire-r4.png").convert("RGBA"); need(fa.size==(475,12480),f"wrong VU atlas {fa.size}")
fr=fa.crop((0,119*104,236,120*104)); px=list(fr.getdata())
need(sum(1 for r,g,b,a in px if a>150 and r>200 and g<130)>100,"VU lacks bright red response")
need(sum(1 for r,g,b,a in px if a>180 and r>240 and g>220 and b>210)>15,"VU lacks white-hot tips")
osc=(root/"XML/neowulf-oscillator-decks.xml").read_text(encoding="utf-8")
need(osc.count('default_visible="1"')==3,"three oscillator decks are not visible by default")
need(osc.count("<Vis ")==5 and 'channel="1"' in osc and 'channel="2"' in osc and 'channel="3"' in osc,"native oscillator routing incomplete")
for name,box in [("neowulf-osc-deck1-r4.png",(80,55,558,150)),("neowulf-osc-deck2-r4.png",(80,48,558,94)),("neowulf-osc-deck3-r4.png",(80,48,294,160))]:
    vals=[max(p[:3]) for p in Image.open(root/"PNG"/name).convert("RGBA").crop(box).getdata()]
    need(statistics.mean(vals)<8,f"{name}: glass not black")
L=Image.open(root/"PNG/neowulf-ls-tower-left-r4.png").convert("RGBA"); R=Image.open(root/"PNG/neowulf-ls-tower-right-r4.png").convert("RGBA")
need(L.size==(298,1044) and R.size==(298,1044),"speaker towers are not 298x1044")
need(ImageChops.difference(L.transpose(Image.Transpose.FLIP_LEFT_RIGHT),R).getbbox() is None,"right tower is not an exact mirror")
vrp=(root/"XML/vinyl-record-player.xml").read_text(encoding="utf-8")
need(vrp.find('id="vrp.layer.vinyl"') < vrp.find('id="vrp.layer.fixed.reflection"') < vrp.find('id="vrp.layer.tonearm"'),"LP fixed-light layer order broken")
if errors:
    print("NEOWULF R4.1 VALIDATION FAILED")
    for e in errors: print(" -",e)
    raise SystemExit(1)
print("NEOWULF R4.1 VALIDATION OK")
