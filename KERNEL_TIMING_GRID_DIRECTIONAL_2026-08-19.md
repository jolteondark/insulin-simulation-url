# Kernel / timing grid directional check (2026-08-19)

Branch only. Main untouched.

Baseline fixed physiology:
- finite-memory basal-requirement state: memory 210 min, coupling 0.28
- fast_scale 0.80
- setpoint shift +15 mg/dL
- uniform patient-specific ICR (meal-specific 300/400/400 policy removed)
- circadian disabled for this ablation
- obesity/IR phenotype retained

UOM 4-point target means (mg/dL):
- 07:00 121.5
- 12:00 149.1
- 18:00 153.2
- 21:00 154.1

A 27-condition directional Python reconstruction (N=30, 7 days, day 1 warmup) varied only:
- meal absorption time scale: 0.65 / 0.80 / 1.00
- rapid-insulin time scale: 0.80 / 1.00 / 1.20
- bolus lead: 0 / 15 / 30 min

This was a directional structural check, not the canonical exact-JS validation. The exact JS grid runner is `validation_kernel_timing_grid_node.js` and is wired into `.github/workflows/v2-validation.yml`.

Baseline (meal 1.0, rapid 1.0, lead 15):
- 07 136.7
- 12 115.4
- 18 116.7
- 21 176.0
- 4-point RMSE vs UOM: 28.2 mg/dL
- overall mean 145.4
- overall SD 55.0
- any 4-point <70: 21.7%
- any 4-point >180: 52.2%
- all four 70-180: 31.1%

Best directional condition:
- meal time scale 0.80
- rapid-insulin time scale 0.80
- bolus lead 30 min

Directional result:
- 07 144.0
- 12 130.7
- 18 137.2
- 21 144.0
- 4-point RMSE vs UOM: 17.3 mg/dL
- overall mean 145.4
- overall SD 47.2
- any 4-point <70: 7.8%
- any 4-point >180: 36.7%
- all four 70-180: 56.7%

Interpretation:
1. Shortening the rapid-insulin profile by ~20% was the strongest consistent improvement.
2. Earlier bolus timing (30 min pre-meal in this coarse grid) markedly reduced the 21:00 overshoot and raised pre-meal values.
3. Slightly faster meal absorption (time scale ~0.8) was best among tested meal shapes, but had less leverage than rapid-insulin scale / bolus timing.
4. The best condition over-corrects some distributional metrics (overall SD too low; any >180 too low; all-four TIR too high), so it is not a final parameter set.
5. Do not calibrate bolus lead to UOM blindly: actual bolus timing in UOM should be analyzed before promoting a 30-min lead into the educational model.

Next step:
- inspect real UOM meal/bolus timing distribution and conditional post-meal trajectories;
- then tune rapid profile and bolus timing with real timing strata rather than fitting 4-point means alone.
