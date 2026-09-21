# LAST_TASKS

## 2026-09-21 12:46 CEST — NEOWULF v6 R4.2 functional correction pass

**STATE:** IN_PROGRESS

**OBJECTIVE:** Correct the actually observed R4.1 runtime defects in Winamp. Work from the functional skin structure and Winamp Modern Vis behavior, not from assumed appearance.

**OBSERVED DEFECTS FROM WINAMP QA:**
- Oscillator Deck 1 has no visible signal.
- Oscillator Decks 2 and 3 currently look like the same pixelated animation instead of three genuinely different scopes.
- Digital VU L/R motion is better, but the gradient direction is wrong: the bottom must be brightest/white-hot and the signal must darken upward through yellow/orange into red/dark red.
- Loudspeaker skins disappeared from the usable skin.
- Generic frame/header added around the decks is too large.
- Added header text duplicates/overwrites the component's own title (for example WINAMP over NEOWULF, SPECTROSCOPE over SPECTROSCOPE). Exactly one title is allowed.
- Deck title/header behavior must be editable from backend configuration, not baked destructively into artwork/XML duplicates.
- VU Left/Right remains digital, bright and high-detail; do not restore analog needles.

**START / CURRENT:**
- Repository head verified before edits.
- Current R4.1 XML and generator inspected.
- Winamp source confirms Vis channel is a bitmask (left=1, right=2, stereo=3) and oscilloscope uses mode=2.
- R4.1 currently forces all three oscillator containers visible and gives them closely related mode=2 line renderers; this does not meet the visual/functional requirement.

**NEXT:**
1. Rebuild the three oscillator decks as distinct native-audio renderers:
   - Deck 1: robust stereo oscilloscope with explicit black-glass surface and visible native Vis.
   - Deck 2: dual-channel stacked L/R oscilloscope with different trace treatment.
   - Deck 3: spectrum/fire analyzer using native frequency data, not another copy of Deck 2.
2. Reverse the digital VU thermal gradient: bottom white-hot -> yellow -> orange -> red/dark red upward.
3. Restore loudspeaker containers and menu/config access; verify both XML includes and assets.
4. Replace oversized generic headers with compact frame geometry.
5. Remove duplicate/baked deck headings; use exactly one configurable title.
6. Add backend configuration entries for title visibility/text profile and deck visual mode where Winamp skin configuration permits.
7. Build R4.2 WAL from the real R4 package, validate XML references, Vis modes/channels, VU pixel gradient, speaker availability, and ZIP integrity.
8. Commit source generator, XML snapshots, validator, documentation and LAST_TASKS update to GitHub.

**DO_NOT_REPEAT:**
- No guessing that a feature is visible because an XML object exists.
- No three near-identical oscillator animations.
- No duplicate titles.
- No oversized title bars.
- No analog VU needles.
- No bottom-dark/top-white VU gradient.
- No hidden/disconnected loudspeaker windows.
- No rotating LP lighting.
