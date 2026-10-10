"""Artwork registration + actual MAKI expression/native-mesh regression.

This checks the source-defined mapping. It does not claim a compiled MAKI
test, Winamp paint observation, or frame-rate measurement.
Native oracle: alexfreud/winamp @0954e03, layer.cpp + fx_dmove.cpp.
Layer::getWidth/getHeight use BITMAP dimensions, not GUI rectangle dimensions.
"""
from pathlib import Path
import ast
import json
import math
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from artwork_geometry import (layer_coordinate, main_projection, physical_coordinate,
                             projected_coordinate, projected_region, scale_controls)
from vinyl_rotation import main_geometry, main_script_param


def actual_callbacks(source):
    expressions = []
    for axis in 'XY':
        match = re.search(r'vinyl\.fx_onGetPixel' + axis +
                          r'\([^)]*\)\s*\{\s*return\s+([^;]+);\s*\}', source)
        assert match, 'Missing actual vinyl callback ' + axis
        tree = ast.parse(match[1], mode='eval')
        allowed = (ast.Expression, ast.BinOp, ast.Add, ast.Sub, ast.Mult, ast.Div,
                   ast.Name, ast.Load, ast.Constant, ast.UnaryOp, ast.USub)
        assert all(isinstance(node, allowed) for node in ast.walk(tree))
        expressions.append(compile(tree, '<actual MAKI callback>', 'eval'))
    return expressions


def native_environment(source, geometry):
    tokens = main_script_param(geometry).split('|')
    # Parse the actual MAKI token assignments. This detects mismatched param
    # order between generated XML and the native script, not just helper math.
    pattern = r'(vinyl\w+)=System\.stringTo(?:Float|Integer)\(System\.getToken\(getParam\(\),"\|",(\d+)\)\);'
    env = {name: float(tokens[int(index)]) for name, index in re.findall(pattern, source)}
    assert len(env) == 15, 'Missing geometry token assignment in MAKI'
    assert 'vinyl.fx_setGridSize(vinylGridX,vinylGridY)' in source
    return env


def mesh_mapping(expressions, env, angle, geometry, wrap=True):
    width, height = geometry['source_size']
    gx, gy = geometry['grid']
    assert width % gx == height % gy == 0, 'Avoid native truncated grid intervals'
    env = dict(env, phaseCos=math.cos(angle), phaseSin=math.sin(angle))
    cache = {}

    def vertex(ix, iy):
        key = (ix, iy)
        if key not in cache:
            context = dict(env, x=2 * ix / gx - 1, y=2 * iy / gy - 1)
            sample = [eval(expr, {'__builtins__': {}}, context) for expr in expressions]
            fixed = [int((value + 1) * size * 32768) for value, size in zip(sample, (width, height))]
            if not wrap:
                fixed = [min(max(value, 0), (size - 2) << 16) for value, size in zip(fixed, (width, height))]
            cache[key] = fixed
        return cache[key]

    def transform(point):
        nx, ny = layer_coordinate(point, geometry)
        tx, ty = (nx + 1) * gx / 2, (ny + 1) * gy / 2
        ix, iy = min(gx - 1, max(0, math.floor(tx))), min(gy - 1, max(0, math.floor(ty)))
        xcount, ycount = (tx - ix) * width / gx, (ty - iy) * height / gy
        nw, ne, sw, se = vertex(ix, iy), vertex(ix + 1, iy), vertex(ix, iy + 1), vertex(ix + 1, iy + 1)
        result = []
        for axis, size in enumerate((width, height)):
            # C++ signed integer division truncates toward zero. The renderer
            # first interpolates rows, then horizontal signed 16.16 texture positions.
            west = nw[axis] + math.trunc((sw[axis] - nw[axis]) / (height / gy)) * ycount
            east = ne[axis] + math.trunc((se[axis] - ne[axis]) / (height / gy)) * ycount
            fixed = west + math.trunc((east - west) / (width / gx)) * xcount
            result.append(fixed / (size * 32768) - 1)
        return result
    return transform


