# LAST_TASKS

## 2026-09-21 16:12 CEST — NEOWULF v6 R5 full functional reference transfer

**STATE:** IN_PROGRESS

**OBJECTIVE:** Rebuild/reshape the functional NEOWULF Winamp Modern skin so the supplied Black-Steel / Hell-Machine reference language is applied consistently to the real runtime components. Do not preserve broken R4 framing or duplicated headers just because they already exist.

**OBSERVED R4/R4.2 DEFECTS TO REMOVE:**
- Transparent/empty bands between stacked decks caused by oversized container/layout/background geometry.
- Deck 1 can render no visible signal.
- Decks 2 and 3 are too visually similar/pixelated.
- Generated deck header frame is too tall and duplicates the component title.
- Titles such as WINAMP/NEOWULF or SPECTROSCOPE/SPECTROSCOPE overlap. Exactly one title is allowed.
- Left/Right digital VU thermal gradient is reversed.
- Loudspeaker windows/assets became disconnected from the usable skin.
- Several old Quinto component frames still look low-detail/light-grey compared with the reference.
- Existing R4 is not accepted as the target design.

**REFERENCE / FUNCTIONAL GATES:**
1. Preserve real Winamp Modern functionality and native audio data.
2. Use Winamp source behavior, existing Quinto XML and runtime testing as reference; no visual guessing.
3. One compact header/title per window, backend-configurable via a single component metadata/config source.
4. No oversized transparent margins between components.
5. Three distinct analysis decks:
   - Deck 1: stereo oscilloscope, mode=2, channel=3.
   - Deck 2: independent L/R oscilloscopes, mode=2, channels 1 and 2, visibly different rendering from Deck 1.
   - Deck 3: spectrum/fire analyzer, mode=1 using frequency-domain data; not another oscillator copy.
6. Digital VU L/R: fully black glass; brightest white/yellow energy at the baseline/bottom, grading upward through yellow/orange/red to dark red.
7. Loudspeaker containers must be present in skin.xml/menu/config and use the tall mirrored MK-Ultra assets.
8. LP physics from R3 remains mandatory: vinyl material rotates; platter/stylus/reflections remain fixed.
9. Runtime assets are truecolor RGBA generated from supersampled masters; no paletted/16-bit-looking gradients.
10. Validate against the actual built WAL, not only isolated XML snippets.

**CURRENT / NEXT:**
- Inspect current extracted R4.1/R4.2 build and original Quinto include/menu structure on the self-hosted Linux machine.
- Identify exact source of inter-deck transparent bands (container coordinates, layout coordinates, alpha background, or component PNG alpha).
- Replace R4 deck framework rather than patching around it.
- Restore speaker inclusion/menu wiring.
- Rebuild the VU gradient and native analysis modes.
- Build a clean R5 WAL, run validators plus ZIP/XML/reference checks, then commit the real source changes to GitHub.

**DO_NOT_REPEAT:**
- No concept-image generation instead of editing the skin.
- No duplicate titles.
- No giant frame/header margins.
- No three near-identical analysis decks.
- No hidden/disconnected speaker windows.
- No analog VU needles.
- No rotating LP lighting.
