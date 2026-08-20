# T2DM V3 static phenotype refactor interpretation — 2026-08-20

The V3 phenotype support was refactored after external inpatient cohorts showed that poor chronic control and beta-cell failure had been incorrectly conflated.

## Key external observation

Japanese inpatient CGM data showed the HbA1c >=10% subgroup to be younger, shorter-duration, slightly higher-BMI, more insulin resistant and with higher C-peptide than better-controlled groups. Therefore high HbA1c must not be encoded as long-duration beta-cell failure by default.

US inpatient cohorts (Emory/RABBIT) additionally require support for younger severe obesity/IR, but this should not be interpreted as Japanese prevalence.

## New six-phenotype support

Approximate independent 5,000-per-archetype reproduction of current equations:

| phenotype | age | BMI | duration | eGFR | C-peptide | SI | observed FPG |
|---|---:|---:|---:|---:|---:|---:|---:|
| shanghai_anchor | 60.2 | 24.1 | 8.5 | 116.9 | 0.48 | 1.02 | 171 |
| obesity_ir | 56.3 | 33.9 | 8.5 | 116.9 | 0.58 | 0.52 | 188 |
| moderate_ckd | 62.7 | 25.7 | 11.2 | 74.5 | 0.48 | 0.96 | 175 |
| elderly_ckd | 75.8 | 25.4 | 19.3 | 41.9 | 0.42 | 0.92 | 178 |
| chronic_hyperglycemia | 54.5 | 26.8 | 6.8 | 91.6 | 0.57 | 0.76 | 263 |
| beta_failure_long_duration | 63.7 | 24.7 | 22.3 | 116.9 | 0.29 | 0.96 | 196 |

## Interpretation

The generator now separates at least three mechanisms that were previously entangled:

1. obesity-driven insulin resistance;
2. poor-control/high-HbA1c with relatively preserved secretion and higher IR;
3. long-duration beta-cell failure with low C-peptide.

Moderate renal impairment is also separated from advanced-age CKD so eGFR 60–90 can exist without forcing age into the mid-70s.

This materially improves static patient realism before any glucose-outcome tuning.

## Presets

`COHORT_PRESETS` were added only as static-conditioning/sensitivity tools:

- `support_sweep`
- `japan_inpatient_sensitivity`
- `us_obese_inpatient_sensitivity`

These are not prevalence estimates and must never be tuned against glucose outcomes.

## Guardrails

- Do not infer national prevalence from preset weights.
- Do not encode HbA1c as direct glucose offset.
- Do not let treatment policy observe hidden SI/beta/hepatic IR.
- Keep renal insulin-exposure modifier experimental and OFF until renal-cohort magnitude validation.
- Re-run treatment trajectory and external validation after the static phenotype refactor before promoting V3.
