#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import subprocess, sys, tempfile

ROOT = Path(__file__).resolve().parents[1]
APPLY = ROOT / 'tools' / 'apply_neowulf_v6_display.py'
VALIDATE = ROOT / 'tools' / 'validate_neowulf_v6_display.py'

MP = '''<groupdef id="mp.group.main">
<Vis id="mp.vis.classic" mode="2" bandwidth="wide" fps="30" colorband1="#188408"/>
<Vis id="mp.vis.modern" mode="2" bandwidth="wide" fps="30" colorband1="#29ce10"/>
<Layer id="mp.layer.vis.classic.bars" alpha="255"/>
<Layer id="mp.layer.vis.modern.bars" alpha="255"/>
<Layer id="mp.layer.vis.classic.cover" alpha="255"/>
<Layer id="mp.layer.vis.modern.cover" alpha="255"/>
<Layer id="mp.layer.vis.classic.grid" alpha="255"/>
<Layer id="mp.layer.vis.modern.grid" alpha="255"/>
<Layer id="mp.layer.display.grid" alpha="255"/>
<!-- VU METER: if activated -->
</groupdef>'''

SA = '''<groupdef id="sa.group.main">
<Vis id="sa.vis.classic" mode="2" bandwidth="wide" fps="30" colorband1="#39b510"/>
<Vis id="sa.vis.modern" mode="2" bandwidth="wide" fps="30" colorband1="#94de21"/>
<Layer id="sa.layer.vis.classic.bars" alpha="255"/>
<Layer id="sa.layer.vis.modern.bars" alpha="255"/>
<Layer id="sa.layer.vis.classic.cover" alpha="255"/>
<Layer id="sa.layer.vis.modern.cover" alpha="255"/>
<Layer id="sa.layer.vis.classic.grid" alpha="255"/>
<Layer id="sa.layer.vis.modern.grid" alpha="255"/>
<Layer id="sa.layer.display.light" alpha="255"/>
<Layer id="sa.layer.light.reflection" alpha="255"/>
<!-- LIGHT - OVERLAY - FRAME - LIGHT REFLECTION -->
</groupdef>'''

GAMMA_IDS = [
    'gamma.display.background','gamma.display.grid','gamma.display.text',
    'gamma.main.player.songinfo.text','gamma.main.player.timer',
    'gamma.main.player.visualizer','gamma.miscellaneous.spectrum.analyzer',
    'gamma.main.player.beat.visualization',
]

def write_png(path: Path, size):
    Image.new('RGBA', size, (32, 32, 32, 255)).save(path)

def main():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        skin = base / 'skin'
        runtime = base / 'runtime'
        for d in (skin/'XML', skin/'PNG', skin/'SCRIPTS', runtime):
            d.mkdir(parents=True, exist_ok=True)
        (skin/'XML/main-player.xml').write_text(MP, encoding='utf-8')
        (skin/'XML/spectrum-analyzer.xml').write_text(SA, encoding='utf-8')
        gammas = '\n'.join(f'<gammagroup id="{gid}" value="0,0,0"/>' for gid in GAMMA_IDS)
        (skin/'XML/gammaset.xml').write_text(gammas, encoding='utf-8')
        write_png(skin/'PNG/display-elements.png', (4, 11))
        write_png(skin/'PNG/mp-vis-elements.png', (10, 52))
        write_png(skin/'PNG/sa-vis-elements.png', (54, 89))
        write_png(skin/'PNG/component.png', (32, 32))
        for name in ('neowulf-vrp-rotation.maki','neowulf-speaker.maki','neowulf-vu-40.maki'):
            (skin/'SCRIPTS'/name).write_bytes(b'FG\x03\x04-test')
        (runtime/'neowulf-vis-profile.maki').write_bytes(b'FG\x03\x04-runtime')
        (runtime/'neowulf-vis-profile.m').write_text('// source fixture\n', encoding='utf-8')
        subprocess.run([sys.executable, str(APPLY), str(skin), '--runtime-dir', str(runtime)], check=True)
        subprocess.run([sys.executable, str(VALIDATE), str(skin)], check=True)
        mp = (skin/'XML/main-player.xml').read_text(encoding='utf-8')
        sa = (skin/'XML/spectrum-analyzer.xml').read_text(encoding='utf-8')
        assert 'param="mp"' in mp and 'param="sa"' in sa
        assert '#188408' not in mp and '#39b510' not in sa
        assert (skin/'SCRIPTS/neowulf-vis-profile.maki').exists()
    print('display pipeline fixture OK')

if __name__ == '__main__':
    main()
