#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import argparse, math, random, re

LP_SIZE = 474
LP_FRAMES = 120
BANK = 60
SEED = 0x4E454F57


def clamp(v:int)->int:
    return 0 if v < 0 else 255 if v > 255 else v


def lerp(a, b, t):
    return a + (b-a)*t


def brushed_steel(size, dark=18, light=66, seed=SEED):
    w,h=size
    rnd=random.Random(seed)
    im=Image.new('RGBA',(w,h),(0,0,0,255))
    px=im.load()
    # Fine directional brushing: sub-pixel-scale row variation plus irregular
    # short streaks. Avoid periodic full-width bands.
    row_walk=0.0
    row_bias=[]
    for y in range(h):
        row_walk = row_walk*0.58 + rnd.uniform(-1.15,1.15)
        row_bias.append(row_walk + rnd.uniform(-0.65,0.65))
    for y in range(h):
        fy=y/max(1,h-1)
        base=lerp(dark+5, dark+11, fy)
        for x in range(w):
            fx=x/max(1,w-1)
            # broad machined-steel reflection, intentionally non-periodic
            spec=8.0*math.exp(-((fx-0.43)/0.34)**2)
            edge=-3.2*abs(fx-0.5)*2.0
            # micrograin changes pixel-to-pixel but remains horizontally directional
            micro=1.2*math.sin(x*0.071 + y*0.017) + 0.75*math.sin(x*0.019 + y*0.133)
            micro += rnd.uniform(-0.75,0.75)
            v=clamp(int(base+spec+edge+row_bias[y]+micro))
            px[x,y]=(v,v+1,v+2,255)
    d=ImageDraw.Draw(im,'RGBA')
    # sparse short hairline brush marks rather than full-width stripes
    for _ in range(max(24,(w*h)//14000)):
        y=rnd.randrange(3,max(4,h-3))
        x0=rnd.randrange(0,max(1,w-24))
        ln=rnd.randrange(12,max(13,min(w-x0,110)))
        a=rnd.randrange(5,13)
        c=210 if rnd.random()>0.35 else 0
        d.line((x0,y,x0+ln,y),fill=(c,c,c,a),width=1)
    return im


def radial_record_base(size=LP_SIZE, scale=2):
    S=size*scale
    cx=cy=S//2
    r=S*0.487
    im=Image.new('RGBA',(S,S),(0,0,0,0))
    px=im.load()
    rnd=random.Random(SEED+1)
    # smooth radial body; no directional highlight is baked into the rotating disc.
    for y in range(S):
        dy=y-cy
        for x in range(S):
            dx=x-cx
            rr=(dx*dx+dy*dy)**0.5
            if rr>r: continue
            q=rr/r
            # black vinyl with shallow radial variation only
            base=8 + int(12*(1-q))
            ring=3.0*math.sin(rr*0.44)+1.7*math.sin(rr*0.13)
            v=clamp(int(base+ring))
            a=255
            if rr>r-2.5*scale:
                a=clamp(int(255*(r-rr)/(2.5*scale)))
            px[x,y]=(v,v+1,v+2,a)
    draw=ImageDraw.Draw(im,'RGBA')
    # fine concentric grooves, physically bound to the record but rotationally symmetric
    for rad in range(int(35*scale), int(r-8*scale), max(2,int(2.6*scale))):
        c=28 + ((rad//3)%11)
        a=22 + ((rad//5)%14)
        draw.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),outline=(c,c,c+2,a),width=1)
    # lead-in / run-out grooves
    for rad,color,a in [(int(r-9*scale),(95,96,97),70),(int(r-15*scale),(55,56,58),55),(int(90*scale),(55,20,17),70)]:
        draw.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),outline=(*color,a),width=max(1,scale))

    # red center label: dark, printed, not luminous
    lr=int(74*scale)
    label=Image.new('RGBA',(S,S),(0,0,0,0))
    ld=ImageDraw.Draw(label,'RGBA')
    for rad in range(lr,0,-1):
        t=rad/lr
        rr=int(lerp(76,152,1-t))
        gg=int(lerp(8,19,1-t))
        bb=int(lerp(8,14,1-t))
        ld.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),fill=(rr,gg,bb,255))
    # printed rings and microprint-like radial/tangential marks
    for rad in (lr-8*scale, lr-18*scale, 20*scale):
        ld.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),outline=(225,55,35,100),width=max(1,scale))
    # small print-like dashes around the label, not a decorative sunburst.
    for i in range(36):
        ang=math.radians(i*10 + (i%3)*0.8)
        r1=(42 + (i%3)*3)*scale
        arc=(2.2 + (i%4)*0.7)*scale
        x=cx+math.cos(ang)*r1; y=cy+math.sin(ang)*r1
        tx=-math.sin(ang)*arc; ty=math.cos(ang)*arc
        alpha=25+(i%5)*6
        ld.line((x-tx,y-ty,x+tx,y+ty),fill=(13,2,2,alpha),width=max(1,scale))
    # a few small label marks to make rotation perceptible, deliberately subtle
    for i in range(12):
        ang=math.radians(11+i*29)
        rad=(26+(i%4)*10)*scale
        x=cx+math.cos(ang)*rad; y=cy+math.sin(ang)*rad
        ld.ellipse((x-1.2*scale,y-1.2*scale,x+1.2*scale,y+1.2*scale),fill=(235,72,44,70))
    im=Image.alpha_composite(im,label)

    # sparse dust/fiber defects: these rotate with the physical vinyl; they are not lighting.
    draw=ImageDraw.Draw(im,'RGBA')
    for i in range(26):
        ang=rnd.random()*math.tau
        rad=(95+rnd.random()*120)*scale
        x=cx+math.cos(ang)*rad; y=cy+math.sin(ang)*rad
        length=(1.5+rnd.random()*5.0)*scale
        tx=-math.sin(ang)*length; ty=math.cos(ang)*length
        a=16+rnd.randrange(0,24)
        draw.line((x,y,x+tx,y+ty),fill=(145,145,145,a),width=max(1,scale//2))

    # center hole transparent/dark; the static spindle/shadow layer sits above it.
    hr=6*scale
    draw.ellipse((cx-hr,cy-hr,cx+hr,cy+hr),fill=(4,4,5,255))
    return im.resize((size,size),Image.Resampling.LANCZOS)


def rotate_disc(base:Image.Image, angle:float)->Image.Image:
    # BICUBIC keeps micro-groove detail; circular disc means no corner clipping.
    return base.rotate(angle,resample=Image.Resampling.BICUBIC,center=(LP_SIZE/2,LP_SIZE/2),expand=False)


def generate_lp_banks(outdir:Path):
    base=radial_record_base()
    base.save(outdir/'neowulf-lp-master.png', optimize=True, compress_level=9)
    frames=[]
    for i in range(LP_FRAMES):
        frames.append(rotate_disc(base, -360.0*i/LP_FRAMES))
    for bank in range(2):
        atlas=Image.new('RGBA',(LP_SIZE,LP_SIZE*BANK),(0,0,0,0))
        for i in range(BANK):
            atlas.alpha_composite(frames[bank*BANK+i],(0,i*LP_SIZE))
        atlas.save(outdir/f'neowulf-lp-rotation-120-{chr(97+bank)}.png', optimize=True, compress_level=9)


def fixed_reflection(size=LP_SIZE):
    S=size*2
    cx=cy=S//2
    r=S*0.485
    ov=Image.new('RGBA',(S,S),(0,0,0,0))
    # fixed warm reflection at upper-left/top, similar to reference but much subtler than old stripes.
    gloss=Image.new('RGBA',(S,S),(0,0,0,0))
    gd=ImageDraw.Draw(gloss,'RGBA')
    for k in range(18):
        rr=int((r-26-k*2)*1.0)
        bbox=(cx-rr, cy-rr*0.58-105, cx+rr, cy+rr*0.58+105)
        a=max(0,11-k//2)
        gd.arc(bbox,198,337,fill=(255,190,88,a),width=max(1,3))
    gloss=gloss.filter(ImageFilter.GaussianBlur(9))
    ov=Image.alpha_composite(ov,gloss)
    # fixed cool reflection band, broad and soft
    cool=Image.new('RGBA',(S,S),(0,0,0,0)); cd=ImageDraw.Draw(cool,'RGBA')
    cd.ellipse((58,280,360,780),fill=(205,220,230,12))
    cool=cool.filter(ImageFilter.GaussianBlur(45)); ov=Image.alpha_composite(ov,cool)
    # stylus red light pool fixed in deck coordinates. This MUST NOT be in the rotating LP frames.
    glow=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(glow,'RGBA')
    gx,gy=int(S*0.935),int(S*0.865)
    for rr,a in [(44,18),(29,33),(17,60),(8,105)]:
        d.ellipse((gx-rr,gy-rr,gx+rr,gy+rr),fill=(255,22,8,a))
    d.polygon([(gx-4,gy-2),(gx+18,gy+53),(gx+5,gy+58),(gx-9,gy+3)],fill=(255,25,8,60))
    glow=glow.filter(ImageFilter.GaussianBlur(10)); ov=Image.alpha_composite(ov,glow)
    # a fixed thin white glint on the bottom rim
    d=ImageDraw.Draw(ov,'RGBA')
    d.arc((cx-r+8,cy-r+8,cx+r-8,cy+r-8),62,111,fill=(215,225,232,52),width=3)
    return ov.resize((size,size),Image.Resampling.LANCZOS)


def rework_vrp_background(src:Path):
    original=Image.open(src).convert('RGBA')
    alpha=original.getchannel('A')
    w,h=original.size
    steel=brushed_steel((w,h),dark=10,light=38,seed=SEED+7)
    # vertical shaping: brighter deck around platter, darker right control bay
    shade=Image.new('RGBA',(w,h),(0,0,0,0)); sd=ImageDraw.Draw(shade,'RGBA')
    sd.rectangle((0,0,w,h),fill=(0,0,0,54))
    sd.rounded_rectangle((7,7,558,h-7),radius=8,fill=(18,19,20,24),outline=(155,161,165,45),width=1)
    sd.rectangle((553,0,w,h),fill=(0,0,0,92))
    sd.rounded_rectangle((8,8,w-58,h-8),radius=7,outline=(182,190,195,100),width=2)
    sd.rounded_rectangle((12,12,w-62,h-12),radius=6,outline=(0,0,0,170),width=2)
    # platter recess/ring; static silver/chrome border and dark inset
    cx,cy=277,277
    for rr,color,width in [(259,(2,3,4,230),6),(251,(185,194,201,140),2),(247,(10,11,12,220),5),(238,(125,132,137,80),1)]:
        sd.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),outline=color,width=width)
    # dark control bay on right
    sd.rounded_rectangle((575,28,666,516),radius=8,fill=(4,5,6,130),outline=(120,126,130,55),width=1)
    # minimal red status slots; no giant red wash
    for y in (242,262,282):
        sd.rounded_rectangle((615,y,644,y+8),radius=2,fill=(20,2,2,180),outline=(130,15,10,90),width=1)
    # screws
    for x,y in [(18,18),(653,18),(18,536),(653,536),(461,47)]:
        sd.ellipse((x-8,y-8,x+8,y+8),fill=(9,10,11,240),outline=(190,195,198,100),width=1)
        sd.line((x-4,y,x+4,y),fill=(180,185,188,90),width=1)
    # bottom plate / model caption
    sd.rectangle((322,515,653,538),fill=(2,3,4,80))
    sd.line((322,515,653,515),fill=(170,175,178,35),width=1)
    combined=Image.alpha_composite(steel,shade)
    combined.putalpha(alpha)
    combined.save(src,optimize=True,compress_level=9)


def rework_platter_table(src:Path):
    # Two 554x554 frames separated by 3px gap as in Quinto.
    W=H=554
    atlas=Image.new('RGBA',(W,1111),(0,0,0,0))
    for idx,play in enumerate((False,True)):
        im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im,'RGBA')
        cx=cy=277
        # fixed platter body visible beneath LP, reference-style machined black metal
        d.ellipse((15,15,539,539),fill=(4,5,6,245),outline=(155,164,171,150),width=2)
        d.ellipse((22,22,532,532),outline=(215,222,226,130),width=2)
        d.ellipse((28,28,526,526),outline=(15,16,18,255),width=6)
        # strobe dot rings are part of the platter and stay fixed in screen/deck space
        for ring,rad,count in [(0,250,132),(1,244,120)]:
            for i in range(count):
                a=math.tau*i/count
                x=cx+math.cos(a)*rad; y=cy+math.sin(a)*rad
                # fixed directional lighting; not animated with LP
                topness=(1-math.sin(a))*0.5
                base=95+int(85*topness)
                if play and (i%6==0):
                    col=(210,55,27,125)
                else:
                    col=(base,base+3,base+5,130)
                rr=1 if ring else 1.5
                d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=col)
        # lower fixed metal glint on platter rim
        d.arc((20,20,534,534),26,142,fill=(226,232,236,110),width=3)
        d.arc((25,25,529,529),206,331,fill=(255,93,44,50 if play else 28),width=2)
        # center hub shadow under existing 28x28 spindle layer
        d.ellipse((263,263,291,291),fill=(0,0,0,150))
        atlas.alpha_composite(im,(0,0 if idx==0 else 557))
    atlas.save(src,optimize=True,compress_level=9)


