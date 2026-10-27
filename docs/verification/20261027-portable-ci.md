# Portable verification and CI diagnosis — 2026-10-27

State: **LOCAL PORTABLE PASS / GITHUB CI BLOCKED / NATIVE ACCEPTANCE OPEN**.

Baseline: PR #2 head `5bce3f415f5830c9ecc7f9bffbccaf24c2049100`, base `ee859d3ba65dcc2ca00856c3f5d8a705f4820341`. This record supersedes the queued/unknown-cause CI status in the previous dated checkpoint; it does not replace the mandatory `docs/HELLFIRE-COVERAGE.md` matrix.

During verification, the remote PR advanced to `ae47edad7ac79a7e98dcd44f5a742102dc92d285` with PCM-only RMS meter fallback and regression coverage. These commits were fetched and preserved by rebasing this correction on that head. The combined Node suite was executed again and its retained JSON regenerated. The Python/bundle sources and workflow were unchanged by those intervening commits.

## Actual CI failure

Fresh API reads of [run 40245775913](https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF/actions/runs/40245775913) show two completed jobs:

- [Ubuntu job 121326909404](https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF/actions/runs/40245775913/job/121326909404): `failure`, 2026-10-25 23:39:54–23:39:56 UTC, runner ID 0, no steps. Its failure annotation states: “The job was not started because your account is locked due to a billing issue.”
- [Self-hosted job 121326909599](https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF/actions/runs/40245775913/job/121326909599): `cancelled`, runner ID 0, no steps; annotation reports the maximum waiting time of 24 hours was exceeded.

The API also includes a notice about the Ubuntu image migration; that notice is not the failure annotation. Raw job metadata and annotations are retained in `20261027-actions.json`. The connector rejected check-run annotation URLs as unsupported; the public REST endpoint was then read directly. This is ordinary repository diagnostics, not an alternate remote desktop route.

No workflow step or test assertion ran. Changing test code, runner image or checkout cannot resolve the reported account lock. Hosted CI needs the account billing lock resolved; self-hosted CI needs a matching available runner. Neither action was performed or claimed. No workflow rerun or runner migration was used to evade the block.

The subsequently observed [run 40457465778](https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF/actions/runs/40457465778), for `ae47eda`, was queued at observation. Its eventual outcome is not inferred from the older failure.

## Executed local verification

Fresh isolated clone of the PR branch on the local Windows machine. Initial Python 3.15 attempts failed because Pillow was absent; those are dependency failures, not test passes. A separate environment outside the checkout was provisioned with CPython 3.11.16 and Pillow 11.3.0, matching the workflow's Python minor version and pinned image dependency. Node was v26.8.1 (CI specifies Node 22); no CI-environment equivalence is claimed.

All of the following completed with exit code 0:

- `python -B tests/test_display_pipeline.py`: display fixture/validation.
- `python -B tests/test_turntable_source_assets.py`: turntable source invariants.
- `python -B tests/test_vinyl_rotation.py`: 720 phases each for main and standalone; native runtime remains explicitly unverified.
- `node tests/test_signal_contract.cjs`: all five visualizer contracts and three instrument project-model contracts; output saved in `20261027-signal-contract.json`.
- `node studio/tools/build_instrument.cjs --check`: HTML-loaded classic bundle matches maintained source.
- In-memory Python compilation: 20 files; existing MAKI signature checks: 21 binaries. Signature inspection does not execute or rebuild MAKI.
- `git diff --check`.

## Regression correction

The transport diagnostic used `0` both as a valid `performance.now()` timestamp and as an absence marker. A real packet received at clock zero therefore reported `lastPacketAgeMs: null`. Added assertions first reproduced an exit-1 failure (`actual: null`, `expected: 0`) against the baseline implementation. The minimal fix uses `null` for the absent timestamp and checks it explicitly. The complete Node contract suite then passed for every renderer, including age zero, elapsed age 25 ms and the existing source-switch reset assertions.

## Preserved acceptance requirements

No native Winamp, DSP/WebView hardware, visible native ≥20 FPS, 24-deck close/reopen/drag/docking, complete design/4K, Teufel cabinet or audible synth acceptance is claimed. The remote desktop quota was not probed or bypassed. `main`, installed DLLs, R4 WAL, compiled scripts and existing backups were not changed. PR #2 remains draft and unmerged. Local source/VM checks cannot close the native rows of `docs/HELLFIRE-COVERAGE.md` or `LAST_TASKS.md`.

## 2026-10-27 continuation — ignore non-audio WebView messages

- **Root cause reproduced from current PR source:** `receive({type:'control',action:'resize',width:1920,height:1080})` was counted as audio, replacing a nonzero PCM meter reading with silence while marking playback as active. A host WebView2 page can receive non-audio control events through the same message handler; accepting arbitrary objects is unsafe.
- **Fix:** `receive` now rejects events without a finite audio-level field, a supported PCM/wave/spectrum sample-array field or an explicit `playing:false` stop indicator. Invalid messages increment `transport.rejected` without changing the previous `packet`, the accepted count or the origin counters. Stop-only messages remain valid.
- **Regression checks:** The committed Node test adds a non-audio control packet, verifies unchanged packet identity and counters, checks explicit stop, and repeats the non-audio rejection via the WebView listener. Syntax of patched source/test was checked. Independent V8 execution of the exact proposed source passed in all five renderers with 60 accepted Winamp PCM packets, rejected non-audio events, correct right-only meter level and a simulated 30 Hz animation clock. **This was not an actual Node CLI, browser or native Winamp run.**
- **Environment limitation:** An additional attempted clean clone of the public GitHub PR into a separate disposable local verification container did not start because DNS could not resolve `github.com`. No code was copied or test executed there. This cannot be counted as a test failure or PASS. The pre-existing 2026-10-27 local Python/Node verification above precedes this new fix and does not certify it.
- **State:** Separate PR branch only; no native DLL/WAL, compiled MAKI, `main`, remote Winamp or backup changes. GitHub Actions billing lock and unavailable self-hosted runner remain external blockers, pending a genuinely executed CI run.
