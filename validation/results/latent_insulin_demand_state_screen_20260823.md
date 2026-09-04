# Latent insulin-demand state screen — 2026-08-23

## Purpose

Run 18 showed that day-shared meal/insulin mismatch improves daytime ACF more efficiently than independent meal noise. This screen asked whether a **small bounded patient-day insulin-demand / rapid-insulin action state**, persistent across 1–3 days, can improve the frozen model's daytime temporal structure without producing unacceptable low-glucose tails.

Production `engine.js` and `patient_generator.js` were not modified.

## Protocol

- local Node execution only; GitHub Actions not used
- frozen `engine.js` 0.94-browser-port
- frozen `patient_generator.js` 0.79-browser-port
- N = 60 generated T1DM patients
- 14 simulated days per patient
- seeds 970001–970060
- glucose sampled every 5 min for analysis
- amplitudes: ±3%, ±5%, ±7.5%, ±10%
- persistence: state held constant for 1, 2, or 3 consecutive patient-days
- one state multiplier shared by breakfast/lunch/dinner rapid doses during the block
- state is bounded and zero-centered; no production physiology was added
- daytime ACF target = AZT1D 06:00–24:00 patient-median ACF
- overnight ACF target = AZT1D 00:00–06:00 patient-median ACF

Targets:
- daytime r30/r60/r120/r240 = 0.836 / 0.579 / 0.102 / -0.054
- overnight r30/r60/r120/r240 = 0.889 / 0.760 / 0.460 / 0.086
- AZT1D harmonized marginals: mean 145.08 mg/dL, CV 32.47%, TBR<70 1.589%, TBR<54 0.296%, TAR>180 19.32%, TAR>250 3.46%

## Complete N=60 results

| amplitude | hold days | daytime r60 | daytime r120 | day ACF RMSE | night ACF RMSE | mean | CV % | TBR<70 % | TBR<54 % | TAR>180 % |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0% | 1 | 0.315 | -0.524 | 0.346 | 0.547 | 119.90 | 31.35 | 0.32 | 0.000 | 10.37 |
| 3% | 1 | 0.320 | -0.513 | 0.339 | 0.547 | 119.99 | 31.46 | 0.57 | 0.000 | 10.44 |
| 3% | 2 | 0.321 | -0.512 | 0.338 | 0.547 | 120.10 | 31.43 | 0.60 | 0.000 | 10.46 |
| 3% | 3 | 0.321 | -0.511 | 0.338 | 0.547 | 120.09 | 31.46 | 0.74 | 0.000 | 10.43 |
| 5% | 1 | 0.331 | -0.493 | 0.327 | 0.547 | 120.26 | 31.59 | 1.18 | 0.000 | 10.51 |
| 5% | 2 | 0.326 | -0.490 | 0.327 | 0.547 | 120.37 | 31.58 | 1.12 | 0.000 | 10.58 |
| 5% | 3 | 0.328 | -0.489 | 0.325 | 0.547 | 120.11 | 31.62 | 1.12 | 0.000 | 10.52 |
| 7.5% | 1 | 0.348 | -0.453 | 0.303 | 0.547 | 120.26 | 32.06 | 2.16 | 0.021 | 10.55 |
| 7.5% | 2 | 0.346 | -0.459 | 0.307 | 0.547 | 120.29 | 32.04 | 2.32 | 0.025 | 10.58 |
| 7.5% | 3 | 0.339 | -0.461 | 0.309 | 0.547 | 119.73 | 32.19 | 1.97 | 0.012 | 10.39 |
| 10% | 1 | 0.366 | -0.417 | 0.282 | 0.547 | 121.10 | 32.19 | 2.86 | 0.086 | 10.87 |
| 10% | 2 | 0.361 | -0.418 | 0.283 | 0.547 | 121.14 | 32.48 | 2.96 | 0.057 | 10.94 |
| 10% | 3 | 0.351 | -0.439 | 0.295 | 0.547 | 121.25 | 32.29 | 2.93 | 0.061 | 11.04 |

The full daytime baseline ACF was r30 0.780, r60 0.315, r120 -0.524, r240 -0.168. The best ACF RMSE in this screen was the ±10%, 1-day condition: r30 0.796, r60 0.366, r120 -0.417, r240 -0.087.

