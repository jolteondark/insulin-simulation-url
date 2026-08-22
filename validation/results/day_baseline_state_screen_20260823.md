# Bounded patient-day baseline-state screen — 2026-08-23

## Question
After the shared-mismatch × kernel factorial showed no useful interaction, the next question was whether a more fundamental *vertical day-state* can improve daytime ACF without the low-glucose tail penalty caused by meal/insulin mismatch.

This was a mechanism-discrimination screen, not a production proposal. Production `engine.js` and `patient_generator.js` were unchanged. GitHub Actions was not used.

## Design
For each generated patient-day, only `fasting_setpoint_mg_dl` was shifted by a bounded zero-centered offset. The within-day meal and insulin orders were unchanged.

Two state structures were compared:
- `rho=0`: independent patient-day offset
- `rho=0.7`: persistent AR-like bounded offset across days

Offset amplitudes: ±10, ±20, ±30, ±40 mg/dL.

Protocol:
- N=60 patients
- 10 days/patient
- seeds 982001..982060
- 5-min sampling
- daytime ACF 06:00–24:00
- same frozen meal/rapid kernels

## Results

| rho | amplitude mg/dL | r60 | r120 | ACF RMSE | mean mg/dL | CV % | TBR<70 % |
|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0 | 0.317 | -0.530 | 0.349 | 117.6 | 30.7 | 0.20 |
| 0 | 10 | 0.327 | -0.511 | 0.337 | 117.8 | 30.9 | 0.64 |
| 0 | 20 | 0.350 | -0.458 | 0.305 | 118.3 | 31.2 | 1.61 |
| 0 | 30 | 0.383 | -0.388 | 0.265 | 117.7 | 32.4 | 3.34 |
| 0 | 40 | 0.420 | -0.279 | 0.209 | 120.2 | 32.8 | 4.29 |
| 0.7 | 10 | 0.318 | -0.526 | 0.346 | 117.4 | 30.9 | 0.57 |
| 0.7 | 20 | 0.323 | -0.519 | 0.341 | 117.5 | 31.1 | 0.79 |
| 0.7 | 30 | 0.335 | -0.484 | 0.322 | 118.6 | 31.2 | 1.37 |
| 0.7 | 40 | 0.346 | -0.468 | 0.311 | 119.2 | 32.1 | 2.14 |

External AZT1D harmonized daytime target remains r60 0.579 / r120 +0.102.

## Interpretation
A vertical day-state can move r60/r120 in the correct direction, so a slow latent state can in principle contribute positive covariance. However the trade-off is still poor:

- independent ±20 mg/dL reaches r120 -0.458 with TBR<70 1.61%;
- independent ±30 mg/dL reaches -0.388 but TBR<70 3.34%;
- independent ±40 mg/dL reaches only -0.279 while TBR<70 is 4.29%.

Thus even a very large day-level vertical state does not approach the observed positive r120 before tails become implausible.

Persistence (`rho=0.7`) is less effective than independent day states at a given amplitude. That argues against simple multi-day persistence being the missing ingredient; the relevant structure is more likely within-day trajectory variability rather than merely a drifting daily baseline.

## Decision
- Do not implement fasting-setpoint day noise as the solution.
- Do not increase shared mismatch or baseline-state amplitude just to fit ACF; both improve ACF only by paying too much in TBR before reaching the observed sign/magnitude.
- Combined with Run 19–21, this materially weakens single-latent-scalar explanations for the daytime defect.

## Next model-design implication
The next daytime representation should permit **structured within-day deviation of trajectory shape** while keeping glucose tails bounded. A useful next discriminator is a low-dimensional state-space formulation with at least two coupled latent components rather than one scalar: for example a slowly varying glucose-balance state plus a meal-response/insulin-effect state, both mean-reverting and bounded, with explicit constraints on TBR/TAR and 4-point marginals. The purpose of the next experiment should be to test whether two-dimensional latent dynamics can change covariance shape without requiring large amplitude in either state.
