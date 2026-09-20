# LAST_TASKS

## 2026-09-20 18:14 CEST — NEOWULF v6 design transfer

**STATE:** IN_PROGRESS  
**OBJECTIVE:** Transfer the approved NEOWULF v6 high-detail Black Steel / Hell Machine design into the functional Winamp Modern skin on GitHub.

**CURRENT:**
- Repository contains the compiled NEOWULF animation drivers.
- Full source exists in the working build and is being converted into reproducible GitHub source/delta assets.
- Target visual direction: high-resolution brushed black steel, fine metal grain, brighter red/amber displays, high-detail controls, NEOWULF v6 branding.
- Loudspeakers must be upright Teufel MK Ultra tower enclosures; no platter/speaker overlap.
- Vinyl animation remains isolated to the dedicated turntable and uses the high-frame NEOWULF animation driver.

**NEXT:**
1. Add reproducible source-side design generator and skin XML changes.
2. Replace loudspeaker geometry/assets with upright tower design.
3. Brighten display/gamma system while retaining red/amber Hell Machine palette.
4. Add fine brushed-metal treatment to chassis/window assets.
5. Validate XML references, image dimensions, animation frame geometry, and rebuild the WAL.

**PLANNED_FILES:**
- skin/XML/gammaset.xml
- skin/XML/loudspeaker-left.xml
- skin/XML/loudspeaker-right.xml
- skin/XML/elements.xml
- skin/PNG/ls-elements.png
- skin/PNG/neowulf-ls-cone-animation-32.png
- tools/apply_neowulf_v6_design.py
- README.md
- LAST_TASKS.md

**BLOCKERS:** None for source implementation. Large binary WAL/release publication may require a separate artifact/release path.
