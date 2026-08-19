# Clinical-parameter v2 ablation — obesity/IR, meal-specific ICR, circadian, renal

Experimental only. Do not merge.

## Purpose

Test whether clinically interpretable parameters can be added to the state-space v2 without destroying the marginal glucose distribution or temporal structure that had already been recovered.

## Structural corrections discovered during ablation

1. **Obesity resistance was initially double counted.**
   - The obesity-adjusted basal dose was increased by `1 / obesityAction`, but the engine also used that increased dose as the physiologic target basal requirement.
   - This made an appropriately increased basal dose still look insufficient.
   - Fix: use `legacy_basal_u_day` as the physiologic basal requirement, and apply `incremental_obesity_insulin_action_multiplier` only to administered insulin action.

2. **Meal-specific ICR should not replace each patient's absolute ICR with `300/TDD` and `400/TDD`.**
   - The legacy generator already encodes patient-level ICR heterogeneity.
   - Replacing the absolute ICR caused excess bolus and distorted the marginal distribution.
   - Fix: preserve each patient's baseline total prandial requirement and use the literature-supported breakfast:lunch:dinner ratio (~300:400:400) only to redistribute bolus across meals. For the default 50/70/60 g meal plan, the ICR factors are approximately 0.819 / 1.093 / 1.093 relative to the patient's baseline ICR, with total daily meal bolus preserved before rounding.

3. **Circadian need should be mean-preserving over 24 h.**
   - A purely positive dawn/evening multiplier silently raises total daily basal requirement.
   - Fix: normalize the circadian curve to a 24 h mean near 1, so it redistributes insulin need by time of day rather than changing total daily need.

## Current pilot architecture

- obesity/adiposity -> incremental insulin-action multiplier
- insulin resistance already represented by legacy `z_insulin_sensitivity` is not applied again
- meal-specific ICR -> dosing policy only; meal glucose appearance remains in the fast physiology core
- circadian/dawn -> time-varying basal requirement, normalized to mean ~1
- eGFR -> rapid-insulin action-duration modifier; default eGFR 90 has no renal effect
- persistent requirement state remains the existing v2 OU state

## Exploratory directional validation

A close Python reproduction of the branch equations was used for a fast N=300, 7-day directional check after the structural corrections. This is **not an exact-JS production validation** and must be confirmed with the branch Node runner before any merge decision.

Current all-clinical-pilot result:

- mean: ~146.68 mg/dL
- SD: ~53.42 mg/dL
- CV: ~36.42%
- TIR 70–180: ~72.02%
- TBR <70: ~4.65%
- TBR <54: ~0.97%
- TAR >180: ~23.34%
- TAR >250: ~4.64%
- r30: ~0.895
- r60: ~0.674
- r120: ~0.264
- r240: ~0.191

External references retained for comparison:

- T1D-UOM: mean 146.46, SD 56.23, CV 38.39%, TIR 76.38%, TBR<70 2.06%, TBR<54 0.276%, TAR>180 21.57%, TAR>250 5.94%, r30 .863, r60 .634, r120 .247, r240 -.012.
- HUPA-UCM: mean 135.6, SD 51.6, CV 38.08%, TIR 77.5%, TBR<70 5.74%, TBR<54 1.26%, TAR>180 16.74%, TAR>250 3.43%, r30 .923, r60 .779, r120 .491, r240 .132.

## Interpretation

The clinically interpretable expansion is viable after removing double counting. Mean, SD and 1–2 h autocorrelation remain in the broad external-data range. The main residual problems are:

- TIR somewhat low / hyperglycemia somewhat high relative to both datasets
- TBR is between the two external cohorts but severe-low tail is still high relative to T1D-UOM
- r240 remains too persistent, consistent with the known single-OU-state limitation

The key lesson is that adding clinical parameters is not itself the problem; **parameter coupling and conservation constraints are the problem**. Obesity, meal-specific ICR and circadian need should redistribute treatment requirement rather than silently add extra glucose variance or total insulin need.

## Next steps

1. Confirm these metrics with the exact branch JS/Node runner.
2. Keep eGFR=90 for the base T1DM validation population; validate CKD strata separately rather than mixing CKD into baseline calibration.
3. Validate BMI/TDD/ICR distributions against an external T1DM cohort with anthropometry.
4. Replace the single OU requirement state with a correlation shape that preserves r60/r120 but reduces r240.
5. Only after that add age/sex effects beyond their role in anthropometry unless external data show an independent glucose-structure effect.
