# Canonical Hellfire design transfer

The mandatory design is `design/approved-reference.png`, approved again on 2026-10-05. Its exact SHA256 is pinned in `design/reference-regions.json`. Separate production chassis, flat vinyl, arm, knob and cone assets are pinned with actual dimensions and bitmap boxes in `design/assets/manifest.json`. Main, EQ, scope, instrument and speaker cases use these assets; remaining small meter/oscillator cases use regions of the mandatory design. Neither a concept image nor an enlarged screenshot establishes a completed skin or new 4K detail.

The native builder now produces 24 independently named containers. Six speaker cabinets contain nine separate cone layers driven by the recovered compiled speaker MAKI. The TV contains Winamp's visualization component, an audio-driven mono spectrum fallback and native preset/configuration/fullscreen controls. Its four distinct case-edge regions preserve the corners without tiling or stretching a complete frame. Actual geometry, movement, audio response and docking remain Windows acceptance items.

The main player has native transport, song/time displays and interactive volume. Its compiled MAKI animates a separate vinyl layer, a slowly eased arm, stationary reflection and power lighting. The static artwork is not runtime evidence. The native system-menu action, copied from the original Quinto implementation, keeps the windows accessible from the upper-left screw. Native menu enumeration is still to be observed in Winamp.

Classic Winamp mini-Vis data is mono. An unsupported XML `channel` attribute cannot create stereo waveforms; it has been removed. The three native oscillator cards use waveform, waveform plus separate native L/R levels, and spectrum. True separate PCM and FFT channels are implemented by the DSP/WebView renderer. A missing right PCM channel is zero-filled and identified as L-only instead of copied from the left. Normalized PCM and legacy data are clamped so extreme inputs cannot create infinite canvas coordinates. Primary maintainer evidence for the mini-Vis limitation: <https://getwacup.com/community/index.php?topic=1757.0>.

Studio instruments retain their original software audio engine. Synth and Sampler have 16 parts and up to 64 steps; EMX has 14 parts and up to 128 steps. Pads, controls and sequencing are implemented in source, with a separate sequencer view. These are original software instruments, not proprietary Korg firmware or exact hardware emulation. Model validation tests do not establish actual audio output.

## Build and verification

Build from the verified Quinto CT 5.1 archive:

```sh
python3 -B tools/build_reference_skin.py --base PATH_TO_VERIFIED_ZIP --output BUILD
python3 -B tests/test_reference_layout.py BUILD/skin
node tests/test_signal_contract.cjs
```

`--compiler PATH_TO_MC_EXE` recompiles the main script when the real compiler and its pinned `lib/std.mi`/NSCRT are available. Otherwise the source-pinned compiled main binary and unchanged recovered speaker binary are packaged. Do not modify MAKI source and claim its old binary compiled the change.

Build staging is recreated from the verified archive, preventing stale files from leaking into the WAL. ZIP member ordering, timestamps and permissions are fixed. Validation checks XML, actual PNG bounds and references, compiled signatures, all required containers, drag surfaces, menu/volume/EQ controls, includes and cone sockets. Negative tests mutate the real generated stage and restore its original bytes in `finally`.

The Node VM suite executes the actual JS source with controlled time, seeded particle randomness and checked canvas coordinates. It covers L/R separation, missing-channel silence, stop/stale decay, malformed/extreme data, hidden painting, the 30-Hz cadence policy and three project models. Its output explicitly excludes browser audio-device and native Winamp proof. The real Edge/CDP suite in `studio/tools/test_reference.cjs` remains pending.

The WAL alone does not install the WebView/DSP companions. The preserved bridge expects the UI files under `Winamp/Plugins/NEOWULF`, with WebView2Loader beside them, and `gen_neowulf.dll`/`dsp_neowulf.dll` in `Winamp/Plugins`. Original isolated installation instructions and pinned binaries must be reconciled on the available test host before replacing that profile. Never describe a new WAL as an installed full bundle.

## Open acceptance items

- The native plugin C++ source/build recipe is absent. Prebuilt DLL hashes are preserved in `docs/RECOVERED-HELLFIRE-20261005.json`; the entire bundle is not yet source-reproducible.
- BMAX is offline; no current Winamp startup, control, geometry, cone response, docking, audio or measured frame-rate acceptance has been performed with this new build.
- Full detailed 4K case coverage and matched left/right speaker perspective remain open. Actual source dimensions are recorded; scaled copies are not new detail.
- Editable native header strings, dynamic album art on the vinyl label, lighting for every deck and native TV CRT treatment remain open.
- Verify all three instruments independently for live sound, sample playback/editing, exports, storage, sequencer timing and linkage in the real WebView runtime.

The complete scope is retained in [the coverage matrix](HELLFIRE-COVERAGE.md). Keep the original package and isolated installation intact as rollback until the new package passes the actual runtime gates.
