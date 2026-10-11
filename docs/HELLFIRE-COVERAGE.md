# Hellfire required coverage and acceptance

Parent objective: deliver the actual mandatory Hellfire design as a functional Winamp skin. User rejected another intermediate concept substitute. Scope is not reduced by partial source tests. No current row below establishes final native acceptance unless explicitly stated.

Reference: `design/approved-reference.png`, SHA256 c30cbc667325b5c8b2238dafaf54aea6006d0631f0795bb6221554c19a7e02b3. Original Quinto CT 5.1 ZIP: d926537bd21978d498d9781b15e733bab21ab28da0bf696e1307132d2e6066d1. Production asset hashes and real dimensions: `design/assets/manifest.json`.

| Required item | Current implemented source / evidence | Remaining acceptance and dependency |
|---|---|---|
| Main player and vinyl | Real R4 Winamp black disc/red wolf label, changing angles and live playback observed; shaft calibrated to (394,82), fixed Region/reflection; cache-clear repair and GUI-resolution FX; matching binaries and 720-angle checks PASS | Native control interactions and full appearance acceptance; dynamic album-art label still open |
| Equalizer | Ten native band parameters, reset and enable controls; real asset/control mappings validated | Windows: band order, response, preamp, reset and geometry |
| Three distinct oscillator decks | Native waveform, waveform with separate L/R levels, spectrum; three independent IDs | Windows: independent display modes and controls. Legacy waveform is mono; stereo PCM belongs to WebView |
| Oscilloscope | Native waveform plus DSP/WebView source; actual Edge oscillator passes one-sided PCM, fade and about 30 FPS | Real PCM through installed native bridge; scope geometry and waveform behavior |
| Virtualizer | Independent WebView component; actual Edge renderer passes one-sided FFT/PCM, fade and about 30 FPS | Real Winamp DSP packets and mode changes in native WebView |
| TV visualization | Native visualization GUID, mono spectrum fallback, preset/config/fullscreen actions; four distinct case edges | Windows visualization plugin, native actions and geometry; native CRT overlay still open |
| Analog VU L/R | Separate native L/R needle layers and meter calls in compiled main runtime | Windows: needle origin, scale, channel response and damping |
| Digital VU L/R | Native 48-element L/R rows; actual Edge Fire VU passes channel separation, fade and about 30 FPS | One-sided native audio and visibility/geometry acceptance |
| Horizontal VU | Native L/R elements; actual Edge horizontal renderer passes channel separation, fade and about 30 FPS | Native bridge channel behavior, scale and geometry |
| Vertical VU | Independent component/stereo rows; actual Edge vertical renderer passes channel separation, fade and about 30 FPS | Native WebView channel/geometry and paint acceptance |
| Five Teufel Ultima MK II speaker modules plus subwoofer | Two towers, two rear cabinets, center and sub; six independent containers with nine separate cone layers; recovered compiled speaker script receives L, R or mixed levels | Windows cone appearance/motion and independent docking; paired right-facing perspective still open. Visual 5.1 uses stereo levels, not six-channel audio |
| Electribe 2 Synth | Actual Edge 16-part/64-step suite passes pads, controls, running 48-kHz audio, nonzero WAV, sample decode/reverse/loop, sequencer and storage/reload; about 30 steady FPS | Native Winamp WebView input/audio routing and audible output; full sound/part distinction |
| Electribe 2 Sampler | Actual Edge 16-part/64-step suite passes pads, controls, audio/WAV, import/decode/reverse/loop, sequencer and storage/reload; about 30 steady FPS | Native Winamp WebView routing/audio, cut editing and complete persistence interactions |
| EMX-1 | Actual Edge 14-part/128-step suite passes controls, audio/WAV, sample/sequencer/storage; about 30 steady FPS | Native WebView routing/audio and complete synth/drum part distinction |
| Every deck moves/docks independently | Exactly 24 required containers; own drag surfaces; no nodock; native menu and individual close controls; all statically checked | Actual Windows dragging, reopen and docking, including plugin components; no startup overlap/offscreen acceptance yet |
| Brushed metal, Fire LEDs and detailed resolution | Immutable separate chassis/cone/knob/vinyl/arm assets; small meter cases remain reference crops; Fire color gradient source checked | Full detailed 4K coverage and runtime visual comparison still open; every-deck power lighting remains open |
| Editable backend headers | Recovered older backend/title sources exist | Integrate current headers/config UI with newly compiled matching MAKI; current R2 headers are not yet editable |
| At least 20 FPS, preferred 30 | Three real instrument and five real visualization Edge measurements pass about 30 steady FPS. Native 180-label screen samples show 16.2745 visible changes/sec lower bound; 90 full captures sample 12.2869/sec | Native ≥20 FPS remains open, including other decks; capture rate/lower bound and timer telemetry are not a full native FPS claim |
| Deterministic build / source traceability | Base/assets pinned; clean staging; fixed ZIP metadata; XML/PNG/control/script/container/socket guards and negative checks pass | Repeated archive/hash readback and source publication recorded per checkpoint; this does not close runtime rows |
| Companion installation / reproducibility | JS and authored MAKI source recovered; exact three DLLs pinned | New UI/skin/DLL bundle must be installed only in isolated profile; bridge C++ source still absent; complete source-reproducibility open |

## Ready checks and constrained checks

Local source/archive checks are executable now. The Node VM report in `verification/20261009-signal-contract.json` is labeled with its limited environment and does not claim sound or hardware FPS. The actual-stage negative checker in `tests/test_reference_layout.py` rejects missing assets, invalid image regions, empty speakers and a missing native menu, then restores the valid stage.

Actual owned BMAX Edge 155/CDP suite: `studio/tools/test_reference.cjs`, [results](verification/20261011-embedded.json); server/browser children closed after PASS. `build_instrument.cjs --check` verifies the actual HTML-loaded classic bundle. Startup and steady measurements remain separate. BMAX's existing isolated Winamp 5.9.2 loaded the verified R4 package with its own new profile; [native evidence](verification/20261011-native.json) proves visible main-disc motion and mounting. Native bridge/deck acceptance is separate. Original WAL/DLLs/profile and UI rollback copies are preserved.

Continue from the R4 native profile: inspect actual installed WebView/DSP routing and audio/control integration; test every deck close/reopen/drag/dock and native visible cadence. Changed MAKI must be compiled with pinned MC twice and have its lock updated before staging. Preserve this matrix until every required acceptance is closed or the user explicitly changes scope.

Global governance uses BMAX ordinary owner Git in a separate current-main checkout. The diverged original checkout is preserved. Native retained-source validation and VerifyPush pass after the 24-KiB bootstrap repair (2d0617e); canonical Winamp registration follows the verified source checkpoint through scoped route/state/index publication. Project-local records remain subordinate.
