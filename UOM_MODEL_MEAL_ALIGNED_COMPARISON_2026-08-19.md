# UOM vs current model: meal-aligned clean trajectory

Current candidate for this diagnostic comparison:
- rapid kernel time-scale 0.80
- bolus timing 0 min
- uniform patient-specific ICR
- fast_scale 0.80
- no new latent mechanism

External UOM clean meal-aligned mean delta glucose (mg/dL):
- breakfast (median carb 39 g): +60 14.3, +120 9.4, +180 5.9, +240 -0.9
- lunch (median carb 49 g): +60 15.6, +120 21.6, +180 16.2, +240 6.9
- dinner (median carb 68 g): +60 11.5, +120 0.8, +180 8.6, +240 21.2

Diagnostic model-only reconstruction using the frozen generator distributions and current fast response equations, aligned to meal time and using the corresponding UOM median carbohydrate load:
- breakfast 39 g: +60 ~62.7, +120 ~14.6, +180 ~-16.8, +240 ~-18.8
- lunch 49 g: +60 ~78.8, +120 ~18.4, +180 ~-21.0, +240 ~-23.5
- dinner 68 g: +60 ~109.3, +120 ~25.5, +180 ~-28.8, +240 ~-31.8

Interpretation:
1. The current meal/rapid pair produces a very large early excursion, especially as carbohydrate amount increases.
2. It then overshoots downward at 180-240 min, whereas UOM clean meals generally remain near or above premeal baseline.
3. Therefore the residual mismatch is not primarily a clock-time artifact, snack/correction contamination, circadian layer, or midnight kernel reset.
4. The model needs redistribution of net meal glucose appearance over time: less early appearance and more late appearance, while keeping the independently supported faster rapid-insulin kernel (~0.80).
5. This comparison is diagnostic, not final exact engine validation: the model-side numbers are a reconstruction of the fast response equations and omit some full multi-day state/context terms. Use them to identify direction, then confirm with the exact JS validation runner before accepting coefficients.

Decision:
- keep rapid time-scale ~0.80 provisionally
- do not adopt fixed pre-bolus lead
- do not fit core physiology to raw 07/12/18/21 clock-time means
- next test should reshape the meal kernel itself using a lower early fast fraction plus longer late component, but constrain the change against meal-aligned clean UOM trajectories rather than unconditional 4-point means

Main branch remains untouched.
