# Bogotá external-validation context decision — 2026-08-22

## Decision

Do **not** use the current Bogotá run as a pass/fail test of the frozen mass-action100 + CR V2 width10/reserve1 physiology.

Classify it as **treatment-context sensitive / non-identifying with respect to physiology** until the exact supplemental-insulin implementation used in the Bogotá cohort can be reconstructed from the source RABBIT protocol.

## What is secure

- Cohort baseline and exclusions are directly reported.
- Basal-bolus start is reported as 0.3–0.5 U/kg according to glucose, age, and creatinine.
- 50% basal glargine / 50% glulisine in three equal mealtime doses is directly reported.
- Basal glargine titration of +10% for fasting 140–180 and +20% for fasting >180 is directly reported.
- CGM starts on hospital day 2; POC drives treatment; CGM is blinded.
- Hypoglycemia rescue is observable-POC based, not hidden-CGM based.

## What is not secure enough for physiology validation

The Bogotá paper states that treatment followed the RABBIT study protocol but does not reproduce the full supplemental-insulin lookup table in the paper text. Our external arm instantiated a specific fixed premeal supplemental scale. Causal ablation shows that this assumption dominates the simulated hypoglycemia rate:

- corrected full protocol sustained any <70: ~48%
- no bedtime correction: ~48%
- no basal titration: ~47%
- no premeal correction: ~6.5%

Thus the disagreement with observed hypoglycemia is overwhelmingly driven by the assumed premeal correction implementation, not by basal titration or bedtime correction.

## Hidden-physiology diagnostic

Among baseline-matched generated patients, sustained hypoglycemia is concentrated in high-SI support:

- sustained <70: SI ~1.07 vs ~0.67 without sustained <70
- sustained <54: SI ~1.20 vs ~0.81 without sustained <54

This is diagnostic only. Do not condition external weights on hidden SI and do not alter phenotype weights to fit Bogotá.

## Guardrails

- Frozen physiology remains unchanged: mass-action reference 100 mg/dL; CR V2 width10; reserve1; basal potency 0.20.
- Do not weaken the correction scale by selecting a value from Bogotá outcome closeness.
- Do not remove high-SI phenotypes based on Bogotá outcomes.
- If an exact primary-source RABBIT supplemental table becomes available, rerun the same frozen physiology under that context before drawing a physiology conclusion.
