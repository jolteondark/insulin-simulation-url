# UOM meal/bolus timing and rapid-kernel calibration (2026-08-19)

Branch-only validation note. Main remains unchanged.

## Data
Manchester/T1D-UOM V1.0.3 uploaded ZIP. Paired Nutrition, Bolus and CGM tables were used for 15 subjects with nutrition data.

## Meal-associated bolus timing
For each meal, the largest bolus >=1 U within +/-60 min of the meal was selected as the candidate meal bolus. This is observational and may still include correction/AID behavior, so timing should be treated as descriptive rather than causal.

Main meals:
- Breakfast: n=534, median bolus-minus-meal = 0 min, IQR -2 to +3 min; 26.0% before meal, 53.6% at 0..+5 min, 20.4% >+5 min.
- Lunch: n=639, median = 0 min, IQR 0 to +5 min; 18.2% before, 58.7% at 0..+5 min, 23.2% >+5 min.
- Dinner: n=699, median = 0 min, IQR -1 to +5 min; 25.6% before, 50.8% at 0..+5 min, 23.6% >+5 min.

Therefore the earlier grid improvement with a 30-min prebolus should NOT be interpreted as evidence to adopt -30 min timing. It was compensating for a kernel mismatch.

Meal clock medians were approximately breakfast 08:30, lunch 13:00, dinner 19:15 (with broad real-world spread), so the current nominal 08:00/13:00/19:00 meal schedule is not grossly inconsistent with this outpatient dataset.

## Observed post-meal CGM trajectories
For meals with no other recorded meal from -60 to +240 min and plausible carbs 15-150 g, nearest CGM values were sampled at 0/30/60/90/120/180/240 min.

Median delta glucose from meal-time baseline:
- Breakfast n=174, median carbs 39 g: +3.6, +10.8, +17.1, +17.1, +4.5, -0.9 mg/dL at 30/60/90/120/180/240 min.
- Lunch n=274, median carbs 50 g: +1.8, +18.0, +28.8, +34.2, +27.0, +16.2 mg/dL.
- Dinner n=308, median carbs 73.5 g: +4.5, +10.8, +10.8, +7.2, +14.4, +28.8 mg/dL.

These trajectories are confounded by real insulin dosing, meal composition and activity, but breakfast/lunch support an approximately 90-120 min net post-meal peak rather than a very delayed dominant early-evening excursion.

## Isolated correction-bolus response
To obtain an independent timing signal, boluses >=1 U were selected with:
- no nutrition event from -120 to +240 min,
- no other >=1 U bolus within +/-120 min,
- baseline glucose >=120 mg/dL.

n=354 isolated bolus episodes.
Median glucose change per unit from baseline:
- 30 min: -1.14 mg/dL/U
- 60 min: -3.92
- 90 min: -7.42
- 120 min: -10.36
- 180 min: -11.64
- 240 min: -14.34

Normalized to the absolute 240-min response, the empirical timing fractions are approximately:
- 30: 0.08
- 60: 0.27
- 90: 0.52
- 120: 0.72
- 180: 0.81
- 240: 1.00

For the current engine aspart kernel (onset 15, peak 105, duration 300; same restore reference), theoretical normalized unit-response fractions are approximately:
- scale 1.0: 30 0.007, 60 0.114, 90 0.325, 120 0.557, 180 0.889, 240 1.00
- time scale 0.8: 30 0.021, 60 0.214, 90 0.509, 120 0.770, 180 1.033, 240 1.00

The 0.8 time-scale candidate is substantially closer to the observed 60-120 min response shape than the current 1.0 kernel. The 180-min mismatch warns against treating this as a final pharmacodynamic fit.

## Interpretation
Strongest current conclusion:

> The prior -30 min prebolus improvement was a compensatory artifact. UOM meal boluses are typically near meal time; the independently observed correction-bolus trajectories instead support making the rapid-insulin kernel more early-concentrated (roughly 0.8 time scale as a candidate), while keeping nominal meal timing near 0-min bolus offset.

This is more defensible than fitting 4-point glucose means alone because the direction is supported by a separate conditional response analysis.

## Next test
Keep uniform ICR and finite-memory state fixed. Compare rapid time scales around 0.75/0.80/0.85/0.90 at bolus lead 0 to 10 min (not -30), then re-evaluate:
1. four-point means and joint metrics,
2. overall marginal SD/CV and tails,
3. 30/60/90/120/180/240 min correction-response shape,
4. autocorrelation r30/r60/r120/r240.

Do not add a new latent physiological state before this calibration is exhausted.
