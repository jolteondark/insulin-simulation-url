# Finite-memory basal-requirement state experiment

Experimental only. Do not merge.

## Why replace the OU shape

The OU requirement-state candidate can reproduce realistic marginal variability and positive 60-120 min autocorrelation, but leaves excessive 240 min autocorrelation. This is a correlation-shape problem rather than a simple amplitude problem.

A finite-memory moving-average state gives a triangular theoretical autocorrelation:

`R(lag) = max(0, 1 - lag / memory_window)`

For a 180 min memory window:

- R30 = 0.833
- R60 = 0.667
- R120 = 0.333
- R240 = 0

This is qualitatively close to the external CGM fingerprint: substantial 1-2 h persistence with much weaker 4 h persistence.

## Interpretation

The state represents the net effect of short-lived physiological episodes that shift basal insulin requirement for roughly 2-3 h (e.g. transient stress, activity recovery, absorption/insulin-delivery variability, short hormonal episodes). It is not added directly to glucose. It continues to act only through the basal-requirement pathway.

## Parameter count

Only one correlation-shape parameter is introduced:

- `memory_min`

The existing state amplitude/coupling remains unchanged. The moving-average implementation carries an innovation history internally across day boundaries; this is state memory, not a set of patient-fit parameters.

## Validation target

Compare against the current OU candidate using identical generated patients and clinical-parameter layer. Primary success criterion: retain r120 in the observed positive range while reducing r240 toward <=0.15, without materially worsening mean/SD/CV/TIR/TBR/TAR.
