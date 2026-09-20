#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import argparse, re, shutil

PALETTE = [
    '#360404', '#480505', '#5A0605', '#6D0806',
    '#810A07', '#950D08', '#AA110A', '#BE170C',
    '#D3200F', '#E62A12', '#F23915', '#F74A19',
    '#FA5E20', '#FC752B', '#FE9741', '#FFC46A',
]
OSC = ['#B83024', '#9B251D', '#7F1B17', '#641310', '#480C0B']
PEAK = '#D96832'


def ensure_profile_script(text: str, param: str, anchor: str) -> str:
    tag = f'<script file="SCRIPTS\\neowulf-vis-profile.maki" param="{param}"/>'
    if 'neowulf-vis-profile.maki' in text:
        return text
    if anchor not in text:
        raise RuntimeError(f'profile script anchor not found: {anchor}')
    block = '\t<!-- NEOWULF native audio-driven analyzer profile / startup-race protection -->\n\t' + tag + '\n\t'
    return text.replace(anchor, block + anchor, 1)

def install_profile_runtime(root: Path, runtime_dir: Path) -> bool:
    compiled = runtime_dir / 'neowulf-vis-profile.maki'
    source = runtime_dir / 'neowulf-vis-profile.m'
    if not compiled.exists():
        return False
    dst = root / 'SCRIPTS'
    dst.mkdir(parents=True, exist_ok=True)
    shutil.copy2(compiled, dst / compiled.name)
    if source.exists():
        shutil.copy2(source, dst / source.name)
    return True

def replace_vis_block(text: str, vis_id: str) -> str:
    pat = re.compile(r'(<Vis\s+[^>]*?\bid="' + re.escape(vis_id) + r'"[^>]*?)(/>)', re.I | re.S)
    m = pat.search(text)
    if not m:
        raise RuntimeError(f'Vis block not found: {vis_id}')
    block = m.group(1)
    names = ['mode','bandwidth','fps','coloring','peaks','falloff','peakfalloff','colorbandpeak','colorallbands','colorallosc']
    names += [f'colorband{i}' for i in range(1,17)]
    names += [f'colorosc{i}' for i in range(1,6)]
    for name in names:
        block = re.sub(r'\s+' + re.escape(name) + r'\s*=\s*"[^"]*"', '', block, flags=re.I)
    attrs = [
        'mode="1"',
        'bandwidth="thin"',
        'fps="60"',
        'coloring="normal"',
        'peaks="1"',
        'falloff="2"',
        'peakfalloff="2"',
        f'colorbandpeak="{PEAK}"',
    ]
    attrs += [f'colorband{i}="{PALETTE[i-1]}"' for i in range(1,17)]
    attrs += [f'colorosc{i}="{OSC[i-1]}"' for i in range(1,6)]
    block += '\n\t\t' + '\n\t\t'.join(attrs)
    return text[:m.start()] + block + m.group(2) + text[m.end():]

def set_layer_alpha(text: str, layer_id: str, alpha: int) -> str:
    pat = re.compile(r'(<Layer\s+[^>]*?\bid="' + re.escape(layer_id) + r'"[^>]*?)(/>)', re.I | re.S)
    m = pat.search(text)
    if not m:
        raise RuntimeError(f'Layer not found: {layer_id}')
    block = re.sub(r'\s+alpha\s*=\s*"[^"]*"', '', m.group(1), flags=re.I)
    block += f'\n\t\talpha="{alpha}"'
    return text[:m.start()] + block + m.group(2) + text[m.end():]

def remap_display_tiles(p: Path) -> None:
    im = Image.open(p).convert('RGBA')
    px = im.load()
    for y in range(0, min(4, im.height)):
        for x in range(im.width):
            v = 2 + ((x * 3 + y * 5) % 4)
            px[x,y] = (v, v+1, v+1, 255)
    for y in range(7, min(11, im.height)):
        for x in range(im.width):
            a = 42 if ((x+y) & 1) == 0 else 24
            px[x,y] = (58, 7, 6, a)
    im.save(p)

def remap_vis_atlas(p: Path) -> None:
    im = Image.open(p).convert('RGBA')
    px = im.load()
    w,h = im.size
    for y in range(0, min(4,h)):
        for x in range(w):
            a = px[x,y][3]
            if a:
                v = 2 + ((x*7 + y*11) % 5)
                px[x,y] = (v,v+1,v+1,a)
    for y in range(7, min(11,h)):
        for x in range(w):
            old = px[x,y]
            if old[3]: px[x,y] = (46,5,4,min(old[3],30))
    for y in range(14,h):
        for x in range(w):
            old = px[x,y]
            if old[3]: px[x,y] = (50,6,5,min(old[3],34))
    im.save(p)

def micrograin_component(p: Path) -> None:
    im = Image.open(p).convert('RGBA')
    px = im.load(); w,h=im.size
    for y in range(h):
        delta = ((y * 37) % 7) - 3
        for x in range(w):
            r,g,b,a = px[x,y]
            if not a: continue
            lum = (r*3 + g*6 + b) // 10
            if lum < 5: continue
            d = delta + (1 if ((x*13 + y*5) % 29 == 0) else 0)
            px[x,y] = (max(0,min(255,r+d)), max(0,min(255,g+d)), max(0,min(255,b+d)), a)
    im.save(p)

