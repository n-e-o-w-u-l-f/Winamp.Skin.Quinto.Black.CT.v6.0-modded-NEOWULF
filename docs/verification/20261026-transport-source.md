# Audio transport preflight — 2026-10-26

State: **SOURCE-VERIFIED / CI-AND-NATIVE-ACCEPTANCE OPEN**.

## Scope and immutable baseline

- Base branch: `main` at `ee859d3ba65dcc2ca00856c3f5d8a705f4820341`. No changes to native WAL, compiled MAKI or installed Winamp files.
- Draft PR: [#2](https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF/pull/2), `fix/hellfire-pcm-channel-bounds-20261025`.
- Source files: `studio/engines/visualizer.js` plus `tests/test_signal_contract.cjs`.
- Existing coverage matrix in `docs/HELLFIRE-COVERAGE.md` remains mandatory.

## Implemented, code-level facts

1. Asymmetric input: a missing or empty left/right PCM channel is represented by silence, not a copy from the opposite channel, even when contradictory meter level metadata was supplied. Right-only PCM reaches the FFT and single-trace oscilloscope.
2. Bounded arrays: at most 8192 samples per PCM channel and 75 legacy spectrum/wave values are copied. Malformed or non-finite samples do not produce infinite canvas coordinates.
3. PCM-to-legacy packets explicitly clear previously computed PCM spectra.
4. WebView Winamp and BroadcastChannel Studio messages are accepted only when their matching source is selected; off-source messages count as ignored. Source changes clear cached PCM, stale levels, spectra and particles immediately.
5. Read-only diagnostics available from `window.neowulfVisualizer.transport`: `accepted`, `rejected`, `ignored`, `bySource`, `lastOrigin`, `selectedSource`, `lastPacketAgeMs`, `pcmChannels`. They report events inside the page, not external process or hardware status.

## Verification evidence and limits

- Isolated V8 execution from fetched PR source with a virtual requestAnimationFrame clock: five visualizer modes (`osc`, `fire`, `horizontal`, `vertical`, `virtualizer`) **PASS** a continuous left-only native-message simulation, studio right-only simulation, mismatched-source rejection, source-switch cache reset, stop/fade and finite canvas arguments. Each mode produced simulated 30 FPS. This is a source contract check, **not** actual Node CLI/browser/Winamp FPS.
- Separate direct V8 checks **PASS** empty-channel silence, PCM→legacy FFT clear, PCM/legacy array limits, hidden repaint pause and malformed input.
- GitHub Actions workflow has independent self-hosted and GitHub-hosted portable jobs. Run [40245263604](https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF/actions/runs/40245263604) showed hosted job `Portable source contracts (Ubuntu)` as **failure before any step** (runner_id=0, empty runner_name, empty steps, 3s completion); log download returned 404 BlobNotFound. No test assertion failure or root cause was observed. The self-hosted job remains queued. The workflow was not called successful.
- Native BMAX-B6 installation remains **unverified in this continuation**. Remote Desktop Commander reported its monthly usage cap; no alternate remote host/connection or retest was attempted.

## Exact native acceptance when the authorized Windows execution path is available

1. In the existing isolated R4 Winamp 5.9.2 profile, read back installed `gen_neowulf.dll`, `dsp_neowulf.dll`, `WebView2Loader.dll` hashes and the loaded WAL, without overwriting original or backup artifacts.
2. Inspect loaded WebView pages with developer/runtime instrumentation; select WINAMP AUDIO and verify `neowulfVisualizer.transport.bySource.winamp` increases from real DSP/WebView packets while `selectedSource==='winamp'`, `lastPacketAgeMs` remains bounded, and nonexistent L/R PCM channels stay silent. Positive counters from synthetic `neowulfAudio` injection do **not** count.
3. Select INSTRUMENT AUDIO; prove native Winamp packets no longer affect the page, Studio packets are accepted, and the old visual state resets. Check actual instrument audio output and input controls through the installed WebView2 components.
4. For all 24 native containers: menu open, close/reopen, drag, docking, startup visibility/geometry, interactions, and visual assets against the unchanged design matrix.
5. Capture pixels with real process identity/playback timestamps for main vinyl and other decks; require native visible ≥20 FPS (prefer 30). Do not equate browser virtual frame clocks or capture cadence with native FPS.
6. Full acceptance still includes remaining matrix rows: bridge C++ source reproducibility, album-art label, native CRT/preamp/editable headers, 4K details, all-deck lighting and speaker cabinet perspective.

**Next:** keep PR #2 draft until portable CI can execute and native R4 acceptance can be recorded. Avoid unnecessary reruns of denied remote tools or replacing the original verified WAL.
