# Meal appearance 24h finalist validation — 2026-08-19

N=120, 7 days, 1-day warmup. Rapid kernel scale 0.80, bolus lead 0 min, uniform patient-specific ICR, circadian off, finite-memory basal-requirement state (memory 210 min, coupling 0.28, fast_scale 0.80, setpoint shift +15). No fabricated fat values in the 24h ward context.

UOM targets:
- four-point mean: 121.5 / 149.1 / 153.2 / 154.1 mg/dL
- overall mean 146.463, SD 56.225
- median within-subject ACF30/60/120/240: 0.863 / 0.634 / 0.247 / -0.012
- any 4-point <70: 7.68%
- any 4-point >180: 53.77%
- all four 70–180: 43.31%

Best N120 globally-slowed candidate from prior directional grid:
- early carb cap 40 g
- fast t50 90 min
- slow t50 150 min
- decoupled gain 5.0 mg/dL/g at 70 kg

Result:
- four-point mean: 153.3 / 138.2 / 154.7 / 149.9
- four-point RMSE 16.96 mg/dL
- overall mean 150.74
- overall SD 56.66
- median ACF30/60/120/240: 0.956 / 0.858 / 0.648 / 0.457
- any <70: 16.81%
- any >180: 46.67%
- all-four TIR: 37.36%

Interpretation:
1. Decoupling meal gain from ICR plus size saturation can improve the four-point shape and preserve overall SD.
2. However forcing all patients toward a globally slow 90–150 min meal appearance kernel grossly over-retains temporal correlation. The ACF mismatch is structural, not a small calibration miss.
3. Therefore the globally slowed common meal kernel is rejected despite its meal-aligned and four-point improvements. This is an example of why the validation hierarchy must include temporal structure rather than fitting one conditional trajectory.
4. The next test should retain the existing patient-specific meal absorption heterogeneity (`meal_t50_fast_min`, `meal_t50_slow_min`, `meal_fast_fraction`, ultimately driven by z_meal_speed) and add only the defensible structural changes: ICR/meal-gain decoupling plus meal-size early saturation. Do not freeze 90/150 min as physiology.
5. Fat delay remains conditional on observed meal composition and is not fabricated in the ward/game context.

Main branch remains untouched.
