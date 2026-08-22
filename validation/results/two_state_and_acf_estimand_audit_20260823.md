# Run 22 — two-state trajectory screen + ACF estimand audit (2026-08-23)

## Scope
Production remains frozen. No `engine.js` or `patient_generator.js` change was made.

This run followed Run 21's recommendation to test whether a minimal two-component within-day state-space can produce a qualitatively new Pareto improvement in daytime ACF without damaging glucose tails. When that failed, the ACF estimand itself was audited before adding further latent physiology.

## 1. Baseline reproduction
A faithful local port of the frozen JavaScript model was run with the same cohort definition used in recent screens.

Reference protocol:
- generated T1DM cohort from seeds 982001+
- daytime = 06:00–24:00
- 5-min sampling
- frozen meal/rapid kernels
- no production code change

The Run-21 baseline was reproduced essentially exactly at N=60 × 10 days:
- r30 = 0.783
- r60 = 0.317
- r120 = -0.530
- r240 = -0.174
- daytime ACF RMSE vs AZT1D harmonized reference = 0.349
- mean = 117.61 mg/dL
- CV = 30.68%
- TBR<70 = 0.20%
- TBR<54 = 0%
- TAR>180 = 8.62%
- TAR>250 = 0.21%

This exact baseline reproduction is the validation check for the local port used below.

## 2. Minimal two-state within-day trajectory screen

### State definitions
This was mechanism discrimination only, not a proposed production physiology implementation.

Two independent bounded, zero-mean, mean-reverting within-day states were introduced:

1. **slow glucose-balance drive**
   - additive glucose drive, mg/dL/min
   - half-life 180 min
   - day mean explicitly removed
   - bounded at ±2.5 stationary SD

2. **effective insulin-action state**
   - multiplicative scale on rapid/basal-delta insulin effect
   - half-life 120 min
   - day mean explicitly removed
   - bounded at ±2.5 stationary SD

The purpose was to test whether changing trajectory shape with two orthogonal low-amplitude states creates a covariance effect unavailable to one scalar day-level shift.

### Main screen
The state-space cells were evaluated at N=40 × 8 days with identical frozen cohort/seeds across cells.

| balance SD (mg/dL/min) | insulin state SD | r60 | r120 | ACF RMSE | TBR<70 | CV | overnight r120 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 0.315 | -0.530 | 0.349 | 0.21% | 30.8% | 1.000 |
| 0.005 | 0 | 0.315 | -0.529 | 0.348 | 0.18% | 30.8% | 0.992 |
| 0.010 | 0 | 0.316 | -0.530 | 0.348 | 0.20% | 30.8% | 0.973 |
| 0.020 | 0 | 0.319 | -0.524 | 0.345 | 0.29% | 30.9% | 0.931 |
| 0 | 0.020 | 0.316 | -0.525 | 0.346 | 0.39% | 30.9% | 1.000 |
| 0 | 0.040 | 0.321 | -0.514 | 0.340 | 0.76% | 30.9% | 1.000 |
| 0 | 0.060 | 0.331 | -0.499 | 0.330 | 1.19% | 31.0% | 1.000 |
| 0 | 0.080 | 0.343 | -0.478 | 0.317 | 1.73% | 31.2% | 1.000 |
| 0.010 | 0.040 | 0.322 | -0.513 | 0.339 | 0.73% | 30.9% | 0.984 |
| 0.020 | 0.060 | 0.335 | -0.496 | 0.328 | 1.18% | 31.1% | 0.967 |
| 0.020 | 0.080 | 0.347 | -0.476 | 0.316 | 1.69% | 31.3% | 0.974 |

Stronger insulin-state amplitudes were checked to determine whether a delayed qualitative transition occurs:

| insulin state SD | r60 | r120 | ACF RMSE | TBR<70 | TBR<54 | CV |
|---:|---:|---:|---:|---:|---:|---:|
| 0.10 | 0.357 | -0.455 | 0.303 | 2.18% | 0.06% | 31.4% |
| 0.12 | 0.368 | -0.431 | 0.289 | 2.62% | 0.12% | 31.6% |
| 0.16 | 0.391 | -0.371 | 0.256 | 3.42% | 0.29% | 32.1% |

