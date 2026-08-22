# Finite-memory parameter grid — local reconstructed validation

Experimental only. Do not merge to main.

## Purpose

Tune only the already-existing finite-memory state parameters without adding new mechanisms. Search dimensions:

- `memory_min`: 150, 180, 210, 240 min
- `basal_requirement_coupling`: 0.24, 0.28, 0.32
- `fast_scale`: 0.68, 0.74, 0.80

The clinical layer remained enabled: obesity/incremental insulin resistance, meal-specific ICR redistribution, circadian/dawn requirement, eGFR=90.

## Local reconstruction caveat

GitHub Actions did not surface through the connector. These results were therefore obtained by reconstructing the branch formulas locally from the current JS source. The patient generator distribution and engine equations were matched, but local random-number realization used NumPy rather than the branch Mulberry32 stream. Treat the result as a parameter-selection experiment, not the final exact-JS validation artifact.

## N=300 confirmatory candidates

7 days per patient, day 1 warm-up, days 2-7 analyzed.

### Selected candidate

`memory_min=210`, `basal_requirement_coupling=0.28`, `fast_scale=0.80`, `setpoint_shift_mg_dl=15`

- mean 147.74 mg/dL
- SD 56.26 mg/dL
- CV 38.08%
- TIR 70.33%
- TBR <70 5.30%
- TBR <54 1.26%
- TAR >180 24.37%
- TAR >250 5.50%
- r30 0.889
- r60 0.660
- r120 0.219
- r240 0.112

### Alternative: shorter memory + stronger coupling

`memory_min=150`, `coupling=0.32`, `fast_scale=0.74`, `setpoint_shift=10`

- mean 145.24
- SD 53.49
- CV 36.83%
- TIR 72.38%
- TBR <70 5.03%
- TBR <54 1.07%
- TAR >180 22.59%
- TAR >250 4.48%
- r30 0.891
- r60 0.667
- r120 0.224
- r240 0.106

### Current 180-min candidate

`memory_min=180`, `coupling=0.28`, `fast_scale=0.74`, `shift=15`

- mean 146.97
- SD 52.79
- CV 35.92%
- r30 0.891
- r60 0.667
- r120 0.221
- r240 0.107

### Long-memory conservative candidate

`memory_min=240`, `coupling=0.24`, `fast_scale=0.80`, `shift=15`

- mean 144.75
- SD 54.10
- CV 37.38%
- r30 0.882
- r60 0.634
- r120 0.170
- r240 0.091

## External references

T1D-UOM:
- mean 146.46
- SD 56.23
- CV 38.39%
- r30 0.863
- r60 0.634
- r120 0.247
- r240 -0.012

HUPA-UCM:
- mean 135.6
- SD 51.6
- CV 38.08%
- r30 0.923
- r60 0.779
- r120 0.491
- r240 0.132

## Interpretation

The 210/0.28/0.80 candidate is the strongest current compromise. Mean, SD, and CV are almost identical to T1D-UOM. r30/r60 remain in the observed external range. r120 is slightly below the UOM target by ~0.03, while r240 falls to ~0.11, within the HUPA range and substantially below the prior OU model.

The remaining weakness is range occupancy: TIR is low and TBR/TAR are somewhat high relative to UOM, although the low-glucose tail is close to HUPA. This should be addressed by calibration of treatment policy / fast-variance allocation rather than by adding a new latent state.

## Decision

Promote `memory_min=210`, `coupling=0.28`, `fast_scale=0.80`, `setpoint_shift=15` as the next finite-memory candidate for exact-JS validation.

Do not add further state dimensions before:
1. exact-JS rerun on the branch,
2. four-check joint-structure validation,
3. hidden-hypoglycemia validation,
4. held-out / therapy-stratified external validation.
