# Baldwin 2012 renal RCT external-validation context decision — 2026-08-22

## Decision

Do **not** use the protocol-only Baldwin 2012 simulation as a pass/fail test of the magnitude of the optional renal insulin-exposure modifier.

Keep `t2dm_renal_insulin_modifier_v1_exp.js` **experimental and standard-OFF**.

Classify Baldwin 2012 as a **strong renal-specific treatment-direction benchmark but treatment-context-sensitive / non-identifying for renal-clearance magnitude** unless patient-level (or otherwise reconstructable) prandial administration / meal-intake exposure becomes available.

This is not a rejection of the established biological direction that renal impairment lowers insulin clearance. It is a statement that this trial, as published in aggregate, cannot identify the size of the simulator's renal exposure multiplier independently of treatment delivery.

## Why the nominal protocol is not the actual exposure

Published baseline weights:
- 0.50 U/kg arm: 89.4 kg
- 0.25 U/kg arm: 93.9 kg

Therefore nominal day-1 scheduled TDD would be approximately:
- high arm: 44.7 U/day
- low arm: 23.48 U/day

Published **actually administered** day-1 total insulin was:
- high arm: 33.4 U/day = 74.7% of nominal
- low arm: 21.1 U/day = 89.9% of nominal

The discrepancy is not mainly basal insulin. Published day-1 glargine was:
- high arm: 21.4 U vs nominal basal 22.35 U (95.7%)
- low arm: 13.1 U vs nominal basal 11.74 U (111.6%)

Thus observed day-1 non-basal insulin was only:
- high arm: 12.0 U vs nominal prandial allocation 22.35 U (53.7%)
- low arm: 8.0 U vs nominal prandial allocation 11.74 U (68.2%)

Importantly, observed non-basal insulin already includes positive correction doses. Therefore 53.7% and 68.2% are **upper bounds** on the fraction of nominal scheduled prandial insulin actually delivered.

This is fully consistent with the official protocol, in which glulisine was administered after the meal only after confirming that the patient could eat at least half of the meal. The paper does not report patient-level meal intake / omitted prandial administrations needed to reconstruct this exposure.

## Protocol-only frozen-physiology diagnostic

A local exact-structure reconstruction was run at generated N=18,000 (eligible renal support N=747; entropy-weight ESS ~228) using the frozen mass-action100 + CR V2 width10/reserve1 + basal potency 0.20 physiology and the published nominal protocol.

Baseline weighting used only age, weight, eGFR and diabetes duration; no glycemic outcome entered the weights.

Approximate results:

| arm | day-1 mean | days 2–6 mean | any <70 | simulated D1 TDD |
|---|---:|---:|---:|---:|
| 0.50 U/kg, renal OFF | 203.9 | 158.1 | 56.1% | 56.7 U |
| 0.25 U/kg, renal OFF | 255.9 | 211.7 | 19.5% | 33.2 U |
| 0.50 U/kg, renal ON | 192.8 | 149.5 | 62.3% | 55.9 U |
| 0.25 U/kg, renal ON | 248.2 | 202.5 | 23.2% | 32.7 U |

Published anchors:
- high arm: day-1 mean 196.1; days 2–6 mean 174.0; any <70 30.0%; D1 TDD 33.4 U
- low arm: day-1 mean 196.9; days 2–6 mean 174.5; any <70 15.8%; D1 TDD 21.1 U

The protocol-only simulation therefore over-delivers insulin, especially non-basal insulin, before renal physiology is even interrogated. Renal ON then predictably increases insulin effect and hypoglycemia further. That cannot be interpreted as a clean rejection of renal clearance physiology because the treatment exposure is already wrong.

## What Baldwin does establish robustly

The randomized trial strongly supports the clinical direction that, in hospitalized T2DM with eGFR <45 mL/min/1.73 m², a lower initial weight-based basal-bolus dose can reduce hypoglycemia without materially worsening mean glycemia.

That is useful for the **observable treatment-policy layer**.

It does **not** uniquely estimate a hidden multiplicative insulin-exposure change per eGFR band, because actual prandial exposure was materially determined by meal intake / dose withholding and is only reported in aggregate.

## Guardrails

- Do not tune the renal multiplier to Baldwin outcome closeness.
- Do not weaken mass-action100, CR V2, basal potency, or glulisine PK to repair this mismatch.
- Do not infer a new eGFR multiplier curve from 0.25 vs 0.50 U/kg arm outcomes.
- Keep the existing renal modifier OFF by default.
- The next renal-magnitude validation should use patient-level insulin administration (including held prandial doses) plus glucose, or a protocol whose delivered exposure is fully reconstructable.
- Baldwin can still inform a renal-specific **starting-dose policy** independently of whether the hidden renal physiology modifier is enabled.
