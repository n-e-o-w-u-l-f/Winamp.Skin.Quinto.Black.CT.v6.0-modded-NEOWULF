# Canonical Hellfire design transfer

The reference approved again by the requester on 2026-10-05 is `design/approved-reference.png`. Its SHA256 is pinned in `design/reference-regions.json`. These pixels are the chassis artwork; region definitions create individual decks without a replacement concept, frame tiling or extra text headers.

Studio instruments retain their existing original audio engine. The front panel uses two rows of eight pads, real rotary controls, live instrument audio and a separate sequencer view. Electribe 2 Synth, Sampler and EMX-1 remain separate models. Controls are not painted test substitutes. The instruments are independent original software, not proprietary Korg firmware emulation.

Build from the verified Quinto CT 5.1 archive with `python tools/build_reference_skin.py --base PATH --compiler PATH_TO_MC_EXE`. The compiler's directory must contain the pinned `lib/std.mi` and NSCRT runtime. Build outputs use fixed archive timestamps, sorted member order, immutable source hashes and native Modern-Skin controls. Real Winamp startup/docking/audio acceptance remains a separate gate.

## Open acceptance items

- The recovered native plugin DLL has no matching C++ source/build recipe in the scoped source workspace. Preserve and identify its exact binary; do not call the entire bundle source-reproducible.
- A photographed vinyl/arm in the immutable reference is not a separated moving asset. Separate high-resolution vinyl, reflection and arm layers and verify spin/arm/power easing before claiming the animation complete.
- Native meter response, first-load placement, frame alpha edges, speaker cone movement, TV CRT and full plugin installation need current runtime evidence. A screenshot of the original reference is not proof that these run.
- The input is 1672x941. Do not call a scaled copy newly detailed 4K artwork.

Keep the existing package untouched as a rollback while the reference implementation is being tested. The full parent scope in LAST_TASKS remains open until its original acceptance is verified.
