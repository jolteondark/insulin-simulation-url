# Shared day mismatch × mild kernel factorial — 2026-08-23

## Question
Run 20 showed that constrained local meal/rapid kernel tuning alone does not materially repair daytime ACF. The strongest prior positive signal was coherent patient-day meal/insulin mismatch. This screen asked whether a *small* shared day-level mismatch (0/5/10%) and a mild kernel change interact favorably, such that the combination improves r60/r120 more than either component alone without worsening glucose tails.

Production `engine.js` and `patient_generator.js` were not modified. GitHub Actions was not used.

External comparison remains the AZT1D harmonized daytime patient-median ACF: r30 0.836, r60 0.579, r120 0.102, r240 -0.054. This is replication evidence, not an official-raw calibration target.

## Design
Local Node runner; identical cohort/seeds across all cells.
- N=60 generated T1DM patients
- 10 days/patient
- 5-min sampling
- daytime ACF restricted to 06:00–24:00
- shared mismatch: one uniform multiplier `1 ± amplitude` per patient-day, applied identically to breakfast/lunch/dinner carbohydrate while insulin orders remain unchanged
- amplitudes: 0%, 5%, 10%

Kernel cells:
1. `frozen`: rapid 105/300 min, unchanged meal kernel
2. `meal_S060`: frozen rapid, slow meal t50 ×0.60
3. `rapid110_315`: rapid 110/315 min, unchanged meal kernel
4. `rapid110_315_F080S080`: rapid 110/315 min, fast and slow meal t50 ×0.80

Metrics: patient-median daytime r30/r60/r120/r240, ACF RMSE vs AZT1D, mean/CV/TIR/TBR/TAR and 4-point q10/q50/q90.

## Main results

| kernel | shared mismatch | r60 | r120 | ACF RMSE | CV % | TBR<70 % |
|---|---:|---:|---:|---:|---:|---:|
| frozen | 0% | 0.312 | -0.522 | 0.346 | 32.0 | 0.07 |
| frozen | 5% | 0.329 | -0.489 | 0.326 | 32.4 | 1.27 |
| frozen | 10% | 0.366 | -0.413 | 0.280 | 32.9 | 2.85 |
| meal_S060 | 0% | 0.333 | -0.524 | 0.340 | 37.2 | 1.42 |
| meal_S060 | 5% | 0.344 | -0.493 | 0.323 | 37.4 | 2.33 |
| meal_S060 | 10% | 0.371 | -0.435 | 0.289 | 37.7 | 3.77 |
| rapid110_315 | 0% | 0.324 | -0.526 | 0.345 | 34.0 | 0.72 |
| rapid110_315 | 5% | 0.338 | -0.495 | 0.327 | 34.3 | 1.97 |
| rapid110_315 | 10% | 0.373 | -0.419 | 0.282 | 34.7 | 3.53 |
| rapid110_315_F080S080 | 0% | 0.321 | -0.510 | 0.339 | 38.3 | 2.24 |
| rapid110_315_F080S080 | 5% | 0.331 | -0.486 | 0.324 | 38.5 | 3.18 |
| rapid110_315_F080S080 | 10% | 0.355 | -0.431 | 0.292 | 38.6 | 4.47 |

## Interaction test
Interaction was calculated as:
`(both - frozen) - (kernel alone - frozen) - (shared alone - frozen)`.

For r120, a positive interaction would mean the combination repairs the negative 2-h correlation more than expected from additive effects.

Observed r120 interaction:
- meal_S060 + 5%: -0.0025
- meal_S060 + 10%: -0.0208
- rapid110_315 + 5%: -0.0016
- rapid110_315 + 10%: -0.0020
- rapid110_315_F080S080 + 5%: -0.0089
- rapid110_315_F080S080 + 10%: -0.0297

Observed RMSE interaction was also slightly unfavorable (positive = worse than additive): approximately +0.001 to +0.018 across cells.

Therefore there is **no useful positive interaction**. The ACF improvement in combined cells is explained almost entirely by the shared day mismatch itself; kernel modifications contribute little and generally increase CV/TBR.

## Decision
This closes the constrained kernel-tuning branch of the daytime hypothesis.

- Do not pursue small meal t50 / rapid peak-duration tuning as a way to rescue the day-level mismatch mechanism.
- Do not combine a mild kernel change with shared mismatch in production.
- Shared day mismatch remains mechanistically informative because it moves ACF in the correct direction, but 10% already pushes TBR<70 to 2.85% in the otherwise frozen model while r120 is still -0.413, far from AZT1D +0.102.
- Therefore simply increasing mismatch amplitude is not an acceptable solution.

The remaining daytime discrepancy should be treated as a **state-space/day-trajectory representation problem**, not a local kernel calibration problem.
