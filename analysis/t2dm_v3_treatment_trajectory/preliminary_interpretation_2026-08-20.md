# T2DM V3 treatment trajectory — preliminary interpretation (2026-08-20)

This note records an independent local reproduction of the current experimental branch equations while the workflow-generated report is not yet available. It is directional, not a formal workflow result.

## Approximate 300-patient-per-archetype reproduction

| archetype | BMI | SI | eGFR | FPG | initial TDD/kg | final TDD/kg | day-8 mean 4-point BG |
|---|---:|---:|---:|---:|---:|---:|---:|
| shanghai_anchor | 23.8 | 1.02 | 117 | 175 | 0.387 | 0.447 | 114 |
| obesity_ir | 34.1 | 0.53 | 117 | 191 | 0.395 | 0.652 | 139 |
| elderly_ckd | 25.7 | 0.92 | 41 | 183 | 0.304 | 0.445 | 117 |
| chronic_hyperglycemia | 28.6 | 0.84 | 117 | 261 | 0.432 | 0.590 | 119 |

## Directional interpretation

The phenotype generator is now producing clinically ordered treatment difficulty without exposing hidden physiology to the treatment policy:

- obesity/IR requires the largest escalation and highest final TDD/kg;
- chronic hyperglycemia also requires substantial escalation;
- elderly/CKD starts conservatively because age/eGFR are observable treatment-policy inputs;
- Shanghai-anchor remains the lowest-intensity non-CKD phenotype.

This is a favorable result for the V3 phenotype architecture.

## New residual

By days 6–8, mean four-point glucose falls to roughly 114–119 mg/dL in Shanghai-anchor, elderly/CKD and chronic-hyperglycemia groups, while insulin dose de-escalation lags behind recovery of the inpatient stress state. Obesity/IR remains higher (~139 mg/dL).

This suggests the next issue is no longer insufficient patient heterogeneity. It is the treatment-policy transition during clinical improvement: insulin is escalated during early stress but is not reduced promptly enough as stress resolves.

Do not fix this by altering SI, beta-cell reserve, fasting equilibrium, or archetype prevalence. Audit day-specific hypoglycemia and dose-de-escalation logic first.

## Guardrails

- This is not a prevalence calibration.
- Renal physiology modifier remains OFF in this trajectory audit.
- Do not tune to Emory aggregate metrics from this note.
- Wait for the workflow-generated N=600-per-archetype report before treating the numeric values as formal branch results.
