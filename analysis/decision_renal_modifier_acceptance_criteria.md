# Decision gate — renal insulin-exposure modifier

The V3 inpatient generator contains an elderly/CKD phenotype, but eGFR must not remain a cosmetic static field. A renal modifier is therefore being tested as an optional physiology layer rather than silently folded into the core glucose model.

## Pre-specified acceptance rule
Retain the renal modifier only if all of the following hold in the paired V3 external sensitivity run:

1. `elderly_ckd` shows a clear directional increase in insulin exposure consequences (lower mean glucose and/or higher TBR) when the modifier is ON.
2. Archetypes whose mean eGFR is >=60 show negligible change, because the modifier is exactly 1.0 above that threshold.
3. The pooled hypoglycemia tail does not become implausibly large solely from the renal term.
4. No mixture weight, glucose-equilibrium parameter, SI distribution, or treatment-policy coefficient is adjusted to compensate for the renal effect.

## Rejection rule
Delete or disable the modifier if it materially changes non-CKD groups, produces a disproportionate severe-hypoglycemia tail, or is needed merely to improve aggregate Emory fit.

## Guardrail
The Emory cohort excluded severe kidney disease, so Emory aggregate agreement is not evidence for the renal mechanism itself. Renal validation must ultimately use an independent CKD-relevant cohort or literature-derived subgroup targets.
