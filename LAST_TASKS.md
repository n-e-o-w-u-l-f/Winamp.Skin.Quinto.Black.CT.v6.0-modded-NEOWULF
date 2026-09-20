# LAST_TASKS

## 2026-09-20 22:42 CEST — NEOWULF v6 R4 ultra-detail full skin pass

**STATE:** IN_PROGRESS

**OBJECTIVE:** Rework the functional NEOWULF Winamp Modern skin to the highest practical detail level while preserving Winamp compatibility. Runtime PNGs must remain truecolor RGBA; new artwork is rendered from 4x/8x supersampled masters and downsampled with high-quality filtering.

**USER REQUIREMENTS / HARD GATES:**
- No 16-bit/paletted-looking artwork; all generated runtime PNGs must be 32-bit RGBA truecolor.
- No black boxes behind LED indicators and no oversized round “clown nose” LEDs.
- VU Meter Left/Right is no longer an analog needle display. Replace it with a bright digital black-glass meter: white scale/detail + intense red/white signal animation.
- Fully black display glass for VU, spectroscope/oscilloscope and EQ readouts; remove the ugly light-grey haze.
- VU animation must remain inside the display aperture only; no red bars bleeding over chassis/frame structure.
- Digital VU gets a higher-motion fire-like response driven by Winamp left/right VU data.
- Keep native Winamp song-data visualization for spectroscope/oscilloscope.
- Add three new oscillator deck components using native Vis data.
- Teufel MK Ultra style speaker towers become approximately 3x the current height.
- Left/right towers must be true mirror counterparts: cabinet, trim, light direction and driver bezels are mirrored rather than duplicated.
- LP/platter: no decorative rotating stripes and no baked light rotating with vinyl. Physical vinyl rotates; deck/stylus/reflections stay fixed.
- Metal finish: very fine brushed Black Steel / machined metal micrograin, no coarse periodic stripes.

**CURRENT IMPLEMENTATION PLAN:**
1. Generate R4 truecolor supersampled assets for displays, LEDs, VU fire animation, EQ chassis and tall mirrored speaker towers.
2. Replace analog VU XML with digital Left/Right black-glass display and 120-frame (40 levels x 3 motion phases) fire animation.
3. Upgrade horizontal/vertical/main-player VU overlays to the same 120-frame engine.
4. Add 3 native oscillator decks (wide fire trace, dual L/R trace, mirrored overlay trace).
5. Replace round LED sprites globally with transparent integrated slot/micro-LED optics.
6. Rework EQ and display frames to eliminate white/grey haze.
7. Build 64-frame mirrored speaker cone animation and 3x-height towers.
8. Preserve R3 physically-correct LP layer separation.
9. Validate PNG mode, display black level, LED geometry, speaker height/mirroring, VU containment, oscillator-deck count, XML references, and WAL ZIP integrity.
10. Commit source generator, MAKI sources/binaries, XML and validators to GitHub; build an R4 WAL.

**PLANNED_FILES:**
- tools/apply_neowulf_v6_ultra_detail.py
- tools/validate_neowulf_v6_ultra_detail.py
- tests/test_ultra_detail_source.py
- XML/vu-meter-analog.xml
- XML/vu-meter-digital-horizontal.xml
- XML/vu-meter-digital-vertical.xml
- XML/loudspeaker-left.xml
- XML/loudspeaker-right.xml
- XML/neowulf-oscillator-decks.xml
- skin.xml
- SCRIPTS/neowulf-vu-fire-r4.m / .maki
- SCRIPTS/neowulf-speaker-r4.m / .maki
- README.md
- docs/ULTRA-DETAIL-R4.md
- LAST_TASKS.md

**DO_NOT_REPEAT:**
- No generated concept image instead of editing the actual skin.
- No fake/static green bars.
- No analog needle VU for Left/Right.
- No broad grey bloom over displays.
- No round red LED noses with black square backgrounds.
- No identical left/right tower artwork.
- No rotating LP lighting.
