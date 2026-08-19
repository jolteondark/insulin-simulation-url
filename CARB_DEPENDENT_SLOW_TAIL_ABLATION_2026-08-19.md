# Carb-dependent slow-tail ablation — 2026-08-19

Branch-only exploratory result. main unchanged.

## Fixed baseline
- finite-memory state: memory 210 min, coupling 0.28
- fast_scale 0.80
- setpoint shift +15 mg/dL
- uniform patient-specific ICR (meal-specific 300/400/400 policy removed)
- circadian OFF for this diagnostic ablation
- rapid insulin time-scale 0.80
- bolus timing 0 min relative to meal (UOM median approximately 0 min)

## Tested mechanism
For carb amount C > 50 g, define excess = (C-50)/50.

- `meal_fast_fraction = base_fast_fraction - alpha * excess`
- `meal_t50_slow = base_t50_slow * (1 + beta * excess)`

Exploratory grid:
- alpha = 0, 0.10, 0.20
- beta = 0, 0.50, 1.00

Directional local branch-formula reconstruction, N=30 patients, 7 days, day 1 warmup. Not an exact GitHub Actions artifact.

## UOM four-point target
07 / 12 / 18 / 21 h means:
121.5 / 149.1 / 153.2 / 154.1 mg/dL

## Results
Best four-point RMSE in this small grid was alpha=0.20, beta=0:
- model four-point means: 137.8 / 116.3 / 129.2 / 157.5
- RMSE: 21.96 mg/dL
- SD: 52.3 mg/dL
- CV: 36.7%
- any four-point <70: 16.7%
- all four 70–180: 51.1%

Baseline alpha=0, beta=0:
- four-point means: 137.0 / 115.9 / 127.5 / 158.5
- RMSE: 22.47 mg/dL
- SD: 53.5 mg/dL
- CV: 37.5%

Strong slow-t50 extension worsened four-point shape. Example alpha=0.20, beta=1.0:
- 139.5 / 117.0 / 124.8 / 154.4
- RMSE 23.23 mg/dL

## Interpretation
The UOM carb-stratified net CGM trajectory showed prolonged elevation after large meals, but encoding this directly as longer gastric/meal absorption tail does NOT solve the simulator's four-point mismatch. This is expected because the observed trajectory is a net result of meal composition, insulin dosing, corrections, basal state, activity, and other context; it is not an isolated absorption kernel.

A small carb-dependent reduction in fast fraction gives only marginal benefit. Large slow-t50 prolongation should not be adopted.

## Decision
Do not add carb-dependent slow-tail as a core mechanism yet.

Current residual mismatch remains mainly low pre-lunch and pre-dinner glucose despite a good bedtime value after rapid-kernel recalibration. The next diagnostic target should be the treatment/context layer between meals: correction boluses / snacks / actual meal timing and carbohydrate timing, rather than further reshaping the meal absorption kernel from net CGM trajectories alone.
