# Shanghai T2DM basal-bolus recalibration (2026-08-20)

## Target cohort
Clinically stratified ShanghaiT2DM basal-bolus subgroup (7 CGM sessions):
- pooled mean 164.3 mg/dL
- pooled SD 57.6 mg/dL
- TBR <70 1.51%
- TIR 70-180 61.62%
- TAR >180 36.88%
- meal-relative pre-breakfast 147.7 ± 35.4 mg/dL
- pre-lunch 156.7 ± 67.6
- pre-dinner 171.9 ± 65.0

Because n=7 sessions, these are calibration direction targets, not exact fit targets.

## Structural correction
Do not calibrate the basal-bolus game against the mixed all-Shanghai target (mean ~139 mg/dL). The original dynamic equilibrium centered near 147 mg/dL is much closer to the basal-bolus subgroup morning distribution.

## Screen 1: prandial coverage only
With the original equilibrium distribution and no meal variability, reducing mechanistic prandial coverage from 0.90 to ~0.80 moved pooled mean to ~164 mg/dL and pre-dinner to ~170 mg/dL, but SD remained only ~33 mg/dL and TBR was near zero. Therefore simple under-dosing reproduces the mean shift but not the broad distribution.

## Screen 2: coverage + meal variability + wider equilibrium
A small exploratory grid using:
- prandial coverage ~0.80
- meal-load variability ~55% of the empirical Shanghai staple-weight proxy CV
- small bolus mismatch SD ~10%
- equilibrium between-patient SD widened from ~28 to ~35 mg/dL (scale ~1.35 around 147)
produced an indicative candidate around:
- pooled mean ~165.6 mg/dL
- pooled SD ~58.7 mg/dL
- TBR ~1.60%
- TIR ~62.6%
- TAR ~35.8%
- pre-breakfast ~143.8 ± 35.6
- pre-lunch ~165.1 ± 47.6
- pre-dinner ~172.4 ± 62.2

These aggregate metrics are strikingly close to the 7-session basal-bolus subgroup, except pre-lunch SD remains substantially below the observed 67.6 mg/dL. The grid was small and is NOT an accepted final parameterization.

## Interpretation
The data no longer support adding a large generic transient-noise term. A plausible decomposition is:
1. patient-level fasting equilibrium heterogeneity (~35 mg/dL SD),
2. modest systematic under-coverage of meal glucose load (coverage ~0.8),
3. empirically grounded meal-load heterogeneity,
4. small treatment mismatch.

The remaining main structural deficit is pre-lunch variance. Before adding any new patient parameter, investigate breakfast-specific meal composition/absorption and breakfast insulin timing/dose heterogeneity in the basal-bolus sessions.

## Decision
- Restore the ~147 mg/dL equilibrium center for basal-bolus calibration.
- Do not use the mixed Shanghai mean ~139 mg/dL as the target for this game mode.
- Keep generic day-level SI noise OFF for now.
- Do not freeze the exploratory 0.80/0.55/1.35 candidate because basal-bolus n=7 is too small and pre-lunch variance is still wrong.
- Next: directly inspect the 7 basal-bolus sessions at breakfast level (meal proxy, insulin timing/dose, +60/+120/+180 glucose excursion) to explain the large pre-lunch SD.

Main branch remains untouched.
