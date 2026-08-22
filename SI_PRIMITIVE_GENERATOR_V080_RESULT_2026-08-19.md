# S_I primitive generator v0.80 diagnostic — 2026-08-19

## Purpose
Test whether the T1DM generator can be reparameterized around a patient-fixed intrinsic insulin sensitivity primitive rather than treating CF/ICR/TDD as primitive inputs.

## Structural diagnostic
N=10,000 generated patients.

Define `S_I` as the pre-modifier insulin action gain used by the engine. Under the migration identity, CF is derived from the 240-min 1U response.

- CF reconstructed from S_I: numerical identity (max error ~1.4e-14)
- TDD from `S_I + body weight`: raw R² 0.9405, correlation 0.9700
- residual log SD for TDD: 0.0899
- neutral ICR correlation with S_I: 0.9880
- legacy ICR vs neutral ICR correlation: 0.8544

Interpretation: most treatment-need structure can be represented downstream of S_I rather than as separate primitive axes. A small residual insulin-demand phenotype remains appropriate.

## Validation-only v0.80 candidate
Architecture:

- primitive `S_I` reconstructed exactly from legacy CF for migration
- CF derived from `S_I × 240-min 1U response`
- TDD derived from S_I + body weight + preserved small demand residual
- ICR derived from the 240-min neutral meal-vs-insulin balance
- finite-memory slow state: 90 min
- Jensen-centered slow multiplier
- basal coupling 0.36
- fast scale 0.80
- setpoint shift -5 mg/dL
- zero-area meal-shape alpha 0.10

N=120, 7 days, 1 warmup day.

### Population result
- mean 148.05 mg/dL (UOM 146.46)
- SD 47.38 (UOM 56.23)
- TBR <70 1.821% (UOM 2.057%)
- TBR <54 0.175% (UOM 0.276%)
- TIR 77.178% (UOM 76.376%)
- TAR >180 21.000% (UOM 21.567%)
- median ACF 30/60/120/240 = 0.855 / 0.584 / 0.208 / 0.222
  - UOM = 0.863 / 0.634 / 0.247 / -0.012
- four-check any low 7.917% (UOM 7.68%)
- any high 39.58% (UOM 53.77%)
- all-four TIR 54.86% (UOM 43.31%)

POC means remain mismatched (126/122/141/166 vs UOM 121/149/153/154), consistent with prior held-out circadian/behavior mismatch.

## Conclusion
Promoting intrinsic insulin sensitivity to a primitive axis is structurally viable and does not cause the previous hypoglycemia problem when compared under the same centered finite-memory state assumptions.

Canonical interpretation:

> `S_I` can be the physiological primitive; CF, ICR, and most of TDD can be downstream treatment phenotypes.

The remaining mismatches are not evidence against the S_I architecture. They are the already-known residual issues: insufficient total variance, excessive ACF240 persistence, and unconditional four-check circadian mismatch.

This remains validation-only. Frozen main is unchanged.
