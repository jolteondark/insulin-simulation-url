# Transient finite-memory state experiment

Experimental only. Do not merge.

## Why this exists

A finite-memory latent state by itself does not guarantee low glucose autocorrelation at 240 min. The glucose equation has a slow restoring component (nominal half-life about 300 min), so a short-lived basal-requirement perturbation can leave a long glucose-level footprint after the latent state itself has decorrelated.

## Candidate architecture

Split the latent process from its glucose-level effect:

1. `M(t)`: finite-memory metabolic innovation state, default memory window 180 min.
2. `X(t)`: transient metabolic-effect compartment that tracks `M(t)` with its own shorter half-life.
3. Glucose receives the change in `X(t)` (`ΔX`) rather than integrating the latent state again through basal mismatch.

This is not arbitrary additive white noise. `X(t)` represents the net glucose-pressure consequence of a transient insulin-requirement/hepatic perturbation after short-timescale compensatory physiology.

Default pilot values:
- `memory_min = 180`
- `effect_half_life_min = 45`
- `effect_gain_mg_dl = 25`
- `fast_scale = 0.74`
- `setpoint_shift_mg_dl = 15`

## Linear shape check

A simplified linear check (not exact engine validation) showed that a 180-min moving-memory state followed by a 45-min effect compartment has approximately:
- r30 ≈ 0.95
- r60 ≈ 0.84
- r120 ≈ 0.53
- r240 ≈ 0.10

This is the desired *state-effect* shape; the final glucose autocorrelation will be lower/altered after mixing with meal/bolus fast variance and other physiology.

## Validation requirement

Compare against the OU requirement-state and the direct finite-memory basal-requirement state using exactly the same generated patients and clinical parameter layer. Primary question: can the transient-effect candidate preserve positive r120 while reducing r240 without damaging mean, SD/CV, TBR/TAR, hidden hypoglycemia, or four-check structure?
