# Basal dose-deviation potency candidate freeze — 2026-08-20

## Decision
Freeze **relative potency 0.20** as the only basal dose-deviation candidate to carry forward into external re-validation.

This is not a default production promotion. It is an externally untested candidate frozen before looking at the next Emory result.

## Why 0.20
The full unit-consistent prior (1.00; 60.29 mg/dL-equivalent/U/day at SI=1) passed the mechanism challenge but failed Shanghai distribution preservation: TBR +1.74 pp and TIR -5.91 pp.

A pre-specified coarse sweep tested 0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00 using only:
- minimum basal responsiveness;
- correct nocturnal-hypoglycemia direction;
- preservation of the frozen Shanghai fingerprint.

0.20 was the weakest positive candidate satisfying all constraints. A larger-N confirmation (mechanism N=800; Shanghai N=3000) also passed all constraints.

Confirmed 0.20 results:
- derived basal dose-deviation gain: **12.06 mg/dL-equivalent/U/day at SI=1**;
- mean glucose response to basal multiplier 0.8 -> 1.2: **5.03 mg/dL**;
- nocturnal <54 incidence: **1.38% -> 1.38%** (non-decreasing; low event count means this is only a direction guardrail);
- Shanghai delta mean: **+0.75 mg/dL**;
- Shanghai delta TBR <70: **+0.25 pp**;
- Shanghai delta TIR 70-180: **-0.76 pp**;
- Shanghai delta pre-B/L/D: **+0.75/+0.75/+0.75 mg/dL**;
- Shanghai delta breakfast Delta120: **0.00 mg/dL**.

## Guardrails
- Do not increase the potency because a stronger value fits Emory better.
- Do not retune the Regular kernel or Shanghai physiology.
- The candidate affects only deviations from the model's maintenance basal reference; maintenance basal physiology remains implicit in the frozen fasting equilibrium.
- Renal modifier and steroids remain OFF in the Emory re-validation.
- If nocturnal hypoglycemia remains structurally absent, add a more appropriate basal/fasting mechanism rather than increasing this frozen scalar beyond 0.20.
- Main/default branch is not modified.
