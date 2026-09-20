# NEOWULF v6 display and spectroscope

The visualizer is not a painted bar animation. NEOWULF uses Winamp Modern's native `<Vis>` object so the analyzer follows the currently playing audio data.

## R2 display profile

- Spectrum analyzer mode: `mode=1`
- High-detail analyzer: `bandwidth=thin` (up to 75 bands)
- Requested refresh: 60 FPS
- Peak hold enabled with controlled falloff
- Static Quinto bar artwork disabled; silence is visually silent
- Old green low-band palette removed
- 16-step dark-red → amber palette
- Display substrate near black
- Red grid / reflection light deliberately restrained
- Oscilloscope fallback palette is dark red rather than green/white

## Startup race protection

Quinto scripts can rewrite visualizer properties after XML creation. `neowulf-vis-profile.maki` therefore reapplies the NEOWULF profile for the first five seconds after a component loads. It is compiled with Nullsoft MAKI Compiler 1.2.0 / Winamp 5.66.

## Design direction

The goal is an instrument-like display: black glass, visible song-driven detail, restrained red phosphor/LED energy and no decorative green bars. Chassis assets receive low-amplitude horizontal brushed-metal micrograin instead of flat grey panels.
