#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image
import argparse, re

LP_SIZE = 474
BANK_FRAMES = 60

def fail(msg, errors):
    errors.append(msg)

def sample_frame(atlas: Image.Image, idx: int) -> Image.Image:
    return atlas.crop((0, idx * LP_SIZE, LP_SIZE, (idx + 1) * LP_SIZE)).convert("RGBA")

def check_frame(frame: Image.Image, errors: list[str], label: str):
    px = frame.load()
    cx = cy = LP_SIZE // 2
    outside = red = bright = 0
    for y in range(LP_SIZE):
        for x in range(LP_SIZE):
            if (x - cx) ** 2 + (y - cy) ** 2 <= 95 ** 2:
                continue
            r, g, b, a = px[x, y]
            if a <= 20:
                continue
            outside += 1
            if r > 70 and r > g * 2.5 and r > b * 2.0:
                red += 1
            if (r + g + b) / 3 > 110:
                bright += 1
    if outside:
        if red / outside > 0.001:
            fail(f"{label}: rotating red sectors/reflections detected outside label ({red/outside:.4%})", errors)
        if bright / outside > 0.002:
            fail(f"{label}: bright rotating light/glint detected outside label ({bright/outside:.4%})", errors)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("skin_root", type=Path)
    a = ap.parse_args()
    root = a.skin_root
    errors = []

    banks = [
        root / "PNG" / "neowulf-lp-rotation-120-a.png",
        root / "PNG" / "neowulf-lp-rotation-120-b.png",
    ]
    fixed = root / "PNG" / "neowulf-vrp-fixed-reflection.png"
    master = root / "PNG" / "neowulf-lp-master.png"

    for p in (*banks, fixed, master):
        if not p.exists():
            fail(f"missing {p.relative_to(root)}", errors)

    if not errors:
        for path in banks:
            im = Image.open(path)
            if im.size != (LP_SIZE, LP_SIZE * BANK_FRAMES):
                fail(f"{path.name}: wrong atlas size {im.size}", errors)
            for idx in (0, 7, 15, 23, 31, 45, 59):
                check_frame(sample_frame(im, idx), errors, f"{path.name} frame {idx}")

        ov = Image.open(fixed).convert("RGBA")
        if ov.size != (LP_SIZE, LP_SIZE):
            fail(f"fixed reflection size {ov.size}", errors)
        else:
            lit = 0
            opx = ov.load()
            for y in range(ov.height):
                for x in range(ov.width):
                    r, g, b, a = opx[x, y]
                    if a > 12 and r > g * 1.5 and r > b * 1.3 and r > 80:
                        lit += 1
            if lit < 40:
                fail("fixed reflection overlay contains too little fixed stylus/platter light", errors)

    xmlp = root / "XML" / "vinyl-record-player.xml"
    elem = root / "XML" / "elements.xml"

    if not xmlp.exists():
        fail("missing XML/vinyl-record-player.xml", errors)
    else:
        x = xmlp.read_text(encoding="utf-8")
        if 'id="vrp.layer.fixed.reflection"' not in x:
            fail("fixed reflection layer not wired", errors)
        p_vin = x.find('id="vrp.layer.vinyl"')
        p_ref = x.find('id="vrp.layer.fixed.reflection"')
        p_tone = x.find('id="vrp.layer.tonearm"')
        if not (0 <= p_vin < p_ref < p_tone):
            fail("layer order must be vinyl -> fixed reflection -> tonearm", errors)
        if re.search(r"<AnimatedLayer[^>]+fixed\.reflection", x, re.I | re.S):
            fail("fixed reflection must not be AnimatedLayer", errors)

    if not elem.exists():
        fail("missing XML/elements.xml", errors)
    else:
        e = elem.read_text(encoding="utf-8")
        if 'id="neowulf.vrp.fixed.reflection"' not in e:
            fail("fixed reflection bitmap not declared", errors)

    src = root / "SCRIPTS" / "neowulf-vrp-rotation.m"
    if src.exists():
        s = src.read_text(encoding="utf-8", errors="replace")
        if "spinFrame > 119" not in s:
            fail("rotation source no longer covers 120 frames", errors)
        if "delayms = 15" not in s or "delayms = 11" not in s:
            fail("33/45 RPM timing missing", errors)

    if errors:
        print("NEOWULF TURNTABLE VALIDATION FAILED")
        for e in errors:
            print(" -", e)
        raise SystemExit(1)

    print("NEOWULF TURNTABLE VALIDATION OK")
    print(" - 120 rotating frames in two 60-frame banks")
    print(" - no red sector graphics or bright baked light outside label")
    print(" - fixed reflection/stylus light is a static layer")
    print(" - layer order: LP -> fixed light -> tonearm")

if __name__ == "__main__":
    main()
