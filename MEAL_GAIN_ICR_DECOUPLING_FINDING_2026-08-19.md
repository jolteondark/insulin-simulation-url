# Structural finding: meal glucose gain must be decoupled from ICR

Context:
- current candidate rapid kernel time-scale ~0.80
- bolus timing ~0 min
- uniform patient-specific ICR
- meal-aligned clean UOM used for validation

Current engine structure uses approximately:
`carb_gain = insulin_gain / ICR`
then
`fastFlux = fast_scale * (carb_gain * meal_appearance - insulin_gain * bolus_effect)`.

If bolus dose is approximately `carb / ICR`, then the same ICR simultaneously determines:
1. how much insulin is prescribed for a meal, and
2. how strongly carbohydrate raises glucose in the physiology model.

This is a structural coupling, not just a coefficient choice.

Why the latest meal-kernel grids failed:
- lowering fast fraction reduces the huge +60 min excursion, but makes 180-240 min undershoot worse;
- extending the existing slow t50 also makes late glucose lower within the 240 min window because insulin effect continues while less carbohydrate has appeared;
- adding a third delayed meal component did not solve the common meal-aligned trajectory either.

Diagnostic implication:
- the residual cannot be repaired cleanly by reshaping the meal kernel alone while `carb_gain` remains tied to ICR.
- ICR is fundamentally a dosing relation (grams carbohydrate per unit insulin), not a direct physiological glucose-appearance gain.

Recommended v2 separation:
- `icr_g_u`: dosing-policy / patient insulin requirement parameter used to calculate bolus dose.
- `carb_glucose_gain_mg_dl_per_g` (or an equivalent physiologic meal gain parameter): independent fixed trait controlling glucose appearance amplitude.
- meal kernel parameters then control timing/shape only.

Possible causal structure:
`carb grams -> meal appearance kernel -> carb_glucose_gain -> glucose`
while separately
`carb grams / ICR -> prescribed bolus -> insulin kernel -> glucose lowering`.

The new meal-gain parameter must be calibrated from external meal-aligned data and correlated with body size / glucose distribution volume / hepatic-glucose handling where justified, rather than freely tuned as an anonymous latent factor.

Decision:
- do not continue tuning fast_fraction / slow_t50 under the coupled `carb_gain = insulin_gain / ICR` formulation.
- next experiment should decouple meal gain from ICR on the v2 branch, then jointly validate meal-aligned trajectories, 24h marginals, ACF, and 4-point fingerprint.
- main remains untouched.
