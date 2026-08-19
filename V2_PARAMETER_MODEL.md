# v2 parameter model — clinically interpretable expansion

This document defines the next-stage parameter schema for the T1DM simulator. The goal is to increase realism without adding arbitrary latent knobs. Parameters are split into fixed patient traits, slow dynamic states, and external context modifiers.

## Principles

1. Keep frozen `main` unchanged.
2. Prefer clinically interpretable variables over anonymous latent z-scores.
3. Do not add a parameter unless it maps to a distinct physiological mechanism or observed clinical covariate.
4. Separate fixed patient traits from time-varying states and exogenous context.
5. Calibrate distributions and correlations from external datasets; do not hand-fit one dataset.
6. Any new parameter must survive ablation and independent validation.

## Fixed patient traits (T1DM v2 core)

### Anthropometry
- `height_cm`
- `weight_kg`
- `bmi_kg_m2` (derived from height/weight)
- `age_years`
- `sex`

Rationale: weight alone cannot distinguish obesity/adiposity from body size. BMI should influence insulin resistance rather than glucose directly.

### Baseline insulin requirement
- `tdd_u_kg_day`
- `basal_fraction_tdd`
- `basal_requirement_u_day`
- `icr_g_u_by_meal`: breakfast/lunch/dinner
- `cf_mg_dl_u_by_time`: morning/day/evening/night

Rationale: a single ICR and CF for the entire day is too restrictive; circadian insulin need is clinically meaningful and can affect four-check joint structure.

### Insulin pharmacodynamics
- `rapid_onset_min`
- `rapid_peak_min`
- `rapid_duration_min`
- `insulin_action_scale`
- `subcutaneous_absorption_variability`

Rationale: formulation sets the population mean profile, while patient-level absorption/action variability changes excursion shape.

### Meal/glucose appearance
- `meal_t50_fast_min`
- `meal_t50_slow_min`
- `meal_fast_fraction`
- `gastric_emptying_variability`

Rationale: retain the existing two-component meal model, but allow patient-level and meal-level variation rather than fixed identical absorption each meal.

### Endogenous glucose regulation
- `fasting_setpoint_mg_dl`
- `hepatic_glucose_drive_scale`
- `counterreg_threshold_mg_dl`
- `counterreg_strength`
- `hypoglycemia_awareness_factor`

Rationale: separate baseline hepatic tendency from counterregulatory rescue and severe-low susceptibility.

### Renal
- `egfr_ml_min_1_73m2`
- `renal_insulin_clearance_modifier`

Rationale: eGFR currently exists only as metadata; v2 should allow renal dysfunction to prolong insulin effect and increase low-glucose risk. eGFR is an external disease modifier, not a hidden fit parameter.

## Slow dynamic states

### `basal_requirement_state`
Persistent variation in insulin requirement / hepatic balance. Carries across day boundaries.

Candidate parameters:
- `state_tau_min`
- `state_sd`
- `state_coupling_to_basal_requirement`

### `circadian_insulin_need`
Deterministic 24 h modulation, represented by a small number of interpretable coefficients rather than 24 hourly parameters.

Candidate parameters:
- `dawn_amplitude`
- `dawn_peak_time_min`
- `evening_resistance_amplitude`

### Optional later: meal-specific absorption state
Only add if meal-response validation remains deficient after the core state model is validated.

## External context modifiers

These are not intrinsic patient parameters and should be supplied by the scenario/day context:

- `prednisone_mg` / glucocorticoid timing
- `infection_severity`
- `fever_c`
- `activity_level`
- `meal_carb_g_actual`
- `meal_timing_min`
- `intake_fraction`
- `missed_or_delayed_bolus`

## Proposed staged implementation

### Stage A — add now
1. height + BMI/adiposity
2. age + sex
3. meal-specific ICR
4. time-of-day CF / circadian insulin need
5. renal insulin-clearance modifier driven by eGFR
6. persistent basal-requirement state
7. meal-level absorption variability

### Stage B — only if validation demands it
- explicit activity/exercise physiology
- stress/catecholamine state
- hypoglycemia unawareness as a separate phenotype
- gastroparesis phenotype
- menstrual-cycle effects
- injection-site / lipohypertrophy variability

## Parameter-count target

For T1DM v2, aim for roughly 15–25 physiologically interpretable dimensions rather than a large unconstrained latent model. Many values are correlated or derived, so the effective independent dimensionality should remain lower than the raw field count.

## Validation rule

Every added mechanism must be checked against:
- marginal glucose distribution
- TIR/TBR/TAR and severe tails
- r30/r60/r120/r240
- four-check joint structure
- hidden hypoglycemia
- between-patient heterogeneity

No merge to `main` until the expanded model improves temporal fidelity without losing the already-good marginal distribution.
