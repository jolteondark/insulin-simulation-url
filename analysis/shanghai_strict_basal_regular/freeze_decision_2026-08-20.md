# Shanghai strict Basal+Regular freeze decision — 2026-08-20

## Decision
Freeze the current T2DM physiology/kernel on the Shanghai calibration branch. Do not add a regular-insulin potency multiplier, generic glucose noise, large day-level SI variation, meal-response latent trait, or morning-resistance parameter from the current Shanghai evidence.

## Why
1. Properly treatment-aligned strict Basal+Regular target (17 days, 4 sessions) has breakfast delta120 mean 16.8 mg/dL, essentially matching the current unmodified model mean (~17 mg/dL).
2. Basal requirement scale is close: observed session-equal basal/kg ~0.201 U/kg/day vs matched model ~0.209.
3. Observed prandial requirement is higher (~0.376-0.380 U/kg/day) than matched model (~0.203), but the discrepancy is not explained by off-meal correction, premeal correction, or obviously larger carbohydrate intake.
4. Same-patient formulation audit does not support a single regular-insulin potency correction. Direction is inconsistent across sessions: e.g. 2021 SC regular 5 U with delta120 82.3 vs CSII regular 7.2 U with 30.6; 2035 SC regular 13 U with -5.4 vs CSII regular 12 U with 59.4. Treatment transitions are non-randomized and CSII also changes basal delivery.
5. Shanghai has now been used extensively for calibration/diagnosis. Further tuning to this small strict subset risks overfitting, especially because 17 days represent only 4 patient/session clusters.

## Frozen interpretation
- Keep current glucose kernel and physiology as the development reference.
- Keep basal equation unchanged.
- Do not force the previous-doctor prandial policy to the Shanghai strict 0.38 U/kg/day value.
- Treat the high observed strict prandial dose as a calibration clue that remains partly treatment-context dependent, not as a direct physiology parameter.

## Next phase
External validation on an independent inpatient T2DM dataset (Gaotang if accessible). Pre-specify metrics before looking at results: day mean, within-day SD, pre-breakfast/pre-lunch/pre-dinner distribution, hypoglycemia/hyperglycemia fractions, and treatment-stratified shifts. Only reopen physiology if a structured external residual recurs.

Main branch remains untouched.