def tonearm_polish(src:Path):
    im=Image.open(src).convert('RGBA')
    px=im.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a==0: continue
            lum=(r*3+g*6+b)//10
            # preserve dark rubber/plastic, make silver parts cleaner and less red-tinted
            if lum>55:
                boost=12 + ((y*7+x*3)%5)
                nr=clamp(r+boost); ng=clamp(g+boost+2); nb=clamp(b+boost+4)
                px[x,y]=(nr,ng,nb,a)
            else:
                px[x,y]=(max(0,r-4),max(0,g-4),max(0,b-3),a)
    im.save(src,optimize=True,compress_level=9)


def add_bitmap(elements:str, bid:str, file:str)->str:
    if f'id="{bid}"' in elements:
        return elements
    tag=f'\n\t<bitmap id="{bid}" file="PNG\\{file}"/>\n'
    # insert immediately before closing WasabiXML root
    idx=elements.rfind('</elements>')
    if idx<0: raise RuntimeError('elements.xml has no </elements>')
    return elements[:idx]+tag+elements[idx:]


def wire_fixed_overlay(xml:str)->str:
    if 'vrp.layer.fixed.reflection' in xml:
        return xml
    pat=re.compile(r'(<AnimatedLayer\s+[^>]*?id="vrp\.layer\.vinyl"[^>]*?/>)',re.S|re.I)
    m=pat.search(xml)
    if not m: raise RuntimeError('vinyl AnimatedLayer not found')
    layer='''\n\t<!-- NEOWULF R3: lighting/reflections are fixed in deck coordinates, never baked into rotating vinyl -->\n\t<Layer\n\t\tx="40" y="40" w="474" h="474"\n\t\tid="vrp.layer.fixed.reflection"\n\t\timage="neowulf.vrp.fixed.reflection"\n\t\tghost="1"/>'''
    return xml[:m.end()]+layer+xml[m.end():]


