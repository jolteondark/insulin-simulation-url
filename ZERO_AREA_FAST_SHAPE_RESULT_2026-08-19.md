# Zero-area fast shape redistribution — 2026-08-19

Validation-only experiment on `v2/state-space-minimal`. Production/main untouched.

## Hypothesis

Test whether a mean-preserving temporal redistribution term can improve the residual pattern without changing total meal/insulin exposure:

`fast_flux_new = fast_flux_old + alpha * meal_gain * carb * H(t)`

with

`H(t) = late_normalized_gaussian(t; center=210, sd=60) - early_normalized_gaussian(t; center=60, sd=35)`

The discrete integral of H over the implemented horizon is `2.26e-15`, effectively zero.

This is intentionally a validation-only shape correction, not a claimed physiological mechanism.

## Fixed background

- N=120 generated patients, no external validation gate
- 7 days, 1 warmup day
- rapid scale 0.80
- fast_scale 0.80
- finite-memory 210 min
- basal-requirement coupling 0.28
- setpoint shift +15 mg/dL
- independent meal gain 5 mg/dL/g at 70 kg with weight scaling
- patient-specific meal kinetics retained
- no meal-size saturation

## Results

UOM targets:
- mean 146.46
- SD 56.23
- ACF 30/60/120/240 = 0.863 / 0.634 / 0.247 / -0.012
- TBR<70 2.06%
- TBR<54 0.276%
- any four-check <70 7.68%
- all-four TIR 43.31%

### alpha = 0 baseline
- mean 154.30
- SD 66.23
- ACF 0.868 / 0.609 / 0.205 / 0.184
- TBR<70 7.94%
- TBR<54 3.25%
- four-check means 144.7 / 128.5 / 135.9 / 169.8
- any four-check <70 21.67%
- all-four TIR 31.53%

### best composite score: alpha = 0.075
- mean 154.23
- SD 65.00
- ACF 0.867 / 0.603 / 0.212 / 0.191
- TBR<70 7.58%
- TBR<54 3.36%
- four-check means 147.1 / 129.3 / 142.2 / 160.9
- any four-check <70 19.17%
- all-four TIR 35.56%

### stronger redistribution: alpha = 0.15
- mean 154.38
- SD 64.06
- ACF 0.865 / 0.602 / 0.205 / 0.200
- TBR<70 7.36%
- TBR<54 3.53%
- four-check means 149.5 / 130.2 / 148.8 / 152.4
- any four-check <70 18.19%
- all-four TIR 37.92%

### alpha = 0.20
- mean 154.60
- SD 63.62
- ACF 0.863 / 0.595 / 0.194 / 0.200
- TBR<70 7.29%
- TBR<54 3.67%
- four-check means 151.3 / 130.9 / 153.5 / 146.8
- any four-check <70 17.22%
- all-four TIR 38.75%

## Interpretation

The zero-area correction is directionally useful:
- it improves the four-check joint structure substantially;
- it lowers late-evening overprediction;
- it reduces SD modestly without materially moving the 24-h mean;
- the best ACF30 remains essentially exact.

However it does **not** solve the main hypoglycemia mismatch:
- TBR<70 only falls from 7.94% to about 7.3–7.6%, still far above UOM 2.06%;
- TBR<54 actually worsens slightly as alpha increases;
- ACF240 remains positive (~0.19–0.20) and far from UOM -0.012.

Therefore:

> There is a real temporal-shape residual, and a zero-area redistribution term can correct part of it. But the excess hypoglycemia is not primarily caused by this shape error.

Do not promote this correction to production yet. Treat it as evidence that temporal placement contributes to the four-check mismatch, while a separate source is responsible for most of the low-glucose tail.

## Next diagnostic implication

The next search should focus on why the model produces too much lower-tail dispersion despite a nearly correct short-lag ACF. Candidate directions should be tested without adding arbitrary mean shifts:
1. heterogeneity of CF/ICR pairing and tail patients rather than population-average prandial strength;
2. nonlinear glucose-dependent insulin effectiveness / floor behavior;
3. distribution of counterregulatory thresholds/strength specifically among low-tail patients;
4. observed-event UOM carb/bolus pairing rather than synthetic carb / generator ICR dosing.

The zero-area term may remain as a small shape correction only if it survives these later validations.