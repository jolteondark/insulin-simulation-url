# UOM carb-stratified post-meal CGM trajectory (2026-08-19)

Source: Manchester/T1D-UOM V1.0.3 uploaded ZIP. Glucose converted mmol/L -> mg/dL (x18.0182).

Protocol:
- Subjects with both Nutrition and Glucose files: 15
- Main meals only: Breakfast/Lunch/Dinner
- Carbs 10-199 g
- Excluded meals with another meal from -60 to +240 min
- Required CGM within +/-7 min at 0/30/60/90/120/180/240 min
- n = 1430 isolated meal episodes
- Values below are median ΔG from meal-time glucose (mg/dL)

| carbs | n | median carbs | +30 | +60 | +90 | +120 | +180 | +240 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 10-39 g | 393 | 29 | 3.6 | 10.8 | 12.6 | 9.0 | 7.2 | 5.4 |
| 40-69 g | 582 | 53 | 5.9 | 17.1 | 19.8 | 18.9 | 16.2 | 16.2 |
| 70-99 g | 290 | 81 | 5.4 | 18.9 | 20.7 | 22.5 | 25.2 | 27.9 |
| 100-199 g | 165 | 118 | 9.0 | 19.8 | 23.4 | 23.4 | 25.2 | 34.2 |

Meal-type medians (confounded by different typical carb amounts):
- Breakfast n=317, median carbs 34 g: ΔG +30/+60/+90/+120/+180/+240 = 5.4 / 10.8 / 14.4 / 5.4 / 3.6 / 3.6
- Lunch n=517, median carbs 50 g: 5.4 / 19.8 / 23.4 / 30.6 / 23.4 / 14.4
- Dinner n=596, median carbs 70 g: 5.4 / 15.3 / 12.6 / 12.6 / 14.4 / 25.2

Interpretation:
1. Post-meal response is strongly carb-dependent.
2. For >=70 g meals, observed CGM response frequently remains elevated or continues rising at 180-240 min.
3. Therefore a global meal-kernel acceleration (e.g. meal time scale 0.8) is not supported by this conditional validation and may be directionally wrong for larger meals.
4. The previous four-check grid improvement from meal-scale 0.8 should be treated as compensatory fitting, not physiology.
5. Current next hypothesis: meal absorption should depend on meal size/composition, with larger meals having a larger slow component / longer effective absorption tail rather than a single globally faster kernel.
6. Do not add a new latent state yet. First test a named, mechanistic meal-size-dependent fast-fraction or slow-t50 rule using the same 4-check and conditional trajectory validation.

Caveat: these are net CGM trajectories under real-world insulin dosing, not pure glucose appearance curves. Protein/fat and bolus dose/timing remain confounders. Use as conditional-response validation, not direct deconvolution of gut absorption.
