# NEOWULF Hellfire · precision-deck implementation checkpoint
Date: 2026-10-31
Status: **SOURCE IMPLEMENTED / NATIVE VISUAL ACCEPTANCE OPEN**

## Target and provenance
This branch continues on top of the PCM/WebView fixes in draft PR #2. It does **not** overwrite the native R4 Winamp WAL, existing generated PNG assets, any DLL or the currently installed skin. The latest conversation design reference is the front-on NEOWULF HELLFIRE mockup with a symmetric speaker pair, a level main player, a level playlist, equal-sized EQ/Visualizer/OSC, and a large, richly controlled groovebox. The newly generated mockup image is **not yet committed as a binary reference asset**; the existing `design/approved-reference.png` remains the versioned baseline and must not be silently replaced or mislabeled.

## Implemented in repository source

### Native deck sizing and EQ containment
- Native EQ remains its verified internal geometry, `638 × 246`.
- Independent movable WebView deck containers `nw.deck.4` (OSC), `nw.deck.5` (Fire VU) and `nw.deck.8` (Virtualizer) now start at exactly `638 × 246` and share this minimum to avoid deforming the display. Their independent GUIDs, close buttons, headers, drag regions and component references remain intact.
- Native EQ preamp bar and slider are shifted from x=428 to x=408 (relative to their existing groups), retaining their existing action and images while giving the right-hand end of the slider track 20 pixels clearance; the left/other ten tracks remain unchanged. All 11 bars and sliders are statically checked for >=8 pixels of group-edge clearance.
- The high-detail instrument chassis overlay has a measurable padding defect fixed: the reference pads end at x=568; the three separate mode controls start at x=578 and are stacked vertically, with 10 pixels of separation. Both fit within the 665 x 241 reference-face bounds. No generic CSS skew/perspective distortion is introduced.

### Fire and visualizer confinement and peak
- Visualizer canvas uses a paint-contained glass display; its fire canvas/overlay remain inside the dedicated `.display` viewport, not the chassis frame.
- A functional PEAK slider (1.0–4.0, default 1.5) modifies *display gain only* in Fire, horizontal/vertical VU and Virtualizer calculations, with clamping at full scale. It does not synthesize, scale or transmit PCM to Winamp.
- Stereo signal paths and source separation from PR #2 remain; the five visualizer modes require native WebView2/DSP acceptance.

### Original KORG-style synth/sampler/EMX feature expansion
- Existing real 16-part synth/sampler, 14-part EMX engine, 64/128-step sequencer, bank/pattern switching, sample import, loop/reverse, motion recording, synchronized decks, MIDI IN and WAV export are preserved.
- Added **working** LP/BP/HP filter selector, per-part sustain envelope (ADSR sustain parameter), rate-controlled sine LFO driving the actual Web Audio filter frequency, and LFO depth. Parameters are clamped and rehydrated when opening older project JSON; numeric values participate in step motion parameter locks.
- Updated the maintained ES module, the UI module, actual Winamp-WebView HTML, **and the generated classic WebView bundle**. The committed bundle was byte-compared to the maintained modules using the exact build rule. A double-start bug for the LFO oscillator was caught in an isolated mocked Web Audio graph and corrected before this checkpoint.
- Note: This is an original KORG-*inspired* engine. It does not contain KORG's firmware, licensed factory samples, hardware DSP algorithms, or claim complete one-to-one Electribe hardware feature parity.

## Verification
- Source-level invariant test `tests/test_hellfire_precision.cjs` checks four equal default deck footprints (including EQ), 11 aligned EQ bar/slider pairs, output bundle equality, old-project migration, 3 instrument models, filter routing, one-time LFO start, true envelope sustain scheduling and interactive visualizer peak gain.
- This test source was exercised in a V8 isolate with mocked Node file and vm adapters and an intentionally mocked AudioContext: **PASS**; `paintGain=2.5`, virtual clock ~30 Hz in the Fire test. A direct independent mocked audio graph execution also passed.
- Workflow now includes `node tests/test_hellfire_precision.cjs` and `node studio/tools/build_instrument.cjs --check` in both portable and self-hosted jobs. An actual native Windows session, audible output, browser pixels, full Node suite, actual CI or real native >=20 visible FPS was **not** verified in this session. Hosted GitHub Actions were previously blocked by an account billing lock; self-hosted runners were unavailable. Do not infer any new run's status before checking it.

## Required next acceptance
1. Import and pin the **new** user-approved front-on mockup bitmap as a distinct versioned reference, without overwriting the original approved file. Generate separate native-resolution straight-on assets for speakers/main player/playlist and inspect crops before changing runtime bindings.
2. Complete visual source-to-runtime matching for the rest of the 24 deck matrix; avoid stretched sprites, bleeding EQ graphics, shifted buttons and transparent frame seams. Verify 100%/150%/200% DPI and 1080p/4K.
3. Expand the working synth beyond the verified additions: expression/motion destinations, tempo sync, user sampler editing, insert/master FX, preset and modulation matrix parity as demonstrable audio or sequencing functions, not placeholder switches.
4. Test every native container's individual close/reopen, drag/dock/resize, actual Winamp DSP signal transport, original/updated DLL hashes, speaker motion and native visible ≥20 FPS. **No native release until the full matrix passes.**
