# Behavior/context layer validation — 2026-08-20

Core remained provisionally frozen throughout:
- generator v0.81: body size + S_I + D_insulin
- single biphasic basal-requirement state: w=330 min, coupling=0.32
- zero-area transient: tau=90 min, amp=8 mg/dL
- rapid scale 0.80
- Jensen-centered state multiplier
- no meal saturation

## v092 timing variability
Behavior-only timing jitter was tested without changing core physiology.

Baseline (N=180, 14 d, 2 d warmup):
- mean 148.07
- SD 49.73
- TBR70 2.06%
- TIR 76.17%
- any-low 11.20%
- any-high 47.45%
- all-four-TIR 47.55%

Meal/bolus/POC timing SD 15 min:
- mean 148.02
- SD 50.19
- TBR70 2.06%
- TIR 76.24%
- any-low 11.85%
- any-high 54.44%
- all-four-TIR 40.65%

Interpretation:
- modest timing variability can account for much of the missing four-check hyperglycemic joint tail (UOM any-high 53.77%).
- timing jitter does not solve the excess any-low rate.
- larger timing jitter (25–30 min) increasingly worsens any-low and all-four-TIR and should not be used as a calibration patch.

## v093 automatic hypoglycemia rescue
A CGM-like automatic rescue layer was tested diagnostically using 15 g fast carbohydrate after glucose stayed below threshold.

Timing-only comparator:
- mean 147.99
- TBR70 2.08%
- any-low 12.82%
- any-high 52.87%

<70 mg/dL for 10 min -> 15 g rescue:
- mean 152.81
- TBR70 0.47%
- any-low 1.94%
- any-high 58.61%

<70 mg/dL for 15 min -> 15 g rescue:
- mean 152.53
- TBR70 0.63%
- any-low 2.31%
- any-high 56.16%

<65 mg/dL for 10 min -> 15 g rescue:
- mean 151.10
- TBR70 0.87%
- any-low 4.44%
- any-high 56.90%

Interpretation:
- continuous glucose-aware rescue is far too strong for the inpatient four-check educational context.
- it shifts the mean upward and nearly abolishes hypoglycemia.
- do not add automatic rescue simply to match UOM any-low.

## v094 meal intake variability
Actual meal intake was varied with a mean-preserving lognormal multiplier while retaining timing SD 15 min.
Two policies were compared:
1. fixed prescribed bolus despite variable intake;
2. intake-matched bolus using observed actual carbohydrate intake.

Timing-only:
- mean 148.03
- SD 50.18
- TBR70 2.07%
- TIR 76.21%
- any-low 12.69%
- any-high 51.53%

Actual meal CV 20%, fixed dose:
- mean 149.65
- SD 56.76
- TBR70 4.06%
- TBR54 0.71%
- TIR 70.78%
- ACF 0.888 / 0.683 / 0.366 / 0.224
- any-low 18.84%
- any-high 57.73%
- all-four-TIR 32.82%

Actual meal CV 30%, fixed dose:
- mean 152.65
- SD 65.40
- TBR70 5.77%
- TIR 66.23%
- any-low 24.17%

Therefore fixed-dose meal variability can trivially fill the SD gap, but only by producing the wrong hypoglycemia, TIR, and temporal fingerprints. It is rejected as an SD calibration mechanism.

Actual meal CV 20%, intake-matched dose:
- mean 148.35
- SD 51.02
- TBR70 2.14%
- TIR 76.14%
- any-low 12.50%
- any-high 52.73%

Actual meal CV 30%, intake-matched dose:
- mean 148.29
- SD 51.66
- TBR70 2.15%
- TIR 76.37%
- TAR180 21.48%
- ACF 0.860 / 0.604 / 0.224 / 0.120
- any-low 11.76%
- any-high 52.36%
- all-four-TIR 42.36%

Interpretation:
- meal-intake variability is appropriate for the game/behavior layer, but should be paired with the ability to adjust meal bolus to observed intake.
- when bolus is intake-matched, realistic meal variability adds only modest additional SD and preserves the frozen physiological fingerprint.
- it does not solve the residual any-low mismatch, so that mismatch should remain documented rather than patched.

## Current behavior-layer recommendation
For the educational inpatient game:
- keep core physiology frozen;
- allow meal size/intake to vary by meal;
- show intake to the player before the meal-specific insulin decision when the scenario permits it;
- use modest timing variability (about 15 min scale) as context, not physiology;
- do not include continuous automatic carbohydrate rescue in the default core;
- keep residual any-low mismatch explicit pending a more appropriate inpatient external dataset or a clinically named context mechanism.
