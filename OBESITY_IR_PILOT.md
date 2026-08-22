# Obesity / insulin resistance pilot

Experimental only; not calibrated for merge.

## Goal

Separate adiposity from insulin resistance instead of treating body weight as a direct proxy for both.

## Added phenotype fields

- sex
- height_cm
- bmi_kg_m2
- obesity_class
- adiposity_index
- intrinsic_insulin_resistance_index
- insulin_resistance_index
- insulin_sensitivity_multiplier
- obesity_resistance_multiplier

Derived candidate treatment fields:

- v2_tdd_u_kg_day
- v2_tdd_u_day
- v2_basal_u_day
- v2_icr_g_u
- v2_cf_mg_dl_u

The existing calibrated fields are preserved for paired comparisons. `toEnginePatient()` maps the v2 treatment fields into the engine-facing TDD/basal/ICR/CF fields.

## Directional distribution check

A 100,000-patient Monte Carlo check using the same legacy latent correlation structure plus the phenotype pilot produced approximately:

- BMI median 25.1 kg/m2
- overweight prevalence 50.6%
- obesity prevalence 15.1%
- BMI >=35 prevalence 2.0%
- correlation(BMI, insulin resistance index) ~0.68
- correlation(insulin resistance index, v2 TDD/kg) ~0.83

Median treatment parameters by BMI stratum:

| BMI | TDD U/kg/day | ICR g/U | CF mg/dL/U |
|---|---:|---:|---:|
| <25 | 0.56 | 11.86 | 44.53 |
| 25-29.9 | 0.71 | 9.19 | 28.44 |
| 30-34.9 | 0.85 | 7.55 | 21.04 |
| >=35 | 1.04 | 6.18 | 15.33 |

These values are a structural sanity check only, not external calibration targets.

## Important interpretation

Obesity does not directly raise glucose in the model. It raises the probability of insulin resistance. Insulin resistance then changes the dose-response phenotype: more insulin is required for the same carbohydrate/correction effect. This means a well-dosed obese/resistant patient can still have a similar glucose distribution to a lean/sensitive patient, but with larger insulin doses.

## Before merge

1. Calibrate adult T1DM height/BMI distribution from an external cohort.
2. Calibrate BMI/adiposity -> insulin resistance relationship from T1DM data rather than hand-set coefficients.
3. Validate TDD/kg, ICR and CF distributions by BMI/insulin-resistance strata.
4. Re-run glucose distribution and autocorrelation validation with the v2 state-space engine.
5. Ensure resistance is not double-counted through legacy z_insulin_sensitivity plus the new phenotype layer.
