# Main platter registration from artwork pixels

The previous main platter rectangle was stable under rotation but was not
registered to the physical attachment drawn in the chassis. At the requested
638-pixel rack width its centre was about 11.81 GUI pixels too low. Configuration
now follows the pinned artwork; its chassis pixels and proportions are unchanged.

This is the first deck's **source candidate**. It is not a compiled or installed
skin. Full deck coverage, equal rack dimensions, feet, speaker sockets, docking,
power-state/spindle/tonearm overlays and live frame rate remain open.

## Coordinate contract

`design/layout-geometry.json` stores coordinates in the **uncropped source PNG**.
The asset hash and `design/assets/manifest.json` must agree. A different source
requires new measurement. The native viewport is derived from the bitmap crop,
not forced onto the original Quinto window's aspect ratio:

| Item | Source pixels | Native GUI at 638 width |
| --- | --- | --- |
| Main source image | 1946 × 808 | Preserved |
| Main bitmap crop | x18, y5, 1927 × 796 | 638 × 264 |
| Spindle attachment | x925, y188, tolerance ±2 source px | x300.29372, y60.69347, tolerance ~0.66332 px |
| Platter contour centre | x918.17320, y198.54435 | Separately projected from spindle |
| Platter semiaxes | 519.36112, 139.45451 | Source angle −0.00036301 radians retained |
| Fixed Layer/Region bounds | Measured ellipse + integer pixel coverage | x126, y17, 344 × 94 |
| Previous centre minus attachment | Previous fixed (140,25,510,140) at 836 width | +1.15365 x, +11.80653 y |

The small height-rounding difference comes from the integer GUI canvas. No
artwork is cropped differently, repainted, stretched to an unrelated ratio or
upscaled to pretend that it contains 4K detail.

The contour came from 180 radial edge probes, a grayscale derivative with a
Gaussian proximity weight, and robust least-squares ellipse fitting. Its source
sampling uncertainty is distinct from arithmetic/interpolation error. The spindle
attachment was inspected separately; an ellipse's apparent centre and a physical
spindle projection need not coincide in a perspective view.

`tools/artwork_geometry.py` builds a projective disk mapping which preserves the
observed ellipse boundary and maps the physical record origin to that attachment.
The MAKI callbacks invert this mapping, rotate physical texture coordinates, and
sample the unchanged flat vinyl. A fixed native Region clips the contour. Wrap
remains enabled to avoid the previously proven mesh-corner clamp defect.

Main readouts and transparent hit targets scale together from the previous
836×345 controls coordinate space. That scaling prevents controls from being
left outside the smaller chassis; it does not establish fresh per-control pixel
calibration. Power-state and fixed spindle/tonearm overlays need their own next
calibration before native visual acceptance.

## Primary research and identity

- The user's materialized Quinto archive is pinned at SHA256
  `d926537bd21978d498d9781b15e733bab21ab28da0bf696e1307132d2e6066d1`.
  Its `skin.xml` identifies PeterK., **5.1**, WAL abstraction 1.36; all 140 members
  pass ZIP CRC. Main and equalizer are each 638×246 in that original archive.
- [The author's public site](https://quinto-black-ct.info/) displayed **4.8** with
  a 2026-01-17 release date when retrieved. This page does not identify or replace
  the supplied 5.1 archive.
- [Native Layout source](https://github.com/alexfreud/winamp/blob/0954e03b3acbc11b6c90298598db6b6469568d72/Src/Wasabi/api/wndmgr/layout.cpp)
  defaults `nodock` to zero and accepts named XML `snapadjustleft/top/right/bottom`
  attributes. Feet and alpha margins must be measured before choosing their
  adjustment values; no guessed snap boundary has been added.
- [Native Layer source](https://github.com/alexfreud/winamp/blob/0954e03b3acbc11b6c90298598db6b6469568d72/Src/Wasabi/api/skin/widgets/layer.cpp)
  returns bitmap dimensions from `getWidth/getHeight`, renders the texture-sized
  FX canvas, then stretches it into the GUI destination. Do not substitute GUI
  dimensions into the texture-mesh model.
- [Native FX renderer](https://github.com/alexfreud/winamp/blob/0954e03b3acbc11b6c90298598db6b6469568d72/Src/Wasabi/api/skin/widgets/fx_dmove.cpp)
  uses signed 16.16 vertices and integer row/column interpolation. The chosen
  22×22 intervals divide the pinned 1254×1254 texture exactly and approximate
  the projective mapping without fractional grid-interval truncation.

## Verification and safe next step

```sh
python3 -B tests/test_platter_registration.py
python3 -m py_compile tools/artwork_geometry.py tools/vinyl_rotation.py tools/build_reference_skin.py
```

The standalone source regression evaluates the actual MAKI expressions and
token assignments over 720 phases and 73 probes per phase, including the spindle
and three rings. It includes native vertex/slope fixed-point rounding. Maximum
source-derived projected error was 0.009253 GUI pixels, spindle error 0.005760.
It rejects the predecessor's misplaced rectangle and corner-clamped mapping.
It also verifies the silhouette's actual mask pixels and round-trip registration
at three viewport widths. [Recorded result](verification/20261010-platter-registration.json).

These figures do not prove compiled MAKI execution, final native resampling,
alpha appearance, observed motion or FPS. The packaging source/binary lock
remains unchanged and must reject this candidate until a matching new `.maki`
has been compiled and independently hashed. The new source must never be
packaged with the old binary. Do not merge/deploy this draft until that compilation,
the pending main overlays and the actual Winamp checks are completed.
