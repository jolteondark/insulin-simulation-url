# Run 22 — two-state trajectory and bounded OU residual screens (2026-08-23)

Production remained frozen. No `engine.js` or `patient_generator.js` change was made. All experiments were local Node executions; GitHub Actions was not used.

## External reference
AZT1D harmonized patient-median ACF used only as the independent validation reference:

- daytime 06:00–24:00: r30 0.836, r60 0.579, r120 +0.102, r240 -0.054
- overnight 00:00–06:00: r30 0.889, r60 0.760, r120 0.460, r240 0.086

The key question after Run 21 was whether moving from one scalar day state to a minimal two-component trajectory representation could create a new Pareto improvement, and whether a generic within-day stochastic process could explain both the daytime and overnight temporal mismatch.

---

## Experiment A — bounded day balance state + zero-sum intraday prandial shape state

### Design
Exploratory screen, N=20 generated patients × 6 days, 5-min sampling, frozen engine and generator.

State A = bounded patient-day fasting-setpoint offset.

State B = zero-sum within-day prandial action shape: breakfast order multiplied by `(1+a)`, lunch unchanged, dinner multiplied by `(1-a)`. This changes within-day trajectory shape without a same-direction change in all three meal doses.

Correlation modes:
- protective: high glucose-balance day gets stronger breakfast action / low day weaker action;
- independent: the two states are independently sampled;
- adverse: opposite coupling.

This is mechanism discrimination only, not a proposed treatment or physiology implementation.

### Results
| balance amp | shape amp | coupling | r60 | r120 | ACF RMSE | TBR<70 | TBR<54 | CV |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 0 | 0% | — | 0.317 | -0.536 | 0.352 | 0.07% | 0.00% | 29.19% |
| ±20 mg/dL | 0% | — | 0.363 | -0.461 | 0.304 | 1.58% | 0.00% | 30.46% |
| ±20 | 5% | protective | 0.357 | -0.470 | 0.310 | 1.77% | 0.00% | 30.55% |
| ±20 | 5% | independent | 0.363 | -0.448 | 0.298 | 1.86% | 0.00% | 30.53% |
| ±20 | 5% | adverse | 0.373 | -0.431 | 0.288 | 1.82% | 0.00% | 30.40% |
| ±20 | 10% | protective | 0.358 | -0.472 | 0.311 | 2.06% | 0.03% | 30.70% |
| ±20 | 10% | independent | 0.374 | -0.430 | 0.287 | 2.50% | 0.00% | 30.72% |
| ±30 | 5% | protective | 0.389 | -0.404 | 0.271 | 3.05% | 0.02% | 31.52% |
| ±30 | 10% | protective | 0.389 | -0.411 | 0.275 | 3.32% | 0.06% | 31.60% |

Interpretation:
- the zero-sum second state does not create a qualitatively new covariance effect;
- protective coupling can restrain extremes but also erases much of the ACF gain;
- independent/adverse coupling moves r120 in the correct direction only modestly and still does not approach a positive r120;
- larger balance amplitude continues the already-known TBR trade-off.

### Decision
**Reject this two-day-scalar architecture as the daytime solution.** Adding a second scalar that merely redistributes prandial action across the day does not open a new Pareto frontier.

Artifact: `validation/scripts/two_state_trajectory_screen.js`

---

## Experiment B — bounded within-day OU residual process

### Why test this
The frozen model has two apparently opposite temporal defects:
- daytime r120 is strongly negative;
- overnight ACF is almost exactly 1, indicating excessive determinism.

A bounded zero-mean OU residual was therefore added *after* latent glucose simulation as a validation-only process. This deliberately asks a model-class question before assigning physiology: can one modest hours-scale stochastic process repair both defects without damaging tails?

### Design
N=40 generated patients × 10 days, 5-min sampling, same frozen cohort. Residual was bounded at ±2.5 SD. Half-lives 60–240 min and SD 5–20 mg/dL were screened; a refinement around 6–8.5 mg/dL and 90–120 min was also run.

