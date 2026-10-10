"""Map immutable source artwork into Winamp coordinates.

All measurements belong to design/layout-geometry.json, in uncropped PNG
pixels. The platter is a projected circular plane: its apparent ellipse
centre need not be the attachment point of its spindle. An affine recenter
cannot satisfy both anchors; the projective mapping below preserves both.
"""
from pathlib import Path
import json
import math
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_geometry():
    config = json.loads((ROOT / 'design/layout-geometry.json').read_text())
    assets = json.loads((ROOT / 'design/assets/manifest.json').read_text())
    if config['schema'] != 1:
        raise ValueError('Unsupported artwork geometry schema')
    info = assets[config['main']['asset']]
    if info['sha256'] != config['main']['asset_sha256']:
        raise ValueError('Recalibrate geometry when its artwork changes')
    if config['rack_width'] <= 0:
        raise ValueError('Invalid rack width')
    return config, assets


def main_projection(rack_width=None):
    config, assets = load_geometry()
    measured = config['main']
    bx, by, bw, bh = assets[measured['asset']]['bitmap_box']
    width = config['rack_width'] if rack_width is None else rack_width
    height = round(bh * width / bw)
    if min(width, height) <= 0:
        raise ValueError('Invalid main viewport')
    scale = (width / bw, height / bh)

    def screen(p):
        return ((p[0] - bx) * scale[0], (p[1] - by) * scale[1])

    spindle = screen(measured['spindle'])
    center = screen(measured['platter']['center'])
    rx, ry = measured['platter']['radii']
    angle = measured['platter']['angle_radians']
    ca, sa = math.cos(angle), math.sin(angle)
    # Physical unit-circle -> GUI ellipse linear part, including source angle.
    ex, ey = (rx * ca * scale[0], rx * sa * scale[1])
    fx, fy = (-ry * sa * scale[0], ry * ca * scale[1])
    det = ex * fy - ey * fx
    if rx <= 0 or ry <= 0 or abs(det) < 1e-10:
        raise ValueError('Invalid measured platter ellipse')
    dx, dy = spindle[0] - center[0], spindle[1] - center[1]
    sx, sy = (fy * dx - fx * dy) / det, (-ey * dx + ex * dy) / det
    norm2 = sx * sx + sy * sy
    if norm2 >= 1:
        raise ValueError('Spindle must lie inside the measured platter')
    gamma = math.sqrt(1 - norm2)
    factor = (1 - gamma) / norm2 if norm2 else 0
    a, b, d = gamma + factor * sx * sx, factor * sx * sy, gamma + factor * sy * sy
    # Lorentz/projective disk automorphism maps the circle to itself and its
    # physical origin to the observed spindle. Inverse: (A z - s)/(1-s.z).
    bound_x, bound_y = math.hypot(ex, fx), math.hypot(ey, fy)
    left, top = math.floor(center[0] - bound_x), math.floor(center[1] - bound_y)
    right, bottom = math.ceil(center[0] + bound_x), math.ceil(center[1] + bound_y)
    rectangle = (left, top, right - left, bottom - top)
    rw, rh = rectangle[2:]
    # LayerFX callbacks use -1..1, then the native texture canvas is stretched
    # into this GUI rectangle. Preserve the fractional measured ellipse centre.
    ox, oy = left + rw / 2 - center[0], top + rh / 2 - center[1]
    qx = (fy * rw / 2 / det, -fx * rh / 2 / det, (fy * ox - fx * oy) / det)
    qy = (-ey * rw / 2 / det, ex * rh / 2 / det, (-ey * ox + ex * oy) / det)
    inverse = (
        tuple(a * qx[i] + b * qy[i] - (sx if i == 2 else 0) for i in range(3)),
        tuple(b * qx[i] + d * qy[i] - (sy if i == 2 else 0) for i in range(3)),
        tuple(-sx * qx[i] - sy * qy[i] + (1 if i == 2 else 0) for i in range(3)),
    )
    if min(left, top) < 0 or right > width or bottom > height:
        raise ValueError('Measured platter lies outside the main viewport')
    return dict(viewport=(width, height), rect=rectangle, center=center,
                spindle=spindle, ellipse=(ex, ey, fx, fy), shift=(sx, sy),
                disk_matrix=(a, b, d), inverse=inverse,
                grid=tuple(measured['fx_grid']),
                measurement_tolerance=measured['spindle_measurement_tolerance_source_px'] * max(scale))


def layer_coordinate(point, geometry):
    x, y, w, h = geometry['rect']
    return (2 * (point[0] - x) / w - 1, 2 * (point[1] - y) / h - 1)


def physical_coordinate(point, geometry):
    x, y = layer_coordinate(point, geometry)
    rows = geometry['inverse']
    denominator = rows[2][0] * x + rows[2][1] * y + rows[2][2]
    if denominator <= 0:
        raise ValueError('Invalid projected platter denominator')
    return tuple((row[0] * x + row[1] * y + row[2]) / denominator for row in rows[:2])


def projected_coordinate(point, geometry):
    u, v = point
    sx, sy = geometry['shift']
    a, b, d = geometry['disk_matrix']
    denominator = 1 + sx * u + sy * v
    x, y = (a * u + b * v + sx) / denominator, (b * u + d * v + sy) / denominator
    ex, ey, fx, fy = geometry['ellipse']
    cx, cy = geometry['center']
    return (cx + ex * x + fx * y, cy + ey * x + fy * y)


def projected_region(geometry):
    """Fixed GUI Region; no frame-dependent silhouette or source-image edits."""
    left, top, width, height = geometry['rect']
    image = Image.new('RGBA', (width, height))
    image.putdata([(255, 255, 255, 255 if sum(v * v for v in
                    physical_coordinate((left + x + .5, top + y + .5), geometry)) <= 1 else 0)
                   for y in range(height) for x in range(width)])
    return image


def scale_controls(fragment, previous_size, viewport):
    """Resize hit targets/readouts together with the unchanged chassis scale."""
    import xml.etree.ElementTree as ET
    root = ET.fromstring('<root>' + fragment + '</root>')
    sx, sy = viewport[0] / previous_size[0], viewport[1] / previous_size[1]
    for node in root.iter():
        for key, scale in [('x', sx), ('w', sx), ('y', sy), ('h', sy)]:
            if key in node.attrib:
                node.set(key, format(float(node.get(key)) * scale, '.8g'))
        if 'fontsize' in node.attrib:
            node.set('fontsize', str(max(1, round(float(node.get('fontsize')) * min(sx, sy)))))
    return ''.join(ET.tostring(node, encoding='unicode') for node in root)
