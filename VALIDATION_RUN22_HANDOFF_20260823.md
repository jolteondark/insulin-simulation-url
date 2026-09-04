# T1DM distributional validation — Run 22 handoff (2026-08-23)

Production remains frozen. No `engine.js` or `patient_generator.js` change was made or approved. GitHub Actions was not used; all screens were run locally with Node.

## 1. Starting point
Run 21 showed that a single bounded patient-day baseline state improves daytime ACF only by increasing low-glucose tails, and that small kernel × day-mismatch interactions do not create a new Pareto solution.

The next planned discriminator was a minimal two-component within-day trajectory/state-space screen.

External AZT1D harmonized reference remains:
- daytime r30/r60/r120/r240 = 0.836 / 0.579 / +0.102 / -0.054
- overnight = 0.889 / 0.760 / 0.460 / 0.086

## 2. Two-component trajectory screen
A validation-only exploratory screen combined:
1. bounded patient-day glucose-balance offset, and
2. a zero-sum intraday prandial-action shape state (breakfast +a, lunch unchanged, dinner -a).

N=20 × 6 days was used as a fast mechanism-discrimination screen.

Frozen reference in this protocol: r60 0.317, r120 -0.536, TBR<70 0.07%.

Key cells:
- ±20 mg/dL balance alone: r120 -0.461, TBR 1.58%.
- ±20 + 5% protective shape coupling: r120 -0.470, TBR 1.77%.
- ±20 + 5% independent: r120 -0.448, TBR 1.86%.
- ±20 + 5% adverse coupling: r120 -0.431, TBR 1.82%.
- ±20 + 10% independent: r120 -0.430, TBR 2.50%.
- ±30 + 5% protective: r120 -0.404, TBR 3.05%.

Conclusion: adding a second day-level scalar that redistributes prandial action across the day does **not** create a qualitatively new covariance/Pareto effect. Protective coupling restrains extremes but also removes much of the ACF gain; other couplings still leave r120 strongly negative.

Decision: do not implement this architecture in production.

## 3. Bounded hours-scale OU residual screen
Because frozen daytime r120 is too negative while overnight ACF is almost exactly 1, Run 22 next tested whether one modest within-day stochastic process could explain both defects.

A bounded zero-mean OU residual was added after latent glucose simulation, validation-only, bound ±2.5 SD. N=40 × 10 days. This is a model-class discriminator, not a proposed physiology or sensor model.

Frozen reference:
- daytime r60 0.315, r120 -0.530, RMSE 0.349
- overnight r60/r120 ~1.000/1.000, RMSE 0.547
- TBR<70 0.21%

Important cells:
- SD 5 mg/dL, half-life 60 min: daytime r120 -0.518; overnight r60/r120 0.653/0.458; night RMSE 0.083; TBR 0.88%.
- SD 6, half-life 90 min: daytime r120 -0.509; overnight 0.695/0.472; **night RMSE 0.049**; TBR 1.07%; TBR<54 0.
- SD 7.5, half-life 90 min: daytime r120 -0.501; overnight 0.668/0.429; night RMSE 0.067; TBR 1.52%.
- SD 10, half-life 120 min: daytime r120 -0.454; overnight 0.723/0.517; night RMSE 0.081; TBR 2.26%.
- SD 15, half-life 120 min: daytime r120 -0.407; overnight 0.671/0.465; night RMSE 0.062; TBR 4.94%.
- SD 20, half-life 120 min: daytime r120 -0.344; TBR 8.29%, TBR<54 1.85%.

## 4. New mechanistic separation
This is the main result of Run 22.

### Overnight
The overnight defect **is highly compatible with missing modest within-patient process variability**. A bounded residual of only ~5–8 mg/dL with ~1–2 h correlation time collapses overnight ACF error from ~0.55 to ~0.05–0.10 with limited tail cost in the small/moderate cells.

This does not identify whether the eventual mechanism should be insulin-sensitivity drift, basal absorption variability, endogenous glucose-production variability, CGM observation noise, or another process. It only shows that the required stochastic amplitude is modest and hours-scale.

### Daytime
The same generic process does **not** solve daytime r120. Increasing amplitude improves r120 only gradually and it remains negative even at amplitudes that already create unacceptable TBR/CV.

Therefore do not add generic OU/noise and tune its amplitude against daytime ACF.

## 5. Updated conclusion
The daytime mismatch has survived:
- scalar restore/setpoint/hepatic changes,
- small kernel changes,
- rapid broadening,
- timing jitter,
- coherent day meal mismatch,
- day baseline state,
- kernel × mismatch factorial,
- a two-state day trajectory construction,
- generic hours-scale OU residual.

This is enough negative evidence that the next step should not be “try another latent scalar.”

The highest-value next discriminator is now an **ACF estimand audit**:
- compute meal-conditioned / event-aligned correlations or residual ACF after removing the repeated deterministic meal-cycle mean;
- perform the same transformation in AZT1D and the frozen simulator;
- determine how much of the observed all-day r120 discrepancy is schedule/phase mixing versus genuinely missing within-state dynamics.

If the discrepancy persists after meal-cycle conditioning, a richer dynamic state-space model is justified. If it collapses, the current all-day ACF target has been partly conflating physiology with deterministic meal schedule geometry.

## 6. New artifacts
- `validation/scripts/two_state_trajectory_screen.js`
- `validation/scripts/bounded_ou_residual_screen.js`
- `validation/results/two_state_and_ou_screen_20260823.md`
- `VALIDATION_RUN22_HANDOFF_20260823.md`

Production remains frozen; no candidate revision is approved for main.
