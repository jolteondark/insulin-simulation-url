# Meal-specific ICR ablation — local reconstruction

Experimental branch only. Main untouched.

Protocol: N=300 generated T1DM candidates, 7 days, day 1 warm-up, finite-memory state fixed at memory=210 min, coupling=0.28, fast_scale=0.80, setpoint_shift=+15 mg/dL, obesity/IR and circadian layers retained, eGFR=90. Compared current meal-specific ICR redistribution vs a uniform patient-specific baseline ICR for all three meals. Same 50/70/60 g meal plan.

## External UOM pseudo-check fingerprint

- 07:00 mean 121.5 mg/dL
- 12:00 mean 149.1 mg/dL
- 18:00 mean 153.2 mg/dL
- 21:00 mean 154.1 mg/dL
- any check <70: 7.68%
- any check >180: 53.77%
- all four 70-180: 43.31%

## Current meal-specific ICR

Local reconstruction:
- overall mean 147.0
- SD 55.9
- CV 38.0%
- 07/12/18/21 means: 147.6 / 93.7 / 117.5 / 187.2
- transitions: -53.9 / +23.9 / +69.6 mg/dL
- any check <70: 37.94%
- any check >180: 62.56%
- all four 70-180: 18.44%

## Uniform patient-specific ICR ablation

- overall mean 146.2
- SD 57.5
- CV 39.3%
- 07/12/18/21 means: 142.3 / 121.3 / 114.1 / 174.6
- transitions: -21.0 / -7.3 / +60.5 mg/dL
- same-day correlations 07-12=0.553, 12-18=0.487, 18-21=0.691, 07-21=0.114
- any check <70: 20.17%
- any check >180: 51.94%
- all four 70-180: 33.67%

## Interpretation

Removing deterministic breakfast:lunch:dinner ICR redistribution materially improves the four-check joint distribution while leaving the overall marginal distribution similar. It nearly halves the excessive four-check hypoglycemia frequency and moves the noon level from ~94 to ~121 mg/dL. Therefore the current meal-specific ICR redistribution should not be part of the physiological core and should remain a treatment-policy hypothesis only.

However major residual circadian mismatch remains: UOM rises from 07 to 12 and is nearly flat 12→21, whereas the model still falls 07→18 and then rises strongly to 21. This residual mismatch should be investigated by circadian-need/dawn ablation and meal/rapid timing, without adding a new latent state.

These numbers are a local formula reconstruction of the branch code, not GitHub Actions exact-JS output.
