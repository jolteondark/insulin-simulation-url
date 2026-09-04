# T1DM distributional validation — run 20 handoff (2026-08-23)

Read `VALIDATION_RUN19_HANDOFF_20260823.md` first. This run directly followed the Run 19 component decomposition.

## What this run did
A local, validation-only constrained relative-kernel screen was completed. GitHub Actions was not used. Production `engine.js` and `patient_generator.js` remain unchanged.

New artifacts:
- `validation/scripts/constrained_relative_kernel_screen.js`
- `validation/results/constrained_relative_kernel_screen_20260823.md`

Frozen references remain:
- `engine.js` 0.94-browser-port, blob `a0b2d51c071f404fbfd79142be910fd28608d9bd`
- `patient_generator.js` 0.79-browser-port, blob `1cea478a112bc6eca719e4df1ecc7aac9984e0ab`

## Question
Run 19 showed that the frozen meal+rapid+restore balance crosses into net-negative territory around 59–63 min after meals. The key question was whether **small, area-preserving changes in meal-versus-rapid kernel geometry** could move daytime r120 toward AZT1D without damaging tails/marginals.

## Completed screen
Rapid kernel peak/duration pairs: 95/285, 100/300, 105/300, 110/315 min. All rapid kernels were normalized to area 1.

Meal variants changed fast/slow t50 and fast fraction while keeping meal-kernel area normalized to 1. The most aggressive completed local meal change shortened slow t50 to 60% of its patient-specific value and/or shifted fast fraction +0.10.

Coarse: N=25, 5 days/patient. Confirmation: N=50, 8 days/patient. Sampling 5 min. Daytime ACF = 06:00–24:00.

AZT1D harmonized daytime reference remains r30 0.836, r60 0.579, r120 0.102, r240 -0.054.

## Same-protocol frozen reference (N=50 × 8 days)
- r30 0.780
- r60 0.314
- r120 **-0.524**
- r240 -0.168
- ACF RMSE 0.346
- mean 120.56 mg/dL
- CV 31.46%
- TIR 88.80%
- TBR<70 0.241%
- TBR<54 0%
- TAR>180 10.95%
- TAR>250 0.293%
- median instantaneous meal-vs-rapid crossing 63 min

## New result
The constrained local-kernel hypothesis is essentially negative.

Across the completed coarse screen, crossing time moved from about **56 to 72 min**, but daytime r120 remained tightly around **-0.49 to -0.52**.

Best confirmed candidate by ACF RMSE (110/315 rapid + both meal t50 values ×0.80):
- r60 0.320
- r120 -0.510
- r240 -0.168
- RMSE 0.339
- mean 122.90
- CV 37.83%
- TBR<70 1.377%
- TAR>180 16.31%
- crossing 63 min

Another candidate moved crossing to 70 min (frozen rapid 105/300 + slow meal t50 ×0.60), but r120 was **-0.522**, effectively unchanged. CV rose to 36.87% and TBR<70 to 0.859%.

Thus, even when the local instantaneous crossing statistic is shifted substantially, the population daytime 2-hour autocorrelation does not materially correct.

## Interpretation update
Run 19's decomposition remains useful but must be interpreted more carefully.

The rapid kernel dominating after roughly one hour explains the shape of the deterministic post-meal fall, but **the crossing time itself is not the causal control knob for population ACF**. Daytime ACF is an emergent property of the full repeated 24-hour trajectory, meal spacing, day-to-day mismatch, and patient heterogeneity.

Small local meal/rapid shape changes do not give a meaningful Pareto improvement. Earlier aggressive rapid broadening could move r120 more, but only while substantially worsening CV/TBR/tails. Therefore further scalar/kernel tuning has diminishing value.

## Production decision
**Keep production frozen. No kernel revision is approved.**

Do not:
- tune meal t50 / fast fraction as a standalone fix;
- tune small rapid peak/duration changes as a standalone fix;
- calibrate directly to instantaneous crossing time;
- revisit restoreK as the primary daytime mechanism.

## Highest-priority next experiment
The strongest positive discriminator so far is still Run 18's **coherent day-level meal/insulin mismatch variability**, whereas the current kernel screen is nearly null.

Next, use identical seeds and a small factorial interaction screen:
1. frozen kernel + shared day mismatch 0/5/10%;
2. mildest safe kernel candidate + shared day mismatch 0/5/10%;
3. compare against each component alone.

Evaluate daytime r30/r60/r120/r240, ACF RMSE, mean/CV/TIR/TBR/TAR, and 4-point distributions.

The purpose is not to find a prettier fit by parameter search. It is to test whether kernel shape and coherent day-level mismatch are meaningfully **interactive**. If the combination does not produce a clear Pareto improvement before tails worsen, the daytime defect should be reclassified as requiring a more fundamental state-space/day-trajectory representation rather than more kernel tuning.

Overnight ACF≈1 remains a separate problem and should not be mixed into this daytime discrimination yet.
