# Hellfire required coverage and acceptance

Parent objective: deliver the actual mandatory Hellfire design as a functional Winamp skin. User rejected another intermediate concept substitute. Scope is not reduced by partial source tests. No current row below establishes final native acceptance unless explicitly stated.

Reference: `design/approved-reference.png`, SHA256 c30cbc667325b5c8b2238dafaf54aea6006d0631f0795bb6221554c19a7e02b3. Original Quinto CT 5.1 ZIP: d926537bd21978d498d9781b15e733bab21ab28da0bf696e1307132d2e6066d1. Production asset hashes and real dimensions: `design/assets/manifest.json`.

| Required item | Current implemented source / evidence | Remaining acceptance and dependency |
|---|---|---|
| Main player and vinyl | Native transport, live song/time, volume drag/wheel; separate spinning vinyl, fixed reflection, slowly moving arm, power easing; compiled main script pinned | Windows: live controls, mounting/lighting/spin/arm appearance; dynamic album-art label still open |
| Equalizer | Ten native band parameters, reset and enable controls; real asset/control mappings validated | Windows: band order, response, preamp, reset and geometry |
| Three distinct oscillator decks | Native waveform, waveform with separate L/R levels, spectrum; three independent IDs | Windows: independent display modes and controls. Legacy waveform is mono; stereo PCM belongs to WebView |
| Oscilloscope | Native audio-driven waveform plus separate DSP/WebView oscillator renderer | Real one-sided PCM test through installed bridge; scope geometry and waveform behavior |
| Virtualizer | Independent WebView component, FFT/fire/radial modes in actual JS | Real Winamp DSP packets and mode changes in WebView |
| TV visualization | Native visualization GUID, mono spectrum fallback, preset/config/fullscreen actions; four distinct case edges | Windows visualization plugin, native actions and geometry; native CRT overlay still open |
| Analog VU L/R | Separate native L/R needle layers and meter calls in compiled main runtime | Windows: needle origin, scale, channel response and damping |
| Digital VU L/R | Separate native 48-element L/R rows and independent WebView Fire VU | One-sided native audio and visibility/geometry acceptance |
| Horizontal VU | Native L/R elements and independent WebView horizontal renderer | Windows/native bridge channel behavior, scale and geometry |
| Vertical VU | Independent WebView component and separate stereo rows | WebView channel/geometry and measured paint acceptance |
| Five Teufel Ultima MK II speaker modules plus subwoofer | Two towers, two rear cabinets, center and sub; six independent containers with nine separate cone layers; recovered compiled speaker script receives L, R or mixed levels | Windows cone appearance/motion and independent docking; paired right-facing perspective still open. Visual 5.1 uses stereo levels, not six-channel audio |
| Electribe 2 Synth | Original software engine and separate component; 16-part/64-step project model passes validation | Real pads, controls, sound, sequencer, export, storage and timing in WebView |
| Electribe 2 Sampler | Separate model/component; 16-part/64-step project model passes validation; source sample import/edit/reverse/loop | Real import, cut, reverse/loop, sound, sequencing and project/export persistence |
| EMX-1 | Separate model/component; 14-part/128-step project model passes validation; source synth/drum parts | Real part distinction, sound, sequencer, controls, persistence and export |
| Every deck moves/docks independently | Exactly 24 required containers; own drag surfaces; no nodock; native menu and individual close controls; all statically checked | Actual Windows dragging, reopen and docking, including plugin components; no startup overlap/offscreen acceptance yet |
| Brushed metal, Fire LEDs and detailed resolution | Immutable separate chassis/cone/knob/vinyl/arm assets; small meter cases remain reference crops; Fire color gradient source checked | Full detailed 4K coverage and runtime visual comparison still open; every-deck power lighting remains open |
| Editable backend headers | Recovered older backend/title sources exist | Integrate current headers/config UI with newly compiled matching MAKI; current R2 headers are not yet editable |
| At least 20 FPS, preferred 30 | Actual JS uses a 30-Hz paint policy; deterministic clock checks pass at simulated 60-Hz input. Native main exposes timer telemetry | Measure actual browser and native Winamp visible paint/audio cadence on Windows; timer telemetry and simulated cadence are not actual native FPS proof |
| Deterministic build / source traceability | Base/assets pinned; clean staging; fixed ZIP metadata; XML/PNG/control/script/container/socket guards and negative checks pass | Repeated archive/hash readback and source publication recorded per checkpoint; this does not close runtime rows |
| Companion installation / reproducibility | JS and authored MAKI source recovered; exact three DLLs pinned | New UI/skin/DLL bundle must be installed only in isolated profile; bridge C++ source still absent; complete source-reproducibility open |

## Ready checks and constrained checks

Local source/archive checks are executable now. The Node VM report in `verification/20261009-signal-contract.json` is labeled with its limited environment and does not claim sound or hardware FPS. The actual-stage negative checker in `tests/test_reference_layout.py` rejects missing assets, invalid image regions, empty speakers and a missing native menu, then restores the valid stage.

Original real Edge/CDP suite: `studio/tools/test_reference.cjs`; current browser capability is unavailable. Native Windows checks use BMAX's existing isolated installation only after directly observing availability and reconciling its current repository/profile. BMAX is offline at this checkpoint. Do not duplicate historical jobs or replace the main user installation.

On renewed Windows capability, execute in dependency order: reconcile source and profile; compile changed MAKI if any; package/copy skin and companion UI under verified paths with rollback; run three-instrument sound/sample/export/storage tests and one-sided DSP tests; inspect every deck and docking; measure real visible cadence. Preserve this matrix until every required acceptance is closed or the user explicitly changes scope.

Global governance route publication is separate: normal local-first authentication is unavailable on inspected hosts. Project-local records are persistent and subordinate; canonical global Winamp registration remains pending, not silently synchronized.