def check_projected_motion(source, geometry, wrap=True):
    expressions = actual_callbacks(source)
    env = native_environment(source, geometry)
    px, py = geometry['pivot']
    rx, ry = geometry['texture_radius']
    points = [geometry['spindle']]
    for radius in (.35, .8, .99):
        points += [projected_coordinate((radius * math.cos(i * math.tau / 24),
                                         radius * math.sin(i * math.tau / 24)), geometry)
                   for i in range(24)]
    max_center = max_projection = 0
    for step in range(720):
        angle = step * math.pi / 360
        transform = mesh_mapping(expressions, env, angle, geometry, wrap)
        ca, sa = math.cos(angle), math.sin(angle)
        for index, point in enumerate(points):
            sample = transform(point)
            # A fixed Region must never admit a wrapped texture seam.
            assert all(-1 < value < 1 - 4 / size for value, size in zip(sample, geometry['source_size'])), 'Texture seam in visible record'
            u, v = (sample[0] - px) / rx, (sample[1] - py) / ry
            actual = projected_coordinate((ca * u + sa * v, -sa * u + ca * v), geometry)
            error = math.dist(actual, point)
            max_projection = max(max_projection, error)
            if index == 0:
                max_center = max(max_center, error)
        assert max_center < .1, ('Spindle mapping moved in source-derived mesh', step, max_center)
        assert max_projection < .15, ('Projected record plane warped in source-derived mesh', step, max_projection)
    return dict(phases=720, probes_per_phase=len(points),
                max_spindle_error_gui_px=max_center,
                max_projection_error_gui_px=max_projection,
                native_runtime_verified=False)


def main():
    source = (ROOT / 'skin/SCRIPTS/neowulf-reference.m').read_text()
    geometry = main_geometry()
    assert geometry['viewport'] == (638, 264)
    # Observed anchor, independently converted from the pinned chassis crop.
    expected = ((925 - 18) * 638 / 1927, (188 - 5) * 264 / 796)
    assert math.dist(geometry['spindle'], expected) < 1e-10
    assert math.dist(physical_coordinate(expected, geometry), (0, 0)) < 1e-12
    for width in (638, 836, 1927):
        candidate = main_projection(width)
        assert math.dist(projected_coordinate((0, 0), candidate), candidate['spindle']) < 1e-10
        for i in range(180):
            angle = i * math.tau / 180
            physical = (math.cos(angle), math.sin(angle))
            point = projected_coordinate(physical, candidate)
            assert math.dist(physical_coordinate(point, candidate), physical) < 1e-10
    mask = projected_region(geometry)
    left, top, width, height = geometry['rect']
    for y in range(height):
        for x in range(width):
            inside = sum(v * v for v in physical_coordinate((left + x + .5, top + y + .5), geometry)) <= 1
            assert bool(mask.getpixel((x, y))[3]) == inside
    result = check_projected_motion(source, geometry)
    # The exact predecessor's rectangle, scaled into the requested common
    # width, must fail even though its texture could rotate without bouncing.
    old_center = (395 * 638 / 836, 95 * 638 / 836)
    result['predecessor_center_offset_gui_px'] = [old_center[i] - expected[i] for i in (0, 1)]
    bad = dict(geometry, rect=(140 * 638 / 836, 25 * 638 / 836, 510 * 638 / 836, 140 * 638 / 836))
    for label, candidate_source, candidate_geometry, wrap in [
            ('old_rectangle', source, bad, True),
            ('clipped_mesh_corners', source, geometry, False)]:
        try:
            check_projected_motion(candidate_source, candidate_geometry, wrap)
        except AssertionError:
            result[label + '_rejected'] = True
        else:
            raise AssertionError('Did not reject ' + label)
    # Main overlay/readout/controls must shrink with the layout, not remain
    # at the predecessor's coordinates outside its new native window.
    scaled = scale_controls('<Button x="735" y="241" w="58" h="58"/>', (836, 345), geometry['viewport'])
    import xml.etree.ElementTree as ET
    node = ET.fromstring(scaled)
    assert float(node.get('x')) + float(node.get('w')) < geometry['viewport'][0]
    assert float(node.get('y')) + float(node.get('h')) < geometry['viewport'][1]
    result.update(viewport=geometry['viewport'], rectangle=geometry['rect'],
                  spindle_gui_px=geometry['spindle'],
                  measured_anchor_tolerance_gui_px=geometry['measurement_tolerance'])
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
