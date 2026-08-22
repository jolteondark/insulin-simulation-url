# T2DM v2 single-layer prandial mismatch ablation

Branch: `v2/state-space-minimal`
Date: 2026-08-20

## Question
Can one prandial treatment-mismatch layer alone recover ShanghaiT2DM's broad glucose SD (~49.6 mg/dL) while preserving mean (~139 mg/dL) and TBR (~2.3%) after moving the dynamic equilibrium toward the all-session Shanghai target?

## Baseline decomposition model
Approximate local mirror of `t2dm_patient_phenotype_v2_shanghai106_exp.js` + `t2dm_game_model_v2_order_decomp_exp.js`:

- dynamic equilibrium centered near 132 mg/dL with SD ~35.5
- bolus target derived from meal-response/insulin-sensitivity kernel balance
- ~90% compensation
- no daily SI noise
- no meal-load noise

Baseline local result (~1500 synthetic patients):

- mean: ~141.5 mg/dL
- SD: ~36.5 mg/dL
- TBR <70: ~2.36%
- TAR >180: ~14.68%
- pre-breakfast: ~133.5 ± 35.1 mg/dL

## Ablation A: symmetric per-meal bolus multiplicative mismatch
Independent Gaussian-like multiplicative bolus perturbation was applied to each meal while preserving the same physiological generator and kernels.

Representative results:

| bolus mismatch SD | mean | glucose SD | TBR | TAR |
|---:|---:|---:|---:|---:|
| 10% | 141.3 | 37.6 | 2.56% | 15.01% |
| 20% | 141.3 | 40.5 | 3.45% | 16.13% |
| 30% | 141.5 | 44.5 | 4.71% | 17.95% |
| 40% | 141.3 | 49.6 | 6.04% | 19.45% |

Conclusion: enough symmetric mismatch to match overall SD causes excessive hypoglycemia.

## Ablation B: one-sided under-dosing events
Bolus was occasionally reduced, with no over-dose perturbation.

Representative useful region:

- 5% complete missed-bolus events: mean ~144.8, SD ~42.4, TBR ~2.5%, TAR ~17.3%

Conclusion: one-sided under-dosing preserves TBR better but raises the mean before SD reaches the Shanghai target. It cannot by itself achieve mean ~139, SD ~49.6, TBR ~2.3 simultaneously.

## Ablation C: mean-preserving skewed mismatch
A rare under-dose state plus slight routine upward compensation was tested so the expected dose multiplier remained ~1.

Representative results:

- ~10% rare complete under-dose state with mean-preserving compensation: mean ~143.0, SD ~45.7, TBR ~3.45%, TAR ~16.1%
- settings that pushed SD near 49-50 increased TBR to ~4% or more.

## Decision
**Reject a single generic treatment-mismatch layer as the sole explanation of Shanghai glucose variance.**

The mismatch layer is still physiologically/clinically plausible, but it should contribute only part of the missing variance. The remaining variance should be sought in independent sources with different tail behavior, especially meal-load variability and/or day-level insulin-sensitivity variability.

Important modeling implication: do not inflate fixed patient heterogeneity to recover the missing SD, because Shanghai all-session data show substantial within-session/day variability and moderate same-day premeal correlations (~0.46-0.49).

This is an ablation result, not a frozen model change.
