#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import re, sys
root=Path(sys.argv[1])
err=[]
def need(cond,msg):
    if not cond: err.append(msg)

mp=(root/'XML/main-player.xml').read_text(encoding='utf-8')
sa=(root/'XML/spectrum-analyzer.xml').read_text(encoding='utf-8')
gm=(root/'XML/gammaset.xml').read_text(encoding='utf-8')
for name,text in [('main-player',mp),('spectrum-analyzer',sa)]:
    need(text.count('bandwidth="thin"')>=2, f'{name}: both visualizers must be thin/75-band')
    need(text.count('fps="60"')>=2, f'{name}: both visualizers must request 60 fps')
    need(text.count('mode="1"')>=2, f'{name}: spectrum mode must be default')
    need(text.count('peaks="1"')>=2, f'{name}: peak hold missing')
    for old in ('#188408','#299400','#29ce10','#32be10','#39b510','#94de21','#bdde29'):
        need(old.lower() not in text.lower(), f'{name}: old green palette remains: {old}')

for lid in ('mp.layer.vis.classic.bars','mp.layer.vis.modern.bars','mp.layer.vis.classic.cover','mp.layer.vis.modern.cover'):
    m=re.search(r'<Layer(?:(?!/>).)*id="'+re.escape(lid)+r'"(?:(?!/>).)*?/>',mp,re.S|re.I)
    need(bool(m and re.search(r'alpha="0"',m.group(0))), f'{lid}: fake bar/cover layer not disabled')
for lid in ('sa.layer.vis.classic.bars','sa.layer.vis.modern.bars','sa.layer.vis.classic.cover','sa.layer.vis.modern.cover'):
    m=re.search(r'<Layer(?:(?!/>).)*id="'+re.escape(lid)+r'"(?:(?!/>).)*?/>',sa,re.S|re.I)
    need(bool(m and re.search(r'alpha="0"',m.group(0))), f'{lid}: fake bar/cover layer not disabled')

for gid,val in {
 'gamma.display.background':'-3904,-3904,-3904',
 'gamma.display.grid':'1152,-3520,-3776',
 'gamma.main.player.visualizer':'1664,-3264,-3552',
 'gamma.miscellaneous.spectrum.analyzer':'1664,-3264,-3552',
}.items():
    need(re.search(r'id="'+re.escape(gid)+r'"\s+value="'+re.escape(val)+r'"',gm) is not None, f'{gid}: unexpected gamma')

for fn in ('display-elements.png','mp-vis-elements.png','sa-vis-elements.png'):
    p=root/'PNG'/fn
    need(p.exists(),f'missing {fn}')
    if p.exists():
        im=Image.open(p).convert('RGBA')
        sample=[im.getpixel((x,y)) for y in range(min(4,im.height)) for x in range(min(4,im.width))]
        need(max(max(px[:3]) for px in sample)<=10,f'{fn}: background tile is not black')

profile=root/'SCRIPTS'/'neowulf-vis-profile.maki'
if profile.exists():
    need(profile.read_bytes().startswith(b'FG'), 'neowulf-vis-profile.maki: invalid MAKI signature')
    need('neowulf-vis-profile.maki' in mp and 'param="mp"' in mp, 'main-player: profile runtime not wired')
    need('neowulf-vis-profile.maki' in sa and 'param="sa"' in sa, 'spectrum-analyzer: profile runtime not wired')

for n in ('neowulf-vrp-rotation.maki','neowulf-speaker.maki','neowulf-vu-40.maki'):
    p=root/'SCRIPTS'/n
    need(p.exists(),f'missing {n}')
    if p.exists(): need(p.read_bytes().startswith(b'FG'),f'{n}: invalid MAKI signature')

need((root/'NEOWULF-DISPLAY-NOTES.txt').exists(),'display notes missing')

if err:
    print('NEOWULF DISPLAY VALIDATION FAILED')
    for e in err: print(' -',e)
    raise SystemExit(1)
print('NEOWULF DISPLAY VALIDATION OK')
print(' - native audio-driven spectrum mode')
print(' - thin/75-band profile, 60 fps request')
print(' - no green analyzer palette')
print(' - static fake bars disabled')
print(' - near-black display substrate and restrained red glow')
print(' - runtime profile wiring validated when compiled MAKI is present')
