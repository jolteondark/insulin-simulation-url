# T2DM prandial treatment-policy mismatch — 2026-08-20

## Question
Does the low model TDD/kg merely reflect comparing an unconditional Shanghai-derived generator with a treatment-selected strict Basal+Regular subgroup?

## Method
Reproduced the current v1/v2 phenotype generator and `T2DMGameModelV2OrderDecompExp.suggestOrder()` exactly, generated 100,000 patients, and for each of the 4 strict Shanghai sessions selected the 500 nearest generated patients by standardized distance on age, BMI, diabetes duration, and fasting C-peptide.

Observed targets use session-mean same-day basal and regular-insulin doses divided by summary body weight.

## Results

| Session | target basal/kg | matched model basal/kg | target prandial/kg | matched model prandial/kg | matched model TDD/kg |
|---|---:|---:|---:|---:|---:|
| 2021_0_20211013 | 0.133 | 0.227 | 0.274 | 0.237 | 0.464 |
| 2025_0_20210506 | 0.261 | 0.205 | 0.522 | 0.192 | 0.398 |
| 2035_0_20210629 | 0.239 | 0.217 | 0.373 | 0.217 | 0.434 |
| 2074_0_20210707 | 0.171 | 0.188 | 0.334 | 0.165 | 0.353 |

Session-equal means:
- target basal/kg: **0.201 U/kg/day**
- matched model basal/kg: **0.209** (ratio **1.04**)
- target prandial/kg: **0.376**
- matched model prandial/kg: **0.203** (ratio **0.54**)
- target TDD/kg: **0.577**
- matched model TDD/kg: **0.412** (ratio **0.71**)

## Interpretation
Phenotype selection does not explain the aggregate dose-scale mismatch. Basal requirement mapping is already close on average. The remaining mismatch is concentrated in the **treatment-policy layer that proposes prandial doses (`suggestOrder`)**, not in the basal formula or glucose kernel.

Do **not** multiply physiology/insulin action to force observed doses to fit. Observed insulin units are treatment inputs, while insulin sensitivity and glucose response belong to physiology. A higher observed scheduled dose with acceptable CGM can arise from treatment policy, meal carbohydrate exposure, correction components, or physiology; Shanghai dietary records are insufficient to identify carbohydrate grams cleanly.

## Decision
- Keep current glucose kernel unchanged.
- Keep basal reference formula unchanged for now.
- Keep generic glucose/day-SI noise off.
- Do not add a morning-resistance parameter from the current incomplete meal records.
- Next work should recalibrate/validate the **previous-doctor prandial order policy** separately from physiology, ideally using dose/kg distributions and treatment-conditioned outcomes rather than pretending the missing dose is a physiological parameter.

Caution: only 4 strict sessions; observed doses may contain correction dosing and meal carbohydrate is not reliably reconstructable. This is a calibration direction, not a freeze criterion.
