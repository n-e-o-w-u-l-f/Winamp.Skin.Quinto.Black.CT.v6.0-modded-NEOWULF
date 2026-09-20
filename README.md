# NEOWULF v6

**NEOWULF** is a Quinto Black CT based Winamp Modern skin overhaul with a high-detail Black Steel / machined-metal / restrained red-amber illumination design language.

The repository contains the NEOWULF-specific runtime drivers, reproducible transformation tools and validation rules. Large generated animation atlases are treated as build products rather than duplicated source files.

## Current implementation

- 120-step vinyl/LP rotation path with correct 33⅓ and 45 RPM timing
- **R3 turntable correction:** no red sector stripes and no light/reflection baked into the rotating LP
- fixed platter/stylus illumination on a separate non-animated layer
- machined platter rings and fixed strobe dots
- 32-step loudspeaker cone animation
- 40-step LED/VU meter drivers with smoother attack/decay
- native song-driven Winamp spectrum analyzer
- thin/high-detail analyzer mode with 60 FPS request
- dark-red → amber analyzer response; no green fake spectroscope bars
- near-black display glass with restrained red glow
- fine brushed-steel micrograin treatment
- compiled MAKI runtime drivers

## Reference design direction

The supplied NEOWULF reference is the target, not the previous over-stylized LP experiment. Turntable lighting is fixed in deck coordinates, metal grain is fine rather than coarse striping, and decorative red geometry is kept off the vinyl surface.

See:

- `docs/TURNTABLE-REFERENCE-DESIGN.md`
- `docs/DISPLAY-SPECTROSCOPE.md`

## Build / validation

Apply the R3 turntable pass to an extracted functional NEOWULF/Quinto build:

```bash
python tools/apply_neowulf_v6_reference_design.py <skin-root>
python tools/validate_neowulf_v6_turntable.py <skin-root>
```

The generator creates the two 60-frame LP banks from a deterministic black-vinyl master and wires the fixed reflection layer into `vinyl-record-player.xml` / `elements.xml`.

## Base

Derived from Quinto Black CT by PeterK. NEOWULF-specific changes are maintained here as source, build tooling and compiled compatibility/runtime drivers.
