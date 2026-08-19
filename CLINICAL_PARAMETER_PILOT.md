# v2 clinical-parameter pilot

Experimental branch only. `main` remains frozen.

## Added in this pilot

### Obesity / insulin resistance
- Height and BMI are explicit.
- BMI-derived adiposity adds incremental insulin resistance.
- Legacy `z_insulin_sensitivity` remains the intrinsic baseline; it is not re-applied in v2 physiology.
- This avoids double counting sensitivity already represented by legacy ICR/CF/TDD.

### Meal-specific ICR
- Starter dosing uses meal-specific ICR rather than changing carbohydrate appearance physiology.
- Literature anchor for adult Japanese T1DM: approximately `300/TDD` at breakfast and `400/TDD` at lunch/dinner.

### Circadian / dawn insulin need
- Implemented as a smooth time-varying increase in basal requirement, not arbitrary additive glucose noise.
- Pilot default dawn requirement amplitude: +12%, centered around 06:00.
- External calibration is still required; literature reports a typical dawn glucose rise of roughly 15-25 mg/dL when overnight insulin waning is prevented.

### Renal function
- eGFR now has a physiological effect.
- Pilot implementation prolongs rapid-insulin action below eGFR 60 through a conservative clearance modifier.
- Severe CKD effect is capped pending T1DM-specific calibration.
- Renal dysfunction is not modeled as a direct glucose offset.

## Important implementation correction

Do not overwrite the fast core's physiological carbohydrate-gain calibration with treatment ICR. In the current engine, legacy ICR participates in calibration of meal glucose appearance. Therefore v2 meal-specific ICR is used for treatment-dose generation only, while obesity-related incremental resistance acts explicitly on insulin action.

## Current code

- `patient_phenotype_v2.js`: obesity/adiposity and non-double-counted incremental resistance
- `clinical_modifiers_v2.js`: renal, meal-ICR and circadian functions
- `dosing_policy_v2.js`: meal-specific starter bolus generation
- `engine_v2.js`: applies obesity action, circadian basal need and renal insulin-tail modifier

## Not yet validated

These changes are mechanistically wired but are not accepted calibration. Before any merge they require head-to-head distributional validation against T1D-UOM and HUPA-UCM and sensitivity analysis for each new mechanism.
