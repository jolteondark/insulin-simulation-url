# Provisional freeze — v2 state-space T1DM core (2026-08-20)

Status: PROVISIONAL FREEZE. Do not tune this core against UOM/HUPA marginal targets further unless an external/held-out mismatch identifies a specific missing mechanism.

## Frozen architecture

Patient-fixed primitives:
- body size / phenotype
- intrinsic insulin sensitivity axis `S_I`
- insulin-demand axis `D_insulin`
- hepatic phenotype
- meal kinetics
- insulin PK
- counterregulation

Treatment quantities are downstream/derived where possible:
- CF from effective insulin action
- ICR from independent meal appearance + insulin action (240-min neutral reference)
- TDD from body size + S_I + D_insulin + hepatic contribution + small independent residual

Time-varying dynamics:
- single mean-preserving biphasic basal-requirement state
  - width `w = 330 min`
  - coupling `c = 0.32`
  - multiplier is Jensen-centered before clipping
- zero-area transient
  - tau = 90 min
  - amplitude = 8 mg/dL

Other core choices retained:
- rapid scale = 0.80
- meal gain independent of ICR
- no meal-size early saturation
- slow state represents time-varying basal insulin requirement, not generic insulin resistance
- obesity acts as a modifier of insulin action; avoid double application

## N300 finalist fingerprint

For `w=330, c=.32` with v0.81 S_I + D_insulin and transient tau90/amp8:
- mean 148.47 mg/dL
- SD 49.55 mg/dL
- TBR<70 2.01%
- TBR<54 0.209%
- TIR 76.04%
- TAR>180 21.95%
- ACF30/60/120/240 = 0.858 / 0.607 / 0.237 / 0.124
- four-check any low 10.59%
- four-check any high 47.51%
- all four TIR 47.64%

Reference fingerprints:
- UOM: mean 146.46, SD 56.23, TBR70 2.06%, TIR 76.38%, ACF 0.863/0.634/0.247/-0.012
- HUPA: mean 135.6, SD 51.6, TBR70 5.74%, TIR 77.5%, ACF 0.923/0.779/0.491/0.132

## Held-out fingerprint check

N300, 14 d with 2 d warmup, same frozen candidate:
- mean 148.86
- SD 49.94
- CV 33.55%
- p5/p10/p25/p50/p75/p90/p95 = 81.0 / 92.9 / 114.3 / 140.9 / 174.9 / 216.0 / 244.8 mg/dL
- four-check any low 11.42%
- any high 49.25%
- all four TIR 45.44%

Interpretation:
- central distribution and lower tail are reasonably reproduced
- total variance/CV is still low relative to UOM/HUPA (~38%)
- upper tail is somewhat thin
- four-check any-low remains too frequent and any-high too infrequent
- these residuals are documented, not tuned away here

## Change-control rule

Do NOT change the frozen T1DM physiology merely to improve one scalar target.
A core change requires at least one of:
1. reproducible mismatch in a held-out/external dataset;
2. a clinically named, independently supported missing mechanism;
3. improvement across multiple independent fingerprints without material degradation elsewhere.

Prefer future development outside this core:
- behavior/context layer for clock-time POC measurements and treatment timing
- steroid modifier on S_I(t) / hepatic drive
- T2DM endogenous insulin / beta-cell reserve module
- renal modifier only if externally supported

Main repository remains untouched.