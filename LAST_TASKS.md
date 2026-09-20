# LAST_TASKS

## 2026-09-20 23:55 CEST — NEOWULF v6 R4.1 ultra-detail correction

**STATE:** VERIFIED_LOCALLY

**OBJECTIVE:** Make the visible functional skin match the requested high-detail direction rather than merely adding hidden R4 assets.

**COMPLETED:**
- Replaced generic round/framed LED artwork with transparent thin micro-slot emitters while retaining original atlas coordinates for compatibility.
- Replaced the framed round power lamp with a flush horizontal red slot.
- Removed `group.power.indicator` from the digital Left/Right VU component.
- Rebuilt Left/Right VU response as a 120-frame segmented red / orange / white-hot digital animation on black glass.
- Kept VU animation inside the black display aperture.
- Made all three native Winamp oscillator decks visible on first load: Fire Wide, Dual L/R, Twin Mirror.
- Kept oscillator input routed to real Winamp `Vis` audio data (channels 1/2/3, mode 2, 60 FPS request).
- Enforced 298x1044 towers and exact horizontal mirroring of the right cabinet and 64-frame right driver atlas.
- Preserved R3 LP physical-light separation.
- Built `NEOWULF-v6.0-ultra-detail-r4.1.wal`.

**VERIFIED:**
- R4.1 validator passes.
- Key generated assets are RGBA truecolor.
- LED background frames are transparent and active emitters are narrow slots.
- VU high frame contains strong red response and white-hot tips.
- All three oscillator decks are default-visible and use native Vis objects.
- Right tower is pixel-exact mirror of left.
- WAL ZIP integrity passes.
- SHA-256: `1306138d173a5330e4814b452fd762bdebef22693857ef8bd6b2aabe4d9e668d`.

**CURRENT_STAGE:** R4_1_VISIBLE_QA_CORRECTION

**NEXT_ACTION:** Continue per-component visual QA in Winamp, then freeze the skin and derive the NSIS installer.

**DO_NOT_REPEAT:**
- No hidden-only feature implementation presented as a visible redesign.
- No round framed LEDs or opaque black LED boxes.
- No analog needle face for Left/Right VU.
- No fake song-independent spectroscope.
- No identical unmirrored speaker cabinets.
- No rotating LP lighting.
