# Meal gain / ICR decoupling diagnostic

Branch: `v2/state-space-minimal`
Main branch untouched.

## Structural change under test

Legacy fast meal term in `engine_v2.js`:

`cg = insulin_gain / ICR`

This couples two conceptually distinct quantities:
1. treatment rule: carbohydrate / ICR -> bolus units
2. physiology: carbohydrate appearance -> glucose rise

A validation-only helper was added as `engine_v2_mealgain_validation.js` (commit `4fef2a4ef1441dee720bf9c10a77ae13c6b6052c`). It introduces an independent `carb_glucose_gain_mg_dl_per_g` and does not modify production `engine_v2.js`.

## Diagnostic gain scan

Fixed assumptions for directional scan:
- rapid time-scale 0.80
- bolus timing 0 min
- uniform patient-specific ICR for dose calculation only
- current 2-component meal kernel unchanged
- fast_scale 0.80
- clean UOM meal-aligned targets
- weight-scaled gain prior around a 70-kg reference value

Clean UOM targets (delta glucose, mg/dL):
- breakfast 39 g: +60 14.3, +120 9.4, +180 5.9, +240 -0.9
- lunch 49 g: +60 15.6, +120 21.6, +180 16.2, +240 6.9
- dinner 68 g: +60 11.5, +120 0.8, +180 8.6, +240 21.2

A rough reconstruction scan over independent meal gain showed the best region near ~5 mg/dL/g at 70 kg, but even there the shape mismatch remained large. Representative breakfast trajectory at ~5 mg/dL/g was approximately:
- +60 ~62
- +120 ~13
- +180 ~-18
- +240 ~-20 mg/dL

Increasing gain further lifts late values but makes the early peak even larger; decreasing gain lowers the early peak but worsens the late undershoot. Therefore no single scalar gain can reconcile the trajectory while the current meal appearance kernel is retained.

## Interpretation

1. ICR/mealgain decoupling is still structurally correct and should remain a v2 design principle.
2. The current meal gain should not be calibrated by forcing one scalar value to fit all four post-meal times.
3. The remaining mismatch is primarily temporal: too much early net appearance relative to late appearance.
4. The previous difficulty in tuning the meal kernel was partly obscured by the ICR coupling, but decoupling alone does not remove the need to reshape meal appearance.
5. Do not add another latent state yet. The next clean test is to calibrate **meal appearance shape and gain jointly** against clean meal-aligned data, with rapid 0.80 fixed by isolated-bolus validation.

## Provisional parameterization for next test

Keep treatment and physiology separate:
- `icr_g_u`: treatment/dose relationship
- `carb_glucose_gain_mg_dl_per_g`: physiological amplitude
- `meal_fast_fraction`: early appearance fraction
- `meal_t50_fast_min`: early appearance timing
- `meal_t50_slow_min`: late appearance timing

Do not make meal-specific ICR a deterministic physiological mechanism.
Do not alter main.
