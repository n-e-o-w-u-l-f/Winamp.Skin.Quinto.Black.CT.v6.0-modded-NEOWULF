# LAST_TASKS

## 2026-09-20 20:55 CEST — NEOWULF v6 display/spectroscope milestone

**STATE:** IN_PROGRESS

**OBJECTIVE:** Transfer the approved NEOWULF v6 high-detail Black Steel / Hell Machine design into the functional Winamp Modern skin and publish reproducible changes here.

**COMPLETED:**
- Replaced green analyzer palette with 16-step dark-red → amber response.
- Native Winamp song-driven spectrum analyzer retained; no fake generated bar animation.
- High-detail `bandwidth=thin` analyzer profile and 60 FPS request selected.
- Static Quinto visualizer bar/cover artwork disabled so audio data dominates.
- Display substrate changed to near black; red grid/reflection intensity reduced.
- Deterministic fine horizontal brushed-metal micrograin implemented for component artwork.
- `neowulf-vis-profile.m` compiled successfully with Nullsoft MAKI Compiler 1.2.0 / Winamp 5.66.
- Runtime profile driver added to repository to protect the visualizer profile against startup script races.

**VERIFIED:**
- No old green analyzer colors remain in the modified visualizer XML.
- Both main-player and standalone spectrum analyzer use mode 1 / thin / 60 FPS / peaks.
- Compiled MAKI has a valid Winamp MAKI binary signature.

**CURRENT:**
- Publish the modified XML, display atlases and reproducible display tooling to GitHub.
- Integrate the profile MAKI into both component XML groups in the packaged WAL.
- Continue high-resolution chassis refinement and upright Teufel MK Ultra tower-speaker geometry.

**NEXT:**
1. Commit XML/gamma/display atlas delta and validators.
2. Rebuild and validate the next WAL revision with runtime profile integration.
3. Continue tower-speaker assets and remove any platter/speaker overlap.
4. Build installer after the finished WAL is frozen.

**DO_NOT_REPEAT:**
- Do not use static green spectroscope bars.
- Do not replace real Winamp visualization data with a decorative fake.
- Do not overlap turntable/platter geometry with the tower loudspeakers.
