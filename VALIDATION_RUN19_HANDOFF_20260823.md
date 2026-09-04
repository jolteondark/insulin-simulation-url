# T1DM distributional validation — run 19 handoff (2026-08-23)

Read `VALIDATION_RUN18_HANDOFF_20260823.md` first for the prior daytime phase-lock screen and full context.

## What this run did

Two local, validation-only analyses were completed. GitHub Actions was not used and production files were not changed.

New artifacts:
- `validation/scripts/latent_insulin_demand_state_screen.js`
- `validation/results/latent_insulin_demand_state_screen_20260823.md`
- `validation/scripts/daytime_component_decomposition.js`
- `validation/results/daytime_component_decomposition_20260823.md`

Frozen production references remain:
- `engine.js` 0.94-browser-port, blob `a0b2d51c071f404fbfd79142be910fd28608d9bd`
- `patient_generator.js` 0.79-browser-port, blob `1cea478a112bc6eca719e4df1ecc7aac9984e0ab`

## Result A — bounded latent insulin-demand state

A bounded rapid-insulin demand/action multiplier was shared by all three meals and held for 1, 2, or 3 patient-days.

Completed canonical screen:
- N=60 patients
- 14 days/patient
- amplitudes ±3%, ±5%, ±7.5%, ±10%
- 1/2/3-day persistence

Frozen reference in this protocol:
- daytime r60 0.315
- daytime r120 -0.524
- daytime ACF RMSE vs AZT1D 0.346
- TBR<70 0.32%
- overnight ACF ~1.000 at all tested lags

Representative results:
- ±5%, 3-day: r60 0.328, r120 -0.489, RMSE 0.325, TBR<70 1.12%
- ±7.5%, 1-day: r60 0.348, r120 -0.453, RMSE 0.303, TBR<70 2.16%
- ±10%, 1-day: r60 0.366, r120 -0.417, RMSE 0.282, TBR<70 2.86%

Interpretation:
- coherent within-day insulin/meal mismatch is a real contributor;
- increasing amplitude improves daytime ACF but tails worsen before r120 becomes realistic;
- extending persistence from 1 to 3 days adds little;
- therefore tuning an AR/OU persistence coefficient is low priority;
- overnight ACF is completely unaffected, confirming that the night defect is structurally separate.

A larger N=120 rerun was started and reproduced the same direction through completed 0%, 3%, and first 5% conditions, but the full 13-condition run exceeded the local execution limit. It is not counted as a completed result.

## Result B — direct equation-term decomposition

The frozen engine was instrumented in memory only to expose per-minute contributions from meal input, rapid bolus, basal delta, restore-to-setpoint, counterregulation and hepatic drive.

Protocol:
- N=60 patients
- 7 days/patient
- 1,260 meal events

Median glucose excursion relative to meal time:
- +60 min: +102.6 mg/dL
- +120 min: +53.2 mg/dL
- +180 min: +4.2 mg/dL

Median integrated contributions:

### 0–60 min
- meal +151.44
- rapid bolus -42.73
- restore -6.30

### 60–120 min
- meal +57.71
- rapid bolus **-98.59**
- restore -9.03

### 120–180 min
- meal +26.65
- rapid bolus **-74.81**
- restore -0.82

The median net `meal + rapid + restore` contribution first crosses below zero at about **59 min after meal time**.

This identifies the dominant cause of the wrong-sign daytime r120: **the rapid-insulin kernel remains stronger than the decaying meal input from roughly one hour onward.** RestoreK is a secondary contributor, not the main cause.

This is consistent with the earlier weak effect of restoreK tuning and explains why generic meal/bolus noise can reduce phase locking without fixing the deterministic waveform itself.

## Current mechanistic diagnosis

The daytime problem is now narrower than before:
1. deterministic meal/bolus repetition exaggerates phase locking;
2. coherent within-day mismatch is missing, but adding it alone cannot solve r120 safely;
3. the underlying wrong-sign waveform is mainly a **relative meal-versus-rapid kernel geometry problem in the ~45–180 min interval**;
4. restore-to-setpoint is not the primary generator of the reversal;
5. overnight ACF≈1 remains a separate lack-of-within-night-variation problem.

## Production decision

**Keep production frozen. No model revision is approved.**

The new analyses are mechanism discrimination, not calibration.

## Highest-priority next experiment

Do not spend the next run tuning day-state persistence or restoreK.

Instead perform a constrained relative-kernel screen that explicitly tracks meal/rapid crossing time and asks whether the daytime r120 sign can be corrected without worsening TBR/CV/marginals.

Suggested dimensions:
- modest rapid action shape changes around the current profile, avoiding the already-failed aggressive 120–140 min peak / 360–420 min duration region;
- meal fast-fraction and fast/slow t50 changes jointly rather than simple blanket widening;
- preserve total kernel area;
- evaluate crossing time, daytime r30/r60/r120/r240, mean/CV/TIR/TBR/TAR, and 4-point distributions.

Only after a daytime structural candidate passes those gates should a separate bounded within-night stochastic mechanism be designed for the overnight ACF defect.
