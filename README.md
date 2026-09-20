# NEOWULF v6

**NEOWULF** is a Quinto Black CT based Winamp Modern skin overhaul with a Black Steel / Hell Machine LED design language.

Current work targets a complete functional skin rather than a static mock-up.

## Implemented

- 120-step vinyl/LP rotation path with 33⅓ and 45 RPM control
- 32-step loudspeaker cone animation
- 40-step LED/VU meter drivers with smoother attack/decay
- Native song-driven Winamp spectrum analyzer
- High-detail thin analyzer mode (up to 75 bands), 60 FPS request
- Green analyzer palette removed; dark-red → amber response palette
- Near-black display glass with restrained red glow
- Fine brushed-steel micrograin pass for chassis artwork
- Compiled MAKI runtime drivers

## Visual target

Upright Teufel MK Ultra style tower loudspeakers, separate from the turntable; no platter/speaker overlap. Controls and chassis remain high-detail black steel, while displays stay darker than the illuminated controls.

See [docs/DISPLAY-SPECTROSCOPE.md](docs/DISPLAY-SPECTROSCOPE.md) for the analyzer implementation.

## Base

Derived from Quinto Black CT. NEOWULF-specific changes live in this repository and are being made reproducible as source, scripts and build tooling.
