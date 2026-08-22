# Decision gate — renal insulin-exposure modifier

Updated 2026-08-23 after the Baldwin 2012 renal RCT context audit.

The V3 inpatient generator contains an elderly/CKD phenotype, but eGFR must not remain a cosmetic static field. At the same time, two distinct questions must not be conflated:

1. **Observable treatment policy:** should an elderly/CKD inpatient start with a more conservative insulin dose?
2. **Hidden physiology:** should the same administered insulin dose have a larger effect because renal insulin clearance is reduced, and by how much?

Baldwin 2012 is strong evidence for (1), but the published aggregate data do not identify the magnitude of (2).

## Current disposition

`t2dm_renal_insulin_modifier_v1_exp.js` remains **experimental and standard-OFF**.

Do not tune its multiplier to improve Baldwin outcome agreement. The frozen physiology, insulin PK/PD, mass-action100, CR V2 and basal-potency settings must not be weakened or strengthened to compensate for treatment-exposure reconstruction error.

## Why Baldwin cannot identify the hidden multiplier

In Baldwin 2012 (hospitalized T2DM, eGFR <45 mL/min/1.73 m²), nominal day-1 scheduled TDD from the randomized protocol was approximately 44.7 U/day in the 0.50 U/kg arm and 23.48 U/day in the 0.25 U/kg arm. Published actually administered day-1 TDD was only 33.4 and 21.1 U/day, respectively.

The discrepancy is predominantly non-basal. Day-1 glargine was close to the nominal basal allocation, whereas observed non-basal insulin was only 12.0 U in the high arm and 8.0 U in the low arm. Those values already include correction insulin, so they are upper bounds on delivered scheduled prandial insulin. The protocol withheld post-meal glulisine unless at least half the meal was eaten, but patient-level meal intake / held-dose exposure is not reconstructable from the aggregate publication.

Therefore a protocol-only simulation over-delivers prandial insulin before the renal physiology switch is interrogated. Outcome closeness under that exposure model is not an identifying test of renal-clearance magnitude.

## Pre-specified physiology acceptance rule

Retain a non-default renal insulin-exposure modifier only if all of the following eventually hold in a dataset or protocol with reconstructable delivered insulin exposure:

1. CKD patients show the expected directional increase in insulin-exposure consequences at the **same delivered dose** (lower glucose and/or higher hypoglycemia risk).
2. The magnitude is identified from patient-level or otherwise reconstructable glucose + administered-insulin exposure, including held prandial doses when relevant.
3. Patients above the modifier's renal threshold show negligible change by construction.
4. The pooled and CKD-specific TBR<70 and TBR<54 tails remain clinically plausible.
5. No mixture weight, glucose-equilibrium parameter, SI distribution, meal parameter, insulin kernel, counterregulation coefficient, or treatment-policy coefficient is adjusted to compensate for the renal term.
6. The effect reproduces directionally in an independent renal-relevant source before becoming default-ON.

## Rejection / defer rule

Keep the modifier OFF or remove it if it materially changes non-CKD groups, produces disproportionate severe hypoglycemia, requires compensatory retuning, or is supported only by aggregate outcome fit under uncertain treatment exposure.

A non-identifying external dataset is a reason to **defer magnitude selection**, not a reason to force a coefficient.

## Treatment-policy implication (separate track)

Baldwin 2012 does support the observable clinical direction that a lower initial weight-based basal-bolus dose in hospitalized T2DM with eGFR <45 can reduce hypoglycemia without materially worsening mean glycemia. This evidence belongs in the treatment-policy layer, not in the hidden physiology layer.

The existing `t2dm_treatment_policy_weight_bg_exp.js` already applies a conservative start for renal impairment/older age. Do not change its current threshold or dose coefficient solely to mimic Baldwin: the current policy is broader than the trial population and must remain a guideline/education-policy decision rather than an outcome-fit parameter. A future policy revision should cite its intended population explicitly and be tested independently from renal PK/PD.

## Validation hierarchy going forward

Highest-value renal validation source:
- patient-level inpatient glucose plus timestamped actually administered basal/prandial/correction insulin;
- eGFR/creatinine sufficient to define renal strata;
- meal intake or explicit held-dose information when prandial administration depends on intake.

Second-best:
- a protocol with delivered exposure fully reconstructable from published data.

Not sufficient for renal-multiplier magnitude:
- nominal prescribed insulin only;
- aggregate arm-level glucose/hypoglycemia with large unobserved dose withholding;
- cohorts excluding substantial CKD.

## Guardrail

Emory aggregate agreement is not evidence for the renal mechanism because severe kidney disease was excluded there. Baldwin is a renal-specific **policy-direction benchmark**, but is treatment-context-sensitive and non-identifying for the hidden renal multiplier. Keep those evidentiary roles separate.
