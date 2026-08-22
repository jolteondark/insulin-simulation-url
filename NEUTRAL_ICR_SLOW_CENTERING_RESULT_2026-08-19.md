# Neutral ICR + slow-state centering result — 2026-08-19

## Question
Can prandial insulin be restored near each patient's model-derived neutral ICR while the slow/basal subsystem alone restores the population mean?

## Structural finding
The slow state used `exp(c*z)` with c=0.28. For zero-mean z this has mean >1 (Jensen bias), so a supposedly zero-mean variability state introduces a chronic upward basal-requirement bias. Tested mean-preserving alternative:

`exp(c*z - 0.5*c^2)`

Also note that legacy engine basal input is a deviation from target basal, not a simple absolute basal-dose effect; prior `basal off` ablation should not be interpreted as removing basal insulin physiology.

## Screen
N=120, 7 days, 1 warmup; neutral ICR at 240 min; rapid=.80; fast=.80; coupling=.28; zero-area alpha=.10. Tested slow centering on/off, setpoint shifts +15 to -25, neutral-ICR log scatter 0.15/0.20.

Slow centering lowered mean by roughly 10 mg/dL at matched shift/scatter, confirming a real Jensen bias, but no screen condition simultaneously matched mean and hypoglycemia.

## Refined grid
Mean-preserved slow state fixed. Shifts -10,-7.5,-5,-2.5,0,2.5,5; sigma_log 0,.05,.10,.125,.15.

Key conditions:

- shift -5, sigma 0: mean 149.48, SD 53.01, TBR70 3.11%, TBR54 0.373%, ACF 0.884/0.673/0.374/0.311, any check low 11.94%, all-four TIR 45.97%.
- shift -7.5, sigma 0: mean 147.23, SD 52.85, TBR70 3.50%, TBR54 0.435%, ACF 0.884/0.671/0.368/0.310.
- shift 0, sigma 0: mean 154.04, SD 53.30, TBR70 2.48%, TBR54 0.268%.
- shift +5, sigma .05: mean 158.77, SD 54.34, TBR70 2.08%, TBR54 0.249%.

UOM targets: mean 146.46, SD 56.23, TBR70 2.06%, TBR54 .276%, ACF 0.863/0.634/0.247/-0.012.

## Interpretation
1. Jensen bias in the slow multiplicative state is real and should be corrected if that state is retained.
2. Re-centering prandial dosing around model-derived neutral ICR plus mean-preserved slow state removes a large fraction of excess hypoglycemia without requiring stronger counterregulation or shortening rapid-insulin tail.
3. There remains a tradeoff: conditions matching mean still have TBR70 ~3–4%, while conditions matching TBR require mean ~154–159.
4. Temporal persistence remains the major unresolved mismatch: ACF120 ~0.36–0.38 and ACF240 ~0.31 versus UOM .247/-0.012.
5. Therefore the remaining error is not primarily mean compensation. The persistent-state temporal structure/amplitude is still too long-lived once prandial dosing is made physiologically neutral.

## Current canonical conclusion
`prandial over-dosing + non-zero-mean slow-state bias` explains much of the previous low-glucose excess, but not all distributional mismatch. The next structural target should be the persistent state's temporal shape (especially 120–240 min decay), not re-strengthening bolus, counterregulation, or meal saturation.

Main remains untouched; validation branch only.