## 4-point structure

Representative pre-meal / bedtime distribution widening:

### Frozen baseline
- pre-breakfast q10 / median / q90: 102.0 / 110.0 / 118.1
- pre-lunch: 84.2 / 92.6 / 100.5
- pre-dinner: 79.9 / 89.5 / 97.4
- bedtime: 139.6 / 148.0 / 161.3

### ±5%, 3-day state
- pre-breakfast: 102.0 / 110.1 / 118.2
- pre-lunch: 82.2 / 92.7 / 101.9
- pre-dinner: 77.4 / 89.3 / 102.3
- bedtime: 135.2 / 149.8 / 166.6

### ±10%, 1-day state
- pre-breakfast: 100.6 / 110.8 / 120.7
- pre-lunch: 77.4 / 94.0 / 106.5
- pre-dinner: 73.9 / 89.7 / 111.5
- bedtime: 129.5 / 150.7 / 176.1

The state widens later daytime/bedtime distributions substantially but barely moves pre-breakfast because the frozen overnight dynamics strongly collapse trajectories back toward fasting setpoint.

## Main findings

### 1. A small coherent insulin-demand state is a real daytime contributor, but not the solution

Increasing state amplitude monotonically improves daytime ACF RMSE. This independently supports Run 18's conclusion that **coherent within-day mismatch matters more than independent meal noise**.

However, even ±10% only moves daytime r120 from -0.524 to about -0.417, still far from AZT1D +0.102. The temporal defect therefore cannot be repaired by a small bolus-demand multiplier alone.

### 2. Persistence from 1 to 3 days adds little

At a fixed amplitude, holding the state for 1, 2, or 3 days changes ACF only modestly and non-monotonically. The important timescale appears to be coherence across the meals/hours of a day; extending the same scalar state across multiple days is not strongly supported by this screen.

This argues against spending the next cycle tuning an AR/OU persistence coefficient before a better mechanism is identified.

### 3. Low-glucose tails deteriorate before temporal structure becomes realistic

At ±5%, TBR<70 rises into roughly 1.1–1.2%, near the AZT1D harmonized magnitude, but r120 remains near -0.49. At ±7.5–10%, ACF improves more, but TBR<70 rises to ~2–3% while r120 is still strongly negative.

Therefore this family does not produce a convincing Pareto solution.

### 4. Overnight ACF is completely untouched

All tested conditions retain overnight ACF approximately 1.000 at every lag and night ACF RMSE ≈0.547.

This is structurally informative. In the frozen engine, after the dinner/rapid tail fades there is effectively no stochastic within-night forcing; glucose follows a deterministic relaxation toward the patient's fasting setpoint. A patient-day scalar bolus-demand state cannot fix that.

The overnight mismatch therefore requires a **separate within-night stochastic process or other event/process with sub-4-hour variation**, not more day-level persistence.

## Decision

**Do not modify production. Do not promote this latent bolus-demand state as a model revision.**

It is useful mechanism-discrimination evidence:
- coherent within-day insulin/meal mismatch is genuinely missing;
- 1–3 day scalar persistence is not the key missing degree of freedom;
- the daytime r120 defect remains largely structural;
- the overnight defect is separate and cannot be repaired by a day-level state.

## Incomplete robustness check

A larger N=120 / 14-day rerun was started locally. It reproduced the same direction through the completed 0%, 3%, and first 5% conditions, but the full 13-condition run exceeded the local execution time limit. It is therefore **not counted as a completed validation result**. The completed N=60 screen above is the canonical result for this run.

## Highest-value next step

Stop tuning state persistence. The next discrimination should target the remaining structural daytime sign reversal directly.

Recommended next screen:
1. quantify the contribution of the deterministic `restoreK` term versus meal/rapid convolution to the 60–180 min reversal using component-wise trajectories / counterfactual decomposition, without changing production parameters;
2. test whether the negative r120 is generated mainly by restoration-to-setpoint after excursions or by the bolus kernel crossing the meal kernel;
3. only after that choose the minimal mechanism revision;
4. treat overnight separately, with a narrowly bounded within-night process and explicit TBR/4-point constraints.

This is higher information value than another broad parameter grid because it identifies which equation term is actually generating the wrong sign at 120 min.
