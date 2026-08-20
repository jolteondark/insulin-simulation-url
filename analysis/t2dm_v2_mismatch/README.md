# T2DM v2 mismatch diagnostic — 2026-08-20

## Key correction
The Shanghai all-session meal-relative breakfast CGM distribution is not Gaussian.

Observed breakfast pre-meal CGM (n=1130):
- mean 131.90 mg/dL
- SD 35.53 mg/dL
- median 127.8 mg/dL
- p05 84.6 mg/dL
- p95 199.0 mg/dL
- TBR <70: 1.06%
- TIR 70–180: 88.76%
- TAR >180: 10.18%

A Gaussian N(131.9,35.5) produces about 4% below 70 and was the main reason the first Shanghai106 equilibrium experiment generated excessive hypoglycemia before any mismatch was added.

A shifted lognormal with shift 5.84443263 mg/dL and the same mean/SD gives approximately:
- p05 82.8
- median 127.2
- p95 197.1
- TBR <70 1.06%
- TAR >180 9.6%

This is now used in `t2dm_patient_phenotype_v2_shanghai106_exp.js`.

## Mismatch diagnostic
With the corrected equilibrium shape, preliminary repeated-day sensitivity tests show:
- physiology-matched order with no added mismatch: mean ~139–141, SD ~36, TBR <1%, TAR ~13–14%
- meal-specific prandial order error around 20% SD: mean ~140, TBR ~2.3%, but SD only ~40 and TAR ~15–16%
- stronger daily SI variability can raise SD toward 50, but also drives TBR well above the Shanghai target
- adding occasional under-bolus events raises the upper tail but still does not recover pooled SD ~50 without worsening other targets

Interpretation: the remaining variance cannot be represented cleanly by one symmetric generic mismatch parameter. Keep the corrected equilibrium distribution, then model the remaining within-patient variance with separately validated components (meal-load variability / treatment mismatch / day-state variability) rather than one noise term.

Do not promote to main; experimental branch only.
