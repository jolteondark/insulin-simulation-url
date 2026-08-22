# Rapid-kernel / bolus-timing refined grid — 2026-08-19

Branch-only validation note. Main remains untouched.

## Fixed architecture
- finite-memory basal-requirement state: memory 210 min
- coupling 0.28
- fast_scale 0.80
- setpoint shift +15 mg/dL
- uniform patient-specific ICR (meal-specific 300/400/400 policy OFF)
- circadian OFF for this isolation experiment
- meal kernel scale fixed at 1.0
- no safety reject

## External UOM 4-point target
07 / 12 / 18 / 21 mean glucose:
121.5 / 149.1 / 153.2 / 154.1 mg/dL

UOM isolated-bolus normalized response (240-min effect = 1):
- 60 min ~0.27
- 90 min ~0.52
- 120 min ~0.72

## Refined local branch-formula reconstruction grid
N=30 directional cohort, 7 days, day 1 warmup. This is not yet an exact GitHub Actions JS artifact.

| rapid scale | lead min | 07 | 12 | 18 | 21 | 4pt RMSE | any <70 | any >180 | all 4 TIR | overall SD |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.75 | 10 | 139.4 | 122.3 | 133.7 | 141.4 | 19.9 | 3.3% | 27.8% | 68.9% | 47.1 |
| 0.75 | 5 | 138.3 | 120.2 | 130.8 | 145.3 | 20.6 | 6.7% | 29.4% | 64.4% | 49.0 |
| 0.80 | 10 | 137.6 | 119.1 | 129.2 | 148.8 | 21.0 | 8.9% | 30.0% | 62.2% | 48.0 |
| 0.75 | 0 | 137.2 | 118.0 | 128.0 | 149.7 | 21.6 | 10.0% | 31.1% | 61.7% | 51.0 |
| 0.80 | 5 | 136.5 | 117.0 | 126.4 | 153.0 | 22.2 | 10.6% | 32.2% | 60.0% | 50.0 |
| 0.85 | 10 | 135.9 | 116.0 | 124.9 | 155.8 | 22.9 | 13.3% | 31.7% | 57.8% | 49.0 |
| 0.80 | 0 | 135.4 | 114.8 | 123.6 | 157.6 | 23.7 | 13.9% | 32.2% | 57.2% | 51.9 |
| 0.85 | 5 | 134.8 | 113.9 | 122.1 | 160.1 | 24.6 | 17.2% | 34.4% | 52.2% | 50.9 |
| 0.90 | 10 | 134.3 | 113.3 | 120.7 | 162.5 | 25.4 | 18.3% | 36.1% | 49.4% | 50.3 |
| 0.85 | 0 | 133.7 | 111.9 | 119.4 | 164.9 | 26.4 | 20.6% | 37.2% | 46.7% | 52.8 |
| 0.90 | 5 | 133.2 | 111.6 | 117.9 | 167.0 | 27.2 | 22.2% | 38.9% | 44.4% | 52.2 |
| 0.90 | 0 | 132.1 | 110.1 | 115.2 | 171.8 | 29.1 | 24.4% | 43.3% | 38.9% | 54.0 |

## Isolated-bolus kernel validation
Normalized model effect vs UOM:

| rapid scale | r60 | r90 | r120 | response RMSE vs UOM |
|---:|---:|---:|---:|---:|
| 0.75 | 0.256 | 0.578 | 0.844 | 0.080 |
| **0.80** | **0.214** | **0.509** | **0.770** | **0.044** |
| 0.85 | 0.180 | 0.448 | 0.701 | 0.068 |
| 0.90 | 0.153 | 0.398 | 0.643 | 0.107 |

## Interpretation
- Pure 4-point fit prefers rapid scale 0.75 with a 10-min prebolus, but this over-concentrates insulin action by 120 min relative to UOM isolated-bolus data.
- Rapid scale **0.80** is independently supported by isolated-bolus response and remains a substantial improvement over the original 1.0 profile.
- UOM meal-bolus timing median is approximately 0 min, so deterministic 10–30 min prebolus should not be used as a physiology calibration knob. Lead time belongs in treatment/context data, ideally sampled from the observed timing distribution.
- Therefore the current physiology candidate should use rapid scale ~0.80 and keep nominal bolus timing near observed reality (0 min for validation), rather than choosing lead=10 solely to optimize 4-point RMSE.
- Remaining 12:00/18:00 underprediction is not solved by a defensible rapid-kernel choice. It should be investigated via meal conditional response / meal-size and absorption structure rather than further forcing bolus timing.

## Current decision
Provisional rapid-kernel calibration: **time scale 0.80**.
Do not yet freeze the full model. Next validation target: meal-conditioned CGM trajectory and observed meal-size/timing distribution.
