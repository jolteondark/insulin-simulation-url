# Continuous-kernel ablation (local reconstruction)

Date: 2026-08-19
Branch: `v2/state-space-minimal`
Main untouched.

Protocol: N=300, 7 days, day 1 warm-up, uniform patient-specific ICR, circadian OFF, finite-memory state `memory=210`, coupling `0.28`, `fast_scale=0.80`, setpoint shift `+15 mg/dL`.

Compared daily-reset v2 versus a true 10080-minute continuous convolution carrying meal/rapid/basal kernel tails across midnight.

## Daily reset
- mean 145.69
- SD 56.69
- CV 38.91%
- 07:00 134.96
- 12:00 118.63
- 18:00 117.25
- 21:00 176.50
- any 4-check <70: 20.94%
- any 4-check >180: 52.06%
- all four 70-180: 33.28%
- ACF r30/r60/r120/r240 = 0.898 / 0.685 / 0.298 / 0.225

## Continuous 10080-min kernels
- mean 149.58
- SD 57.19
- CV 38.23%
- 07:00 141.34
- 12:00 122.81
- 18:00 119.64
- 21:00 176.88
- any 4-check <70: 20.06%
- any 4-check >180: 54.83%
- all four 70-180: 31.28%
- ACF r30/r60/r120/r240 = 0.901 / 0.692 / 0.306 / 0.258

## UOM reference
07/12/18/21 mean = 121.5 / 149.1 / 153.2 / 154.1 mg/dL.
Any <70 7.68%; any >180 53.77%; all four TIR 43.31%.

## Interpretation
Continuous carry-over does **not** fix the four-point joint mismatch. It raises 07:00 further (worse), leaves 21:00 essentially unchanged, and increases long-lag persistence (r240). Therefore the midnight kernel reset is not the primary cause of the joint-distribution error.

Next target should be the within-day meal/rapid response shape itself: meal absorption kernel vs rapid-insulin kernel and their relative timing/amplitude. Avoid adding new latent physiology before testing these deterministic components.
