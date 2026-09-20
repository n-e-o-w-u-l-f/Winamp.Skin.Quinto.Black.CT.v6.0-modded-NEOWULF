# NEOWULF v6 R3 — turntable reference-design correction

The previous LP animation mixed **material** and **lighting** into the same rotating bitmap. That was physically wrong: large red sectors, white glints and a red light pool rotated with the record. R3 separates those systems.

## Reference rules

The supplied NEOWULF reference is the visual target for the turntable language:

- black vinyl with fine concentric groove detail;
- restrained dark-red center label, without oversized decorative sectors;
- machined platter rim and fixed strobe dots;
- dark brushed Black Steel / gunmetal chassis with fine horizontal grain;
- high-contrast silver/chrome edges and hardware, not broad grey stripes;
- fixed tonearm and fixed stylus illumination;
- warm reflection on the record may be visible, but it belongs to deck/room lighting and therefore **must not rotate**.

## Layer model

`vrp.layer.vinyl` is the rotating record layer. It keeps 120 positions split into two 60-frame atlases for the MAKI bank-switching driver.

Immediately above it is `vrp.layer.fixed.reflection`, a normal `Layer`, not an `AnimatedLayer`. It contains fixed stylus glow and restrained platter/room reflections. The tonearm is above both.

```text
platter / chassis (fixed)
  -> vinyl 120-frame animation (rotating physical material only)
     -> fixed reflection + stylus light
        -> tonearm (fixed)
```

## Guard rails

`tools/validate_neowulf_v6_turntable.py` rejects generated LP frames when it detects red sector-like areas or bright baked-in light outside the center label. It also verifies the static overlay and XML layer order.

The two large runtime atlases are deterministic build products. The generator also writes `PNG/neowulf-lp-master.png` into the working skin so the unlit physical record source can be inspected directly.