def replace_gamma(text: str, gid: str, value: str) -> str:
    pat = re.compile(r'(<gammagroup\s+id="' + re.escape(gid) + r'"\s+value=")[^"]*(")', re.I)
    text2,n = pat.subn(r'\g<1>' + value + r'\g<2>', text, count=1)
    if n != 1: raise RuntimeError(f'gamma not found: {gid}')
    return text2

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('skin_root', type=Path)
    ap.add_argument('--runtime-dir', type=Path, help='Directory containing neowulf-vis-profile.maki/.m; defaults to repo skin/SCRIPTS')
    a=ap.parse_args(); root=a.skin_root
    runtime_dir = a.runtime_dir or (Path(__file__).resolve().parent.parent / 'skin' / 'SCRIPTS')
    runtime_installed = install_profile_runtime(root, runtime_dir)

    mp = root/'XML'/'main-player.xml'
    sa = root/'XML'/'spectrum-analyzer.xml'
    gm = root/'XML'/'gammaset.xml'

    mpt = mp.read_text(encoding='utf-8')
    sat = sa.read_text(encoding='utf-8')
    for vid in ('mp.vis.classic','mp.vis.modern'):
        mpt = replace_vis_block(mpt, vid)
    for lid in ('mp.layer.vis.classic.bars','mp.layer.vis.modern.bars','mp.layer.vis.classic.cover','mp.layer.vis.modern.cover'):
        mpt = set_layer_alpha(mpt,lid,0)
    for lid in ('mp.layer.vis.classic.grid','mp.layer.vis.modern.grid'):
        mpt = set_layer_alpha(mpt,lid,34)
    if runtime_installed:
        mpt = ensure_profile_script(mpt, 'mp', '<!-- VU METER: if activated -->')
    for lid,alpha in [('mp.layer.display.grid',48)]:
        mpt = set_layer_alpha(mpt,lid,alpha)
    mp.write_text(mpt,encoding='utf-8')

    for vid in ('sa.vis.classic','sa.vis.modern'):
        sat = replace_vis_block(sat, vid)
    for lid in ('sa.layer.vis.classic.bars','sa.layer.vis.modern.bars','sa.layer.vis.classic.cover','sa.layer.vis.modern.cover'):
        sat = set_layer_alpha(sat,lid,0)
    for lid in ('sa.layer.vis.classic.grid','sa.layer.vis.modern.grid'):
        sat = set_layer_alpha(sat,lid,30)
    for lid,alpha in [('sa.layer.display.light',18),('sa.layer.light.reflection',28)]:
        sat = set_layer_alpha(sat,lid,alpha)
    if runtime_installed:
        sat = ensure_profile_script(sat, 'sa', '<!-- LIGHT - OVERLAY - FRAME - LIGHT REFLECTION -->')
    sa.write_text(sat,encoding='utf-8')

    gt=gm.read_text(encoding='utf-8')
    values={
        'gamma.display.background':'-3904,-3904,-3904',
        'gamma.display.grid':'1152,-3520,-3776',
        'gamma.display.text':'2304,-2464,-2816',
        'gamma.main.player.songinfo.text':'2304,-2624,-3008',
        'gamma.main.player.timer':'2464,-2624,-3040',
        'gamma.main.player.visualizer':'1664,-3264,-3552',
        'gamma.miscellaneous.spectrum.analyzer':'1664,-3264,-3552',
        'gamma.main.player.beat.visualization':'1856,-3136,-3488',
    }
    for k,v in values.items(): gt=replace_gamma(gt,k,v)
    gm.write_text(gt,encoding='utf-8')

    remap_display_tiles(root/'PNG'/'display-elements.png')
    remap_vis_atlas(root/'PNG'/'mp-vis-elements.png')
    remap_vis_atlas(root/'PNG'/'sa-vis-elements.png')
    micrograin_component(root/'PNG'/'component.png')

    note = root/'NEOWULF-DISPLAY-NOTES.txt'
    note.write_text(
        'NEOWULF v6 display/spectroscope profile\n'
        '- Native Winamp <Vis> spectrum analyzer is used; bars are driven by playback visualization data.\n'
        '- 75-band thin mode, 60 FPS request, peak hold and controlled falloff.\n'
        '- All green analyzer colors removed; 16-step dark-red to amber palette.\n'
        '- Static fake bar layers disabled so silence is visually silent.\n'
        '- Display substrate changed to near-black; red grid/reflection glow reduced.\n'
        '- Component atlas receives low-amplitude brushed-steel micrograin.\n'
        + ('- Compiled NEOWULF visualizer profile runtime installed and wired into main/SA XML.\n' if runtime_installed else '- Runtime MAKI not found; XML profile applied without startup-race enforcer.\n'),
        encoding='utf-8')

if __name__=='__main__': main()