### Main results
| residual SD | half-life | daytime r60 | daytime r120 | day RMSE | overnight r60 | overnight r120 | night RMSE | TBR<70 | TBR<54 | CV |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | — | 0.315 | -0.530 | 0.349 | 1.000 | 1.000 | 0.547 | 0.21% | 0.00% | 30.84% |
| 5 | 60 min | 0.315 | -0.518 | 0.343 | 0.653 | 0.458 | 0.083 | 0.88% | 0.00% | 31.14% |
| 5 | 120 | 0.321 | -0.514 | 0.340 | 0.798 | 0.619 | 0.131 | 0.86% | 0.00% | 31.17% |
| 6 | 90 | 0.325 | -0.509 | 0.337 | 0.695 | 0.472 | **0.049** | 1.07% | 0.00% | 31.18% |
| 7.5 | 90 | 0.325 | -0.501 | 0.333 | 0.668 | 0.429 | 0.067 | 1.52% | 0.01% | 31.56% |
| 7.5 | 120 | 0.327 | -0.498 | 0.332 | 0.728 | 0.526 | 0.096 | 1.48% | <0.01% | 31.55% |
| 8.5 | 90 | 0.326 | -0.494 | 0.330 | 0.681 | 0.472 | 0.075 | 1.70% | 0.02% | 31.57% |
| 10 | 120 | 0.337 | -0.454 | 0.309 | 0.723 | 0.517 | 0.081 | 2.26% | 0.09% | 31.99% |
| 15 | 120 | 0.364 | -0.407 | 0.280 | 0.671 | 0.465 | 0.062 | 4.94% | 0.66% | 33.23% |
| 20 | 120 | 0.376 | -0.344 | 0.248 | 0.683 | 0.477 | 0.093 | 8.29% | 1.85% | 35.24% |
| 20 | 240 | 0.406 | -0.311 | 0.225 | 0.821 | 0.688 | 0.248 | 7.12% | 1.43% | 34.81% |

Additional screened cells:
- 5/240: daytime r120 -0.514, overnight r60/r120 0.887/0.785, TBR<70 0.78%.
- 10/60: daytime r120 -0.488, overnight 0.492/0.233, TBR<70 2.33%.
- 10/240: daytime r120 -0.462, overnight 0.810/0.628, TBR<70 2.49%.
- 15/60: daytime r120 -0.435, overnight 0.493/0.198, TBR<70 4.93%.
- 15/240: daytime r120 -0.385, overnight 0.801/0.651, TBR<70 4.50%.

### Important result
A **small hours-scale residual can repair the overnight determinism very efficiently**. The 6 mg/dL / 90-min cell reduced overnight ACF RMSE from 0.547 to 0.049 with TBR<70 about 1.07% and no <54 exposure in this screen.

However the same process barely repairs the daytime defect: at 6/90, daytime r120 is still -0.509. Raising residual amplitude moves daytime r120 toward zero, but only by paying a steep tail/CV cost; even 20 mg/dL leaves r120 negative (-0.344 to -0.311) while TBR<70 reaches 7–8%.

### Decision
Two distinct conclusions now have stronger support:

1. **Overnight ACF≈1 is plausibly a missing modest within-patient process-variability problem.** A low-amplitude (~5–8 mg/dL), ~1–2 h timescale process is sufficient to move overnight ACF close to observed AZT1D structure in this validation-only screen. This is not yet evidence for a specific physiology or sensor-noise implementation.
2. **Generic process noise is not the daytime fix.** It cannot flip daytime r120 positive before safety tails become unacceptable. Do not increase OU/noise amplitude to fit daytime ACF.

This is useful separation: overnight stochasticity can be investigated independently, while daytime negative r120 should be treated as a trajectory/estimand architecture problem rather than a missing generic noise term.

Artifact: `validation/scripts/bounded_ou_residual_screen.js`

---

## Updated model-discrimination status
The following daytime approaches have now failed or only partially helped before tail cost:
- restoreK weakening;
- slow setpoint / hepatic scalar processes;
- meal-kernel tuning;
- rapid-kernel broadening;
- meal/bolus timing jitter;
- coherent day meal mismatch;
- day baseline state;
- kernel × day mismatch interaction;
- two day-level states including a zero-sum intraday prandial shape component;
- generic bounded hours-scale OU residual.

Therefore the next daytime work should **not add another arbitrary scalar/noise term**. The highest-value next discriminator is to audit the ACF estimand against a meal-conditioned / event-aligned representation and test whether the negative r120 is primarily created by deterministic repeated meal-cycle phase mixing. If the discrepancy remains within meal-conditioned residuals, then a true dynamic-state architecture is justified; if it weakens sharply, the current all-day ACF target is partly measuring schedule geometry rather than missing physiology.

Production remains frozen.
