"""Motion regression using actual MAKI callbacks and native LayerFX mapping.

Native oracle: alexfreud/winamp @0954e03, Src/Wasabi/api/skin/widgets/
fx_dmove.cpp (blob cb492260fdb154105e902b46ca5dabaefaca42e1).
Its four signed 16.16 texture vertices are interpolated AFTER wrap=0 clamps.
This is a source-derived motion check, not an observed Winamp paint test.
"""
from pathlib import Path
import argparse, ast, json, math, re, sys
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from vinyl_rotation import main_geometry, region_mask, required, verify_compiled_scripts


def expressions(source):
    code = []
    for axis in 'XY':
        match = re.search(r'vinyl\.fx_onGetPixel' + axis +
                          r'\([^)]*\)\s*\{\s*return\s+([^;]+);\s*\}', source)
        assert match, 'Missing actual Cartesian callback ' + axis
        tree = ast.parse(match[1], mode='eval')
        allowed = (ast.Expression, ast.BinOp, ast.Add, ast.Sub, ast.Mult,
                   ast.Name, ast.Load, ast.Constant, ast.UnaryOp, ast.USub)
        assert all(isinstance(node, allowed) for node in ast.walk(tree))
        code.append(compile(tree, '<actual MAKI callback>', 'eval'))
    return code


def mapping(code, angle, pivot, texture_size, wrap=True):
    env = dict(phaseCos=math.cos(angle), phaseSin=math.sin(angle),
               vinylPivotX=pivot[0], vinylPivotY=pivot[1])
    points = []
    for x, y in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        values = [eval(expr, {'__builtins__': {}}, dict(env, x=x, y=y)) for expr in code]
        point = []
        for value, size in zip(values, texture_size):
            fixed = int((value + 1) * size * 32768)
            if not wrap:
                fixed = min(max(fixed, 0), (size - 2) << 16)
            point.append(fixed / (size * 32768) - 1)
        points.append(point)

    def interpolate(x, y):
        tx, ty = (x + 1) / 2, (y + 1) / 2
        weights = [(1-tx)*(1-ty), tx*(1-ty), (1-tx)*ty, tx*ty]
        return tuple(sum(p[axis] * w for p, w in zip(points, weights)) for axis in (0, 1))
    return interpolate


def determinant(transform):
    o, x, y = transform(0, 0), transform(1, 0), transform(0, 1)
    return (x[0]-o[0])*(y[1]-o[1]) - (x[1]-o[1])*(y[0]-o[0])


def check_motion(code, pivot, texture_size, wrap=True):
    max_center = max_radius = max_area = 0
    # Half-degree phases and evenly spaced ring probes include cardinal and
    # diagonal angles; fixed-point vertex rounding is part of the oracle.
    for step in range(720):
        transform = mapping(code, step * math.pi / 360, pivot, texture_size, wrap)
        center = transform(0, 0)
        max_center = max(max_center, math.dist(center, pivot))
        max_area = max(max_area, abs(determinant(transform) - 1))
        for probe in range(32):
            a = probe * math.tau / 32
            point = transform(.95*math.cos(a), .95*math.sin(a))
            max_radius = max(max_radius, abs(math.dist(point, pivot) - .95))
        assert max_center < 1e-6, ('Spindle moved', step, max_center)
        assert max_radius < 1e-6, ('Record radius changed', step, max_radius)
        assert max_area < 1e-6, ('Record area changed', step, max_area)
    return dict(phases=720, max_center_error=max_center,
                max_radius_error=max_radius, max_area_error=max_area)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    verify_compiled_scripts()
    geometry = main_geometry()
    main_source = required('skin/SCRIPTS/neowulf-reference.m').read_text()
    old_source = required('skin/hellfire-runtime/SCRIPTS/neowulf-vinyl.m').read_text()
    results = {}
    for label, source, pivot, size, bitmap in [
            ('main', main_source, geometry['pivot'], geometry['source_size'], 'ref.vinyl.clip'),
            ('standalone', old_source, (0, 0), (474, 474), 'nw.vinyl.clip')]:
        for setting in ('Wrap', 'Rect', 'Clear'):
            assert 'vinyl.fx_set' + setting + '(1)' in source, setting
        assert 'disc.loadFromBitmap("' + bitmap + '")' in source
        assert 'vinyl.setRegion(disc)' in source
        assert 'phaseCos=System.cos(phase);phaseSin=System.sin(phase);' in source
        assert not re.search(r'vinyl\.(resize|setXmlParam|setRegionFromMap)', source)
        code = expressions(source)
        results[label] = check_motion(code, pivot, size)
        # The old production setting must fail the same motion acceptance.
        try:
            check_motion(code, pivot, size, wrap=False)
        except AssertionError:
            results[label]['old_corner_clamp_rejected'] = True
        else:
            raise AssertionError('Regression did not reject corner clipping')

    mask = region_mask(geometry['size'], geometry['source_size'], geometry['radius'])
    if args.stage:
        stage = args.stage.resolve()
        assert stage.is_dir(), 'Missing actual skin stage: ' + str(stage)
        decks = ET.fromstring('<root>' + (stage/'XML/reference-decks.xml').read_text() + '</root>')
        group = decks.find("groupdef[@id='main.group']")
        vinyl = group.find("Layer[@id='ref.vinyl']")
        assert tuple(float(vinyl.get(k)) for k in ('x', 'y', 'w', 'h')) == (140, 25, 510, 140)
        assert group.find("Layer[@image='ref.reflection']").get('id') is None
        tokens = group.find("script[@file='SCRIPTS/neowulf-reference.maki']").get('param').split('|')
        assert tokens[0] == '1' and math.dist(tuple(map(float, tokens[1:])), geometry['pivot']) < 1e-10
        actual = Image.open(stage/'PNG/NEOWULF/vinyl-clip.png').convert('RGBA')
        assert actual.size == mask.size and actual.tobytes() == mask.tobytes()

    # Check actual fixed mask pixels, symmetry and sampler bounds through a
    # revolution. Any visible pixel must stay inside the source, so no repeated
    # texture copy or wrap seam can enter the record's GUI footprint.
    legacy = Image.open(required('skin/hellfire-runtime/PNG/NEOWULF/vinyl-clip.png')).convert('RGBA')
    assert legacy.tobytes() == region_mask((474, 474), (474, 474), 234).tobytes()
    for label, image, source_size, pivot in [
            ('main', mask, geometry['source_size'], geometry['pivot']),
            ('standalone', legacy, (474, 474), (0, 0))]:
        alpha = image.getchannel('A')
        assert alpha.tobytes() == alpha.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
        assert alpha.tobytes() == alpha.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
        max_radius = max(math.hypot(2*(x+.5)/image.width-1, 2*(y+.5)/image.height-1)
                         for y in range(image.height) for x in range(image.width)
                         if alpha.getpixel((x, y)))
        assert max_radius + max(abs(v) for v in pivot) < 1 - 2/min(source_size)
        assert alpha.getpixel((0, 0)) == 0 and alpha.getpixel((image.width//2, image.height//2)) == 255
        results[label]['fixed_mask_sampler_margin_verified'] = True

    reference45 = mapping(expressions(old_source), math.pi/4, (0, 0), (474, 474), False)
    results['previous_45deg_growth'] = 1/math.sqrt(determinant(reference45))
    results['native_runtime_verified'] = False
    if args.report:
        args.report.write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results))


if __name__ == '__main__':
    main()