### Interpretation
The second state did **not** create a new Pareto regime.

- slow balance variation can reduce the unrealistic overnight ACF≈1, but has almost no useful daytime r120 effect at low amplitude;
- effective-insulin variation moves daytime ACF in the correct direction, but only gradually and with a monotonic TBR penalty;
- combining the two states gives essentially additive behavior rather than a favorable interaction;
- even an unrealistically large 16% insulin-action SD leaves r120 strongly negative (-0.371) while TBR<70 reaches 3.42%.

Therefore the Run-21 hypothesis that a minimal two-state latent architecture might rescue daytime ACF is weakened substantially. No production latent state should be added from this result.

## 3. ACF estimand audit

After the two-state screen failed, the frozen model's raw ACF was decomposed into:

- correlation of the original 5-min glucose trajectory;
- correlation after subtracting each patient's mean glucose at each 5-min clock-time bin across days.

This clock-time de-meaning removes the fixed repeated daily waveform and asks what day-to-day within-patient residual process remains.

N=40 × 8 days frozen model:

### Raw daytime patient-median ACF
- r30 = 0.781
- r60 = 0.315
- r120 = -0.530
- r240 = -0.175

### Clock-time-demeaned daytime patient-median ACF
- r30 ≈ 1.000
- r60 ≈ 1.000
- r120 ≈ 1.000
- r240 ≈ 1.000

Median residual SD after clock-time de-meaning:
- **0.133 mg/dL**
- patient 10th–90th percentile approximately 0.056–0.232 mg/dL

### Interpretation
This is the most important result of Run 22.

The frozen model's negative raw daytime r120 is not evidence that the model has a genuinely short stochastic memory. It is overwhelmingly generated by the deterministic repeated clock-time waveform (meal/bolus trajectory). Once that fixed waveform is removed, essentially no stochastic within-patient process remains; the tiny residual is almost perfectly correlated because it is largely deterministic convergence from the carried day-end state.

Therefore continuing to tune latent noise against **raw ACF alone** risks fitting a statistic that conflates two different estimands:

1. the mean 24-h clock-time trajectory shape; and
2. the covariance of deviations around that trajectory.

The external AZT1D raw daytime ACF remains valid as a descriptive mismatch, but it should not be used as a direct latent-noise calibration target until AZT1D is analyzed with the same clock-time de-meaning (or an equivalent detrending approach).

## 4. New audit script
Added:
- `validation/scripts/clock_demeaned_acf_audit.js`

The script reports frozen-model raw and clock-demeaned ACF and can also process an extracted AZT1D CSV directory via `AZT1D_DIR` using exact timestamp pairs. The public Glucose-ML repository exposes the 25 extracted subject CSVs with columns `timestamp,glucose_value_mg_dl`, so this audit can be completed without relying on the ZIP.

Important execution note: the new JS audit script was added for reproducibility but was not independently executed as Node in this run because the local runtime could not clone/fetch GitHub directly. The numerical model results above were produced by a faithful local port whose baseline exactly reproduced the Run-21 JavaScript result. External AZT1D clock-demeaned ACF has **not yet been computed** in this run.

## 5. Decision
- Keep production frozen.
- Do not add the tested two-state latent process.
- Do not continue fitting raw r120 by increasing state amplitudes.
- Reclassify raw ACF as a mixed trajectory-plus-covariance diagnostic rather than a direct latent-memory target.
- Highest-value next step: compute the same raw vs clock-time-demeaned ACF in AZT1D (and ideally T1D-UOM). If the real residual ACF remains materially different, then design stochastic states against that residual target. If the discrepancy collapses after de-meaning, focus on realistic day-trajectory / meal-insulin timing heterogeneity rather than generic memory/noise.
