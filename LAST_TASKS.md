# LAST_TASKS

## 2026-09-20 22:18 CEST — NEOWULF v6 reference-design correction

**STATE:** IN_PROGRESS

**OBJECTIVE:** Correct the vinyl-record-player and overall material treatment to the supplied NEOWULF reference design. The rotating LP must contain only physical record texture/label detail; lighting and reflections must remain fixed in deck coordinates.

**USER-CORRECTED DEFECTS:**
- The current LP wrongly contains large red sector/stripe graphics.
- White/red light reflections are baked into the rotating LP frames and therefore rotate with the record.
- The turntable visual treatment is not close enough to the supplied brushed Black Steel / machined-metal reference.
- The previous implementation must not be treated as an accepted design.

**CURRENT PLAN:**
1. Rebuild all 120 LP frames without decorative red sectors or baked lighting.
2. Split fixed platter/stylus illumination into a separate static overlay layer.
3. Rework the platter/chassis toward dark brushed steel, machined rings and fixed strobe dots.
4. Keep the tonearm static and the stylus light fixed.
5. Add source generator + validator + preview to GitHub.
6. Rebuild a new R3 WAL from the R2 functional skin and validate visual invariants.

**PLANNED_FILES:**
- tools/apply_neowulf_v6_reference_design.py
- tools/validate_neowulf_v6_turntable.py
- docs/TURNTABLE-REFERENCE-DESIGN.md
- docs/preview-turntable-r3.png
- skin/SCRIPTS/neowulf-vrp-rotation.m
- skin/source-assets/neowulf-lp-master.png
- skin/source-assets/neowulf-vrp-fixed-reflection.png
- skin/source-assets/vrp-reference-background.png
- skin/source-assets/vrp-reference-platter.png
- README.md
- LAST_TASKS.md

**DO_NOT_REPEAT:**
- No rotating light/reflection layers baked into LP frames.
- No large red stripes/sectors on the vinyl.
- No coarse chassis striping masquerading as brushed metal.
- Preserve 120-frame smooth rotation and 33⅓/45 RPM behavior.
- Keep loudspeaker/platter geometry separate.
