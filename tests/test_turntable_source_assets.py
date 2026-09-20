#!/usr/bin/env python3
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOD = ROOT / "tools" / "apply_neowulf_v6_reference_design.py"
spec = spec_from_file_location("neowulf_turntable", MOD)
m = module_from_spec(spec)
spec.loader.exec_module(m)

def main():
    disc = m.radial_record_base(size=128, scale=1).convert("RGBA")
    px = disc.load()
    cx = cy = 64
    outside = red = bright = 0
    for y in range(128):
        for x in range(128):
            if (x - cx) ** 2 + (y - cy) ** 2 <= 27 ** 2:
                continue
            r, g, b, a = px[x, y]
            if a <= 20:
                continue
            outside += 1
            if r > 70 and r > g * 2.5 and r > b * 2.0:
                red += 1
            if (r + g + b) / 3 > 110:
                bright += 1
    assert outside > 0
    assert red / outside < 0.001, "red sector leaked outside label"
    assert bright / outside < 0.002, "bright lighting leaked into rotating vinyl master"

    fixed = m.fixed_reflection(size=128).convert("RGBA")
    assert fixed.getbbox() is not None, "fixed reflection must not be empty"
    print("turntable source invariants OK")

if __name__ == "__main__":
    main()
