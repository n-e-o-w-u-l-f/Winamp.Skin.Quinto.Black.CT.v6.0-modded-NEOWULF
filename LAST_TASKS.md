# LAST_TASKS

## 2026-09-20 22:30 CEST — NEOWULF v6 R3 reference-design correction

**STATE:** IN_PROGRESS

**OBJECTIVE:** Correct the vinyl-record-player and overall material treatment to the supplied NEOWULF reference design. Rotating LP frames contain only physical record material; lighting/reflections remain fixed in deck coordinates.

**COMPLETED:**
- Removed the large red sector/stripe graphics from the LP design.
- Rebuilt the LP source as black vinyl with fine concentric grooves and restrained dark-red label detail.
- Preserved 120 unique rotation positions in two 60-frame banks.
- Kept 33⅓ RPM at 15 ms/frame and 45 RPM at 11 ms/frame.
- Moved stylus/platter/room light into `vrp.layer.fixed.reflection`, a normal non-animated layer.
- Kept the tonearm above the fixed-light layer.
- Rebuilt platter rims and fixed strobe dots.
- Reworked the turntable deck toward dark brushed Black Steel / machined-metal treatment without coarse stripes.
- Added deterministic generator, turntable validator, lightweight source-invariant test, design documentation and versioned R3 XML/source.
- Built local `NEOWULF-v6.0-reference-r3.wal`.

**VERIFIED LOCALLY:**
- Full R3 turntable validator passes.
- Generated LP frames contain no red sectors or bright baked light outside the center label.
- Fixed reflection/stylus light is static and ordered LP -> fixed light -> tonearm.
- ZIP/WAL integrity check passes.
- R3 WAL SHA-256: `1d3f2d7f02483549f4591fb48d3cb8290ecfa596bcef4fb63afd56791b54c11c`.

**STATE_MISMATCH / CI:**
- GitHub-hosted workflow runs failed before useful job logs/steps were exposed.
- Workflow strategy is now changed to the self-hosted Linux runner class `[self-hosted, Linux, X64]` instead of repeating the failing hosted-runner strategy.
- Repository CI result is pending after this commit; local validation is green.

**CURRENT_STAGE:** R3_TURNTABLE_REFERENCE_PASS_COMMITTED_CI_PENDING

**NEXT_ACTION:**
1. Confirm the self-hosted CI run.
2. Continue the same supplied-reference treatment across the remaining chassis/panels and upright Teufel MK Ultra speaker windows.
3. Freeze the finished WAL, then derive the NSIS installer from the Quinto installer flow.

**DO_NOT_REPEAT:**
- No rotating light/reflection baked into LP frames.
- No large red stripes/sectors on vinyl.
- No coarse chassis striping masquerading as brushed metal.
- No fake spectroscope bars unrelated to the song.
- No platter/speaker overlap.
