# 2026-10-10 scoped geometry and capability incidents

| Fingerprint / evidence | Cause class | Guard / outcome |
| --- | --- | --- |
| Previous fixed main rectangle differs from inspected chassis attachment by +1.15365 x / +11.80653 y at 638 width | Implementation: geometry was hardcoded and tests only enforced that hardcoding | Source-pixel configuration, measured contour + separate spindle, actual-MAKI/native-mesh regression; old rectangle must fail |
| Quinto ZIP uses backslash member names; a raw Linux extraction produced literal backslash names | Packaging/path compatibility | Normalize backslash to slash, reject paths outside the owned stage, verify source ZIP hash/CRC before use |
| Large image payload placed in shell argv returned argument-too-long; no final image was written | Transport bound, not an authorization failure | Send the already authorized image through PTY stdin, disable input echo, verify exact output size/SHA256; no equivalent argv retry |
| Non-PTY one-shot stdin reader encountered EOF | Process lifetime/stdin mismatch | Owned PTY stdin transfer verified; no empty reader loop; incomplete earlier base64 staging is not a valid image |
| Compiler host listed online but command returned Not connected; ordinary SSH authentication unavailable; connected source host has no Wine | Capability dependency | No equivalent authentication retry or boundary bypass; candidate remains uncompiled, source/binary lock prevents packaging |
| Pre-publication git diff check caught extra blank lines at EOF in five copied source/test files | Payload formatting during local materialization | Normalize only final newline bytes in the owned candidate, recalculate hashes, rerun the actual checkout diff check before publication |

Existing production image hashes and last compiled binaries remain unchanged.
Global governance owner-login publication is still unavailable and is not replaced
by this scoped project record. No automatic-approval rejection was observed.
