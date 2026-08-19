# Circadian ablation after removing meal-specific ICR

Protocol: local reconstruction of branch JS formulas, N=300, 7 days, day 1 warmup, no reject. Finite-memory state fixed at memory=210 min, coupling=0.28, fast_scale=0.80, setpoint_shift=+15 mg/dL. Obesity/IR layer retained. Dosing uses one patient-specific ICR across all meals.

## Four-point means (mg/dL)

| Time | Circadian ON | Circadian OFF | T1D-UOM |
|---|---:|---:|---:|
| 07:00 | 142.3 | 135.0 | 121.5 |
| 12:00 | 121.3 | 118.6 | 149.1 |
| 18:00 | 114.1 | 117.3 | 153.2 |
| 21:00 | 174.6 | 176.5 | 154.1 |

## Four-point range statistics

| Metric | ON | OFF | T1D-UOM |
|---|---:|---:|---:|
| any check <70 | 20.17% | 20.94% | 7.68% |
| any check >180 | 51.94% | 52.06% | 53.77% |
| all four 70–180 | 33.67% | 33.28% | 43.31% |

## Overall 1-minute marginal

| Metric | ON | OFF |
|---|---:|---:|
| mean | 146.16 | 145.69 |
| SD | 57.45 | 56.69 |
| CV | 39.31% | 38.91% |

## Interpretation

Turning off the current mean-normalized dawn/evening circadian requirement layer does not repair the major four-point joint mismatch. It lowers 07:00 modestly but leaves the noon/18:00 lows and 21:00 high essentially intact.

Therefore the remaining mismatch is not primarily caused by the current circadian layer. The next target should be the deterministic meal/rapid temporal response (meal absorption shape, rapid-insulin action profile, meal/bolus timing, and the daily kernel reset/within-day convolution structure) rather than adding more circadian amplitude.

Main remains unchanged.
