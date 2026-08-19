# Meal gain × kernel joint grid against UOM clean meal-aligned trajectories

Diagnostic setup:
- rapid insulin time-scale fixed at 0.80
- bolus timing fixed at meal time (0 min)
- uniform patient-specific ICR retained for dose selection only
- carbohydrate glucose gain decoupled from ICR
- target: 12 external UOM points = breakfast/lunch/dinner × +60/+120/+180/+240 min
- model-side screen is a reconstructed fast-response diagnostic using representative physiology; it is directional, not final exact multi-day validation

UOM clean targets (mg/dL delta):
- breakfast 39 g: +14.3, +9.4, +5.9, -0.9
- lunch 49 g: +15.6, +21.6, +16.2, +6.9
- dinner 68 g: +11.5, +0.8, +8.6, +21.2

Grid axes:
- carb_glucose_gain_mg_dl_per_g: 1.5 to 6.0 by 0.25
- meal_fast_fraction: 0.10 to 0.60
- meal_t50_fast_min: 30,45,60,75,90
- meal_t50_slow_min: 110,150,200,260,320,400

Best common-kernel region:
- gain about 5.5 mg/dL/g
- fast fraction about 0.10 (but poorly identified because fast and slow t50 converge)
- fast t50 about 90 min
- slow t50 about 110 min
- 12-point RMSE about 9.55 mg/dL

Representative best prediction:
- breakfast: +17.6, +6.9, +3.0, +11.1
- lunch: +22.1, +8.7, +3.7, +14.0
- dinner: +30.6, +12.0, +5.2, +19.4

Interpretation:
1. The preferred common meal appearance is much later than the current fast component; the two-component model collapses toward an approximately single broad peak around t50 ~90-110 min.
2. Decoupling meal gain from ICR materially improves identifiability and lowers error, but one common linear carb-response kernel cannot reproduce all three meal types.
3. The residual is systematic: dinner +60 is strongly overpredicted as carb amount rises, while UOM +60 excursions are similar across breakfast/lunch/dinner despite 39/49/68 g median carbohydrate loads.
4. This argues against simply adding more slow-tail weight. It suggests either nonlinear/saturating early glucose appearance with meal size, meal-composition effects (fat/protein), or meal-type/context dependence.
5. Do not introduce separate breakfast/lunch/dinner physiology yet. First test the smallest interpretable extension: nonlinear meal-size dependence of early appearance while conserving total carbohydrate appearance.

Decision:
- keep ICR and carb glucose gain decoupled in validation work
- keep rapid time-scale ~0.80 provisionally
- provisional common meal kernel should move much later (t50 roughly 90-110 min)
- next ablation: size-dependent early appearance / gastric delivery saturation, not another latent state
- exact JS multi-day confirmation is required before production adoption

Main branch remains untouched.
