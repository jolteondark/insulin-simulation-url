# T1DM distributional validation — Run 21 handoff (2026-08-23)

This is the self-contained continuation point after Run 20. Production remains frozen; no `engine.js` or `patient_generator.js` change was made or approved.

## 1. Starting point
Run 20 showed that small area-preserving meal/rapid kernel changes moved the instantaneous meal-vs-rapid crossing time but did not materially improve daytime r120. The best confirmed kernel candidate moved r120 only from about -0.524 to -0.510 while worsening CV/TBR.

The strongest prior positive signal was coherent patient-day meal/insulin mismatch variability. Therefore Run 21 first tested the planned discriminator: **frozen vs mild kernel × shared patient-day mismatch 0/5/10%**.

External replication reference remains AZT1D harmonized daytime patient-median ACF:
- r30 0.836
- r60 0.579
- r120 +0.102
- r240 -0.054

This is independent replication evidence, not an official-raw calibration target.

---

## 2. Experiment A — shared day mismatch × kernel factorial

Local Node execution only; no GitHub Actions.

Protocol:
- N=60 generated T1DM patients
- 10 days/patient
- 5-min sampling
- identical patient seeds across cells
- daytime ACF 06:00–24:00
- shared mismatch = one uniform carbohydrate multiplier per patient-day, applied equally to all three meals while insulin orders remain unchanged

Kernel cells:
- frozen rapid 105/300 + frozen meal kernel
- frozen rapid + slow meal t50 ×0.60
- rapid 110/315 + frozen meal kernel
- rapid 110/315 + fast/slow meal t50 ×0.80

### Key results
Frozen:
- 0% mismatch: r60 0.312, r120 -0.522, RMSE 0.346, CV 32.0%, TBR<70 0.07%
- 5%: r60 0.329, r120 -0.489, RMSE 0.326, TBR<70 1.27%
- 10%: r60 0.366, r120 -0.413, RMSE 0.280, TBR<70 2.85%

The kernel-modified cells did not outperform this trade-off. Examples:
- rapid110/315 + 10%: r120 -0.419, RMSE 0.282, TBR<70 3.53%
- rapid110/315 + F080S080 + 10%: r120 -0.431, RMSE 0.292, CV 38.6%, TBR<70 4.47%

### Formal interaction result
For r120, interaction was defined as `(both-frozen) - (kernel-frozen) - (shared-frozen)`.

Observed r120 interactions were all near zero or negative:
- meal_S060: -0.0025 at 5%, -0.0208 at 10%
- rapid110_315: -0.0016 at 5%, -0.0020 at 10%
- rapid110_315_F080S080: -0.0089 at 5%, -0.0297 at 10%

RMSE interactions were also slightly unfavorable.

### Decision
**Constrained kernel tuning is closed as a daytime solution.**

The apparent benefit in combined cells comes from the shared mismatch, not from a favorable kernel interaction. Kernel changes mostly add CV/TBR cost. Do not continue small meal t50 / rapid peak-duration tuning and do not combine those kernel changes with shared mismatch in production.

Shared day mismatch remains mechanistically informative, but increasing it is not an acceptable fit strategy: even 10% leaves r120 strongly negative while TBR is already elevated.

Artifacts:
- `validation/scripts/shared_mismatch_kernel_factorial.js`
- `validation/results/shared_mismatch_kernel_factorial_20260823.md`

---

## 3. Experiment B — bounded patient-day baseline state

Because Experiment A ruled out a useful kernel interaction, Run 21 immediately tested a more fundamental scalar state-space idea: a patient-day vertical glucose-balance state represented by a bounded zero-centered shift of `fasting_setpoint_mg_dl`, with meal and insulin orders unchanged.

This is mechanism discrimination only, not a proposed physiology implementation.

Protocol:
- N=60, 10 days/patient, 5-min sampling
- frozen kernels
- offset amplitudes ±10/20/30/40 mg/dL
- `rho=0`: independent day states
- `rho=0.7`: persistent AR-like day state

### Results
Baseline: r60 0.317, r120 -0.530, RMSE 0.349, TBR<70 0.20%.

Independent day state (`rho=0`):
- ±10: r120 -0.511, RMSE 0.337, TBR 0.64%
- ±20: r120 -0.458, RMSE 0.305, TBR 1.61%
- ±30: r120 -0.388, RMSE 0.265, TBR 3.34%
- ±40: r120 -0.279, RMSE 0.209, TBR 4.29%

Persistent state (`rho=0.7`) was less effective at the same nominal amplitude:
- ±20: r120 -0.519, TBR 0.79%
- ±30: r120 -0.484, TBR 1.37%
- ±40: r120 -0.468, TBR 2.14%

### Interpretation
A day-level vertical state can generate positive covariance and move ACF in the correct direction, but it cannot get close to the observed positive r120 before low-glucose tails become unacceptable. Persistence across days does not rescue this; in this screen it makes the ACF effect weaker.

This materially weakens the hypothesis that one additional scalar slow state is sufficient.

### Decision
Do not add fasting-setpoint day noise or simply increase a shared latent-state amplitude. This would be fitting ACF by injecting large day-level shifts and would still fail the target sign/magnitude before damaging tails.

Artifacts:
- `validation/scripts/day_baseline_state_screen.js`
- `validation/results/day_baseline_state_screen_20260823.md`

---

## 4. Updated mechanistic conclusion
The daytime defect is now constrained by multiple negative/partial results:

- restoreK weakening: insufficient and worsens marginal centering
- slow setpoint OU / hepatic drive: insufficient
- meal kernel widening: rejected
- rapid-profile broadening: partial ACF benefit but tail/CV cost
- meal/bolus timing jitter: small effect
- shared meal mismatch: real ACF effect but tail cost before target reached
- mild kernel × shared mismatch: **no positive interaction**
- bounded patient-day baseline state: **partial ACF effect but same tail trade-off; persistence does not solve it**

Therefore the remaining daytime mismatch should no longer be treated as a one-parameter or one-scalar-latent calibration problem.

The most plausible next model class is a **low-dimensional within-day state-space / trajectory representation** in which at least two bounded latent components can alter trajectory shape rather than merely translate the whole day vertically or scale all meals together.

A minimal candidate architecture to test next would separate:
1. a slow glucose-balance state (e.g. endogenous production / net basal balance), and
2. a meal-response / effective insulin-action state that changes postprandial trajectory shape.

Both should be mean-reverting, bounded, patient-specific in amplitude, and evaluated with hard safety constraints. The purpose is not to add realism indiscriminately; it is to determine whether two coupled low-amplitude states can change r60/r120 covariance shape without large TBR/TAR distortion.

---

## 5. Highest-value next experiment
Do **not** continue kernel tuning.

Next priority: implement a validation-only two-state trajectory perturbation screen with small amplitudes and explicit Pareto gates:
- daytime r60/r120 improvement
- TBR<70 and <54
- TAR>180 and >250
- mean/CV
- 4-point q10/q50/q90
- overnight ACF reported separately, not mixed into daytime calibration

Use identical frozen cohort/seeds across cells. Start with a very small grid and test whether the second state produces a qualitatively new covariance effect. If it does not, stop adding latent states and reconsider the ACF estimand / simulation architecture itself.

Production remains frozen throughout.