def write_notes(root:Path):
    (root/'NEOWULF-TURNTABLE-NOTES.txt').write_text(
        'NEOWULF v6 R3 reference-design turntable\n'
        '- 120 unique LP rotation positions retained for smooth 33 1/3 and 45 RPM playback.\n'
        '- Rotating frames contain physical vinyl/label/dust only. No light beam, white glint or red reflection rotates with the disc.\n'
        '- Fixed lighting/reflections live in vrp.layer.fixed.reflection above the LP.\n'
        '- Removed decorative red sector/stripe graphics from the record.\n'
        '- Added fixed platter strobe rings and brushed Black Steel / machined metal chassis detail.\n'
        '- Tonearm remains a fixed layer; stylus glow is fixed to deck/tonearm geometry.\n',
        encoding='utf-8')


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('skin_root',type=Path)
    a=ap.parse_args(); root=a.skin_root
    png=root/'PNG'; xml=root/'XML'
    required=[png/'vrp.png',png/'vrp-table.png',png/'vrp-tonearm.png',xml/'elements.xml',xml/'vinyl-record-player.xml']
    missing=[str(p) for p in required if not p.exists()]
    if missing: raise SystemExit('missing required files: '+', '.join(missing))

    generate_lp_banks(png)
    fixed_reflection().save(png/'neowulf-vrp-fixed-reflection.png',optimize=True,compress_level=9)
    rework_vrp_background(png/'vrp.png')
    rework_platter_table(png/'vrp-table.png')
    tonearm_polish(png/'vrp-tonearm.png')

    ep=xml/'elements.xml'; et=ep.read_text(encoding='utf-8')
    et=add_bitmap(et,'neowulf.vrp.fixed.reflection','neowulf-vrp-fixed-reflection.png')
    ep.write_text(et,encoding='utf-8')
    vp=xml/'vinyl-record-player.xml'; vt=vp.read_text(encoding='utf-8')
    vt=wire_fixed_overlay(vt)
    vp.write_text(vt,encoding='utf-8')
    write_notes(root)

if __name__=='__main__':
    main()
