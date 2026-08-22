# State-shape 3-way comparison — local branch-formula reconstruction

Experimental only. Do not merge to `main` based on this file alone.

This comparison reconstructs the current branch formulas locally because GitHub Actions runs are not surfacing through the connector. It uses the same generated-patient structure, clinical layer, dosing logic, state parameters, and 7-day protocol as the branch runner, but should still be treated as a branch-formula reconstruction rather than an Actions-produced exact-JS artifact.

Protocol:
- N=300 T1DM candidates
- seed 7901
- 7 consecutive days
- day 1 warm-up; days 2-7 analyzed
- 50/70/60 g meals
- obesity/IR phenotype layer enabled
- meal-specific ICR dosing enabled
- circadian need enabled
- eGFR 90
- fast_scale 0.74
- setpoint shift +15 mg/dL

## OU requirement state
- mean 147.27 mg/dL
- SD 53.56
- CV 36.37%
- TIR 71.52%
- TBR<70 4.64%
- TBR<54 0.99%
- TAR>180 23.84%
- TAR>250 4.63%
- r30 0.895
- r60 0.679
- r120 0.281
- r240 0.211

## Finite-memory direct requirement state (180 min)
- mean 146.84 mg/dL
- SD 51.80
- CV 35.28%
- TIR 72.82%
- TBR<70 4.10%
- TBR<54 0.85%
- TAR>180 23.08%
- TAR>250 4.15%
- r30 0.888
- r60 0.658
- r120 0.232
- r240 0.144

## Transient-effect candidate
A smaller N=120 diagnostic run was used because the mechanism clearly failed qualitatively:
- mean 134.85 mg/dL
- SD 31.65
- CV 23.47%
- TIR 91.14%
- r30 0.807
- r60 0.453
- r120 -0.115
- r240 -0.108

The transient effect strongly suppresses variability and recreates negative 2 h correlation. Reject this formulation.

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

## Decision
Finite-memory direct is currently preferred over OU and transient effect.

Why:
1. It preserves realistic mean and overall variability reasonably well.
2. r120 remains close to T1D-UOM.
3. r240 falls from ~0.21 (OU) to ~0.14 without introducing another patient-specific latent dimension.
4. The transient-effect formulation over-damps glucose variability and should be rejected.

Remaining issue: finite-memory direct still under-reproduces CV/SD somewhat and r240 remains above T1D-UOM, although close to HUPA-UCM. Next work should tune memory window / coupling / fast variance jointly and validate against both datasets rather than add another state dimension immediately.
