#!/usr/bin/env python3
"""NEOWULF v6 R4.1 runtime refinement.

Winamp Modern uses fixed logical pixel layouts, so runtime images stay at their
native geometry. Artwork is rendered at 8x truecolor resolution (for example
638x246 -> 5104x1968), then Lanczos-downsampled to 32-bit RGBA PNGs.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import argparse, math, random, re

S=8

def F(size,bold=False):
    p="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p,size) if Path(p).exists() else ImageFont.load_default()

def down(im,size): return im.resize(size,Image.Resampling.LANCZOS)

def leds(png):
    out=Image.new("RGBA",(30,294),(0,0,0,0))
    offs=[0,33,66,99,132,165,198,231,264]
    cols=[None,None,(45,48,50),(245,236,220),(248,250,255),(255,96,73),(255,252,248),(255,35,18),(255,145,34)]
    for idx,y0 in enumerate(offs):
        fr=Image.new("RGBA",(30*S,30*S),(0,0,0,0)); d=ImageDraw.Draw(fr,"RGBA"); cy=15*S
        if idx>=2:
            d.rounded_rectangle((6*S,cy-2*S,24*S,cy+2*S),radius=2*S,fill=(1,2,3,105),outline=(118,125,130,45),width=max(1,S//2))
            if idx>2:
                c=cols[idx]; g=Image.new("RGBA",fr.size,(0,0,0,0)); gd=ImageDraw.Draw(g,"RGBA")
                gd.rounded_rectangle((7*S,cy-3*S,23*S,cy+3*S),radius=3*S,fill=(*c,90))
                g=g.filter(ImageFilter.GaussianBlur(2.2*S)); fr=Image.alpha_composite(fr,g); d=ImageDraw.Draw(fr,"RGBA")
                core=(255,255,255,245) if idx in (4,6) else (*c,245)
                d.rounded_rectangle((8*S,cy-S,22*S,cy+S),radius=S,fill=(*c,245))
                d.line((9*S,cy,21*S,cy),fill=core,width=max(1,S//2))
            else:
                d.line((8*S,cy,22*S,cy),fill=(52,57,60,130),width=max(1,S//2))
        out.alpha_composite(down(fr,(30,30)),(0,y0))
    out.save(png/"led.png",optimize=True)

def power(png):
    out=Image.new("RGBA",(44,43),(0,0,0,0))
    for on,y0 in ((False,0),(True,23)):
        fr=Image.new("RGBA",(44*S,20*S),(0,0,0,0)); d=ImageDraw.Draw(fr,"RGBA"); cy=10*S
        d.rounded_rectangle((6*S,cy-2*S,38*S,cy+2*S),radius=2*S,fill=(1,2,3,115),outline=(112,120,126,40),width=max(1,S//2))
        if on:
            g=Image.new("RGBA",fr.size,(0,0,0,0)); gd=ImageDraw.Draw(g,"RGBA")
            gd.rounded_rectangle((8*S,cy-3*S,36*S,cy+3*S),radius=3*S,fill=(255,25,10,95))
            fr=Image.alpha_composite(fr,g.filter(ImageFilter.GaussianBlur(2.5*S))); d=ImageDraw.Draw(fr,"RGBA")
            d.rounded_rectangle((9*S,cy-S,35*S,cy+S),radius=S,fill=(255,34,16,245))
            d.line((11*S,cy,33*S,cy),fill=(255,214,198,235),width=max(1,S//2))
        else:
            d.line((10*S,cy,34*S,cy),fill=(48,52,55,125),width=max(1,S//2))
        out.alpha_composite(down(fr,(44,20)),(0,y0))
    out.save(png/"power-indicator.png",optimize=True)

def fire_frame(level,phase,side):
    w,h=236,104; sc=4; W,H=w*sc,h*sc
    im=Image.new("RGBA",(W,H),(0,0,0,0)); glow=Image.new("RGBA",(W,H),(0,0,0,0))
    d=ImageDraw.Draw(im,"RGBA"); gd=ImageDraw.Draw(glow,"RGBA")
    rng=random.Random(0xF10000+level*31+phase*997+(0 if side=="L" else 50000))
    n=36; left=6*sc; right=(w-6)*sc; gap=(right-left)/n; bw=max(2*sc,int(gap*.48))
    maxh=(h-20)*sc*(level/39.0); y0=(h-12)*sc
    for i in range(n):
        wave=.58+.24*math.sin(i*.61+phase*1.7+level*.07)+.12*math.sin(i*1.43+phase*.91)+rng.uniform(-.10,.10)
        bh=max(0,int(maxh*max(.10,min(1,wave)))); x=int(left+(i+.5)*gap-bw/2); top=y0-bh
        if not bh: continue
        gd.rounded_rectangle((x-sc,top-sc,x+bw+sc,y0+sc),radius=sc,fill=(255,22,8,38))
        seg=3*sc; sep=sc; y=y0-seg
        while y>=top:
            t=(y0-y)/max(1,bh)
            col=(255,252,248,252) if t>.90 else (255,116,70,248) if t>.74 else (255,47,25,244) if t>.42 else (186,9,5,235)
            d.rounded_rectangle((x,y,x+bw,y+seg-1),radius=max(1,sc//2),fill=col)
            if t>.88: d.line((x+sc,y,x+bw-sc,y),fill=(255,255,255,235),width=max(1,sc//2))
            y-=seg+sep
    return down(Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(2.4*sc)),im),(w,h))

def vu_fire(png):
    atlas=Image.new("RGBA",(475,12480),(0,0,0,0))
    for level in range(40):
        for phase in range(3):
            idx=level*3+phase
            atlas.alpha_composite(fire_frame(level,phase,"L"),(0,idx*104))
            atlas.alpha_composite(fire_frame(level,(phase+1)%3,"R"),(239,idx*104))
    atlas.save(png/"neowulf-vu-fire-r4.png",optimize=True,compress_level=9)

def mirror_speakers(png):
    L=Image.open(png/"neowulf-ls-tower-left-r4.png").convert("RGBA")
    L.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(png/"neowulf-ls-tower-right-r4.png",optimize=True)
    ld=Image.open(png/"neowulf-ls-driver-left-r4.png").convert("RGBA"); out=Image.new("RGBA",ld.size,(0,0,0,0))
    for i in range(ld.width//150):
        out.alpha_composite(ld.crop((i*150,0,(i+1)*150,ld.height)).transpose(Image.Transpose.FLIP_LEFT_RIGHT),(i*150,0))
    out.save(png/"neowulf-ls-driver-right-r4.png",optimize=True)

OSC_XML='''<!-- NEOWULF R4.1: three native audio-data oscillator decks, all visible on first load -->
<groupdef id="neowulf.osc.deck1.group">
  <Layer x="0" y="0" image="neowulf.osc.deck1.component.r4"/>
  <Vis x="69" y="37" w="500" h="128" id="neowulf.osc.deck1.vis" channel="3" mode="2" fps="60" oscstyle="lines" colorosc1="#FFFDFC" colorosc2="#FF8A70" colorosc3="#FF3A20" colorosc4="#C6170C" colorosc5="#5B0704"/>
  <button:close x="-64" y="12" relatx="1" id="button.close"/>
</groupdef>
<Container default_x="660" default_y="0" default_w="638" default_h="208" default_visible="1" id="neowulf.oscillator.deck.fire.wide.r41" name="NEOWULF Oscillator // Fire Wide"><Layout x="660" y="0" w="638" h="208" id="normal" alphabackground="sa.background.alpha"><Group fitparent="1" id="neowulf.osc.deck1.group"/></Layout></Container>
<groupdef id="neowulf.osc.deck2.group">
  <Layer x="0" y="0" image="neowulf.osc.deck2.component.r4"/>
  <Vis x="69" y="38" w="500" h="66" id="neowulf.osc.deck2.left" channel="1" mode="2" fps="60" oscstyle="lines" colorosc1="#FFFDFC" colorosc2="#FF8A70" colorosc3="#FF3A20" colorosc4="#C6170C" colorosc5="#5B0704"/>
  <Vis x="69" y="120" w="500" h="66" id="neowulf.osc.deck2.right" channel="2" mode="2" fps="60" oscstyle="lines" fliph="1" colorosc1="#FFFDFC" colorosc2="#FF8A70" colorosc3="#FF3A20" colorosc4="#C6170C" colorosc5="#5B0704"/>
  <button:close x="-64" y="12" relatx="1" id="button.close"/>
</groupdef>
<Container default_x="660" default_y="220" default_w="638" default_h="246" default_visible="1" id="neowulf.oscillator.deck.dual.lr.r41" name="NEOWULF Oscillator // Dual L-R"><Layout x="660" y="220" w="638" h="246" id="normal" alphabackground="eq.background.alpha"><Group fitparent="1" id="neowulf.osc.deck2.group"/></Layout></Container>
<groupdef id="neowulf.osc.deck3.group">
  <Layer x="0" y="0" image="neowulf.osc.deck3.component.r4"/>
  <Vis x="69" y="38" w="236" h="136" id="neowulf.osc.deck3.left" channel="1" mode="2" fps="60" oscstyle="lines" colorosc1="#FFFDFC" colorosc2="#FF8A70" colorosc3="#FF3A20" colorosc4="#C6170C" colorosc5="#5B0704"/>
  <Vis x="333" y="38" w="236" h="136" id="neowulf.osc.deck3.right" channel="2" mode="2" fps="60" oscstyle="lines" fliph="1" colorosc1="#FFFDFC" colorosc2="#FF8A70" colorosc3="#FF3A20" colorosc4="#C6170C" colorosc5="#5B0704"/>
  <button:close x="-64" y="12" relatx="1" id="button.close"/>
</groupdef>
<Container default_x="660" default_y="480" default_w="638" default_h="246" default_visible="1" id="neowulf.oscillator.deck.twin.mirror.r41" name="NEOWULF Oscillator // Twin Mirror"><Layout x="660" y="480" w="638" h="246" id="normal" alphabackground="eq.background.alpha"><Group fitparent="1" id="neowulf.osc.deck3.group"/></Layout></Container>
'''

def patch_xml(root):
    vu=root/"XML/vu-meter-analog.xml"; t=vu.read_text(encoding="utf-8")
    t=re.sub(r'\s*<Group\s+x="82"\s+y="-70"\s+relaty="1"\s+id="group\.power\.indicator"\s*/>','',t)
    t=t.replace('name="VU Meter Digital L/R" nomenu="1"','name="NEOWULF Digital VU // L-R"').replace('default_visible="0" id="vu.meter.analog"','default_visible="1" id="vu.meter.analog"')
    vu.write_text(t,encoding="utf-8")
    mdh=root/"XML/vu-meter-digital-horizontal.xml"; t=mdh.read_text(encoding="utf-8")
    t=re.sub(r'\s*<Group\s+x="82"\s+y="-70"\s+relaty="1"\s+id="group\.power\.indicator"\s*/>','',t); mdh.write_text(t,encoding="utf-8")
    (root/"XML/neowulf-oscillator-decks.xml").write_text(OSC_XML,encoding="utf-8")
    skin=root/"skin.xml"; s=skin.read_text(encoding="utf-8").replace("NEOWULF v6 R4 Ultra Detail","NEOWULF v6 R4.1 Ultra Detail"); skin.write_text(s,encoding="utf-8")

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("skin_root",type=Path); a=ap.parse_args(); root=a.skin_root; png=root/"PNG"
    leds(png); power(png); vu_fire(png); mirror_speakers(png); patch_xml(root)
    print("NEOWULF R4.1 runtime refinement applied")

if __name__=="__main__": main()
