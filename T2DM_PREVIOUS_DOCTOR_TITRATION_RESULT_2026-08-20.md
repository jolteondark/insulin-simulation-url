# T2DM previous-doctor titration experiment — 2026-08-20

## Purpose
Test whether the Shanghai strict Basal+Regular dose gap can be explained by a treatment-policy layer alone, without changing physiology or insulin PK/PD.

## Reference
Current model starter order is approximately 0.424 U/kg/day with ~50% basal. ADA 2026 describes 0.3–0.6 U/kg/day as a usual inpatient starting range, commonly split about 50% basal / 50% nutritional.

Shanghai strict Basal+Regular session-equal clue (n=4):
- TDD/kg ~0.577
- basal/kg ~0.201
- prandial/kg ~0.376

## Experimental policy
`t2dm_previous_doctor_policy_v2_exp.js`

Integer-only causal 4-point titration:
- next pre-lunch adjusts breakfast bolus
- next pre-dinner adjusts lunch bolus
- bedtime adjusts dinner bolus
- next fasting adjusts basal

Per-day adjustment:
- <70: -2 U
- 70–99: -1 U
- 100–180: 0 U
- 181–250: +1 U
- >250: +2 U

No physiology, meal-response, SI, beta-cell, basal reference, or PK/PD parameter was changed.

## 7-day result
Approximate exact-model reimplementation, n=3,000 generated patients.

### Basal-bolus-oriented equilibrium (~147 mg/dL family)
- TDD/kg: 0.441 U/kg/day
- basal/kg: 0.218
- prandial/kg: 0.223

### Lower (~132 mg/dL family)
- TDD/kg: 0.425 U/kg/day
- basal/kg: 0.212
- prandial/kg: 0.212

## Interpretation
Simple previous-doctor titration does **not** close the Shanghai strict dose gap. The discrepancy remains almost entirely prandial.

Therefore do **not** multiply the physiological insulin effect or `uPerG` by ~1.8 simply to match the strict dose distribution.

The strict Shanghai dose likely also reflects one or more of:
1. unobserved true carbohydrate exposure (food text/weight is incomplete and not equivalent to carb grams),
2. regular-insulin-specific timing/action relative to the current rapid-like kernel,
3. correction insulin being folded into observed daily prandial dose,
4. treatment-selection/severity factors not represented by static matching,
5. already-established/titrated regimens rather than a standardized starter dose.

## Decision
- Keep physiology unchanged.
- Keep current starter TDD scale as plausible.
- Keep previous-doctor titration as a separate policy layer.
- Next diagnostic should decompose observed strict prandial dose into scheduled meal dose versus correction/extra dose where timestamps permit, and separately compare regular-insulin PK against the rapid-like game kernel.
