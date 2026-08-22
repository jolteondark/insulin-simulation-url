# UOM four-point joint validation — 2026-08-19

Experimental validation memo for branch `v2/state-space-minimal`. Main is untouched.

## External dataset

Manchester/T1D-UOM V1.0.3, glucose files `UoMGlucose*.csv`.

- 17 raw subject files.
- Glucose values converted from mmol/L to mg/dL using 18.0182.
- Reproduced the prior completeness-filtered cohort: 794 patient-days across 11 subjects using >=210 CGM readings/day.
- Four pseudo-checks use the nearest CGM value to 07:00, 12:00, 18:00, 21:00 within +/-10 min.
- 755 of the 794 selected patient-days have all four pseudo-checks available.

## UOM observed four-point fingerprint

| Time | Mean mg/dL | SD | Median | <70 | >180 |
|---|---:|---:|---:|---:|---:|
| 07:00 | 121.48 | 48.77 | 109.91 | 2.12% | 8.74% |
| 12:00 | 149.11 | 48.84 | 142.34 | 1.72% | 20.13% |
| 18:00 | 153.16 | 61.63 | 140.54 | 2.12% | 24.64% |
| 21:00 | 154.13 | 59.52 | 144.15 | 2.12% | 27.42% |

Mean transitions:

- 07 -> 12: +27.63 mg/dL
- 12 -> 18: +4.05 mg/dL
- 18 -> 21: +0.97 mg/dL

Same-day correlations:

- 07 vs 12: 0.238
- 12 vs 18: 0.073
- 18 vs 21: 0.175
- 07 vs 21: 0.199

Patient-day four-point events:

- any check <70: 7.68%
- any check >180: 53.77%
- all four checks in 70-180: 43.31%

## Hidden sustained hypoglycemia on the same completeness-filtered four-check denominator

Definition: >=3 consecutive readings below threshold, adjacent gaps <=7 min, and all four pseudo-checks >=70 mg/dL.

- denominator: 697 patient-days
- hidden sustained <70: 268 / 697 = 38.45%
- hidden sustained <54: 52 / 697 = 7.46%

These values differ slightly from the earlier project memo (35.356% and 6.860%) because this run explicitly uses the completeness-filtered 794-day cohort plus +/-10 min four-check availability. The older values should remain recorded as the prior protocol result rather than overwritten.

## Current finite-memory candidate model fingerprint

Previously measured for the frozen candidate using `memory=210`, `coupling=0.28`, `fast_scale=0.80`, `setpoint_shift=+15`:

| Time | Mean mg/dL | SD |
|---|---:|---:|
| 07:00 | 147.5 | 43.6 |
| 12:00 | 94.0 | 41.1 |
| 18:00 | 117.2 | 41.6 |
| 21:00 | 187.0 | 43.7 |

Mean transitions:

- 07 -> 12: -53.5 mg/dL
- 12 -> 18: +23.2 mg/dL
- 18 -> 21: +69.8 mg/dL

Same-day correlations:

- 07 vs 12: 0.54
- 12 vs 18: 0.47
- 18 vs 21: 0.69
- 07 vs 21: 0.11

Patient-day events:

- any check <70: 37.6%
- any check >180: 61.9%
- all four checks in 70-180: 18.6%

## Interpretation

This is a material joint-distribution failure despite a strong whole-day marginal fit.

Model minus UOM mean at each pseudo-check:

- 07: +26 mg/dL
- 12: -55 mg/dL
- 18: -36 mg/dL
- 21: +33 mg/dL

The sign pattern is highly consistent with the current deterministic meal-specific ICR redistribution: breakfast is made more insulin-intensive while lunch/dinner are made less insulin-intensive. Therefore the next ablation should remove meal-specific ICR redistribution first, while preserving the finite-memory state, obesity/IR layer, and circadian layer. Do not add new physiology until this ablation is tested.

A second issue is that model same-day four-check correlations are much too high, especially 18-21. After fixing the mean diurnal shape, re-evaluate whether meal/insulin residual variability must be added at meal level to reduce excessive deterministic same-day coupling.
