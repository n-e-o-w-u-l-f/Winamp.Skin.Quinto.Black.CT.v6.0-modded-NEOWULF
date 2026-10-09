"""Fixed native LayerFX clipping geometry; original artwork stays immutable."""
from pathlib import Path
import hashlib, json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def required(relative):
    path = ROOT / relative
    if not path.is_file():
        raise FileNotFoundError('Required repository input: ' + str(path))
    return path


def main_geometry():
    assets = json.loads(required('design/assets/manifest.json').read_text())
    info = assets['vinyl-texture-flat-v1.png']
    width, height = info['size']
    bx, by, bw, bh = info['bitmap_box']
    # Recenter the source artwork under a stationary GUI spindle. Keep the
    # clip inside the record and texture bounds, including the sampler margin.
    radius = min(bw, bh) / 2 - 2.5
    return dict(size=(510, 140), source_size=(width, height), radius=radius,
                pivot=(2 * (bx + bw / 2) / width - 1,
                       2 * (by + bh / 2) / height - 1))


def verify_compiled_scripts():
    """Reject packaging a changed source with its predecessor's binary."""
    lock = json.loads(required('skin/maki-lock.json').read_text())
    for entry in lock['scripts']:
        for kind in ('source', 'binary'):
            path = required(entry[kind])
            if hashlib.sha256(path.read_bytes()).hexdigest() != entry[kind + '_sha256']:
                raise ValueError('MAKI compilation lock mismatch: ' + entry[kind])


def region_mask(size, source_size, radius):
    """Binary native Region at GUI resolution, with pixel-center symmetry."""
    width, height = size
    rx, ry = radius * width / source_size[0], radius * height / source_size[1]
    image = Image.new('RGBA', size)
    image.putdata([(255, 255, 255, 255 if
                    ((x + .5 - width / 2) / rx) ** 2 +
                    ((y + .5 - height / 2) / ry) ** 2 <= 1 else 0)
                   for y in range(height) for x in range(width)])
    return image


if __name__ == '__main__':
    destination = ROOT / 'skin/hellfire-runtime/PNG/NEOWULF/vinyl-clip.png'
    required('skin/hellfire-runtime/PNG/NEOWULF/vinyl.png')
    region_mask((474, 474), (474, 474), 234).save(destination)
    print('Wrote fixed native Region: ' + str(destination))
