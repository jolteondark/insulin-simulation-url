# Independent reproduction — V3 six-phenotype treatment trajectories

Date: 2026-08-20

This is an independent approximate reproduction of the current branch structure, not the formal Node/Actions output. It is used only for directional cross-checking while the workflow report is pending.

## Approximate 8-day results

| phenotype | initial TDD/kg | final TDD/kg | mean glucose | TIR | TAR | TBR | course CV | day-1 4pt mean | day-8 4pt mean |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shanghai_anchor | 0.41 | 0.52 | 159.9 | 73.0% | 26.8% | 0.23% | 16.8% | 178.5 | 142.2 |
| obesity_ir | 0.44 | 0.67 | 191.8 | 38.7% | 61.3% | 0.05% | 17.2% | 211.0 | 173.1 |
| moderate_ckd | 0.41 | 0.53 | 163.9 | 69.6% | 30.3% | 0.12% | 16.5% | 182.8 | 146.3 |
| elderly_ckd | 0.30 | 0.47 | 170.1 | 62.4% | 37.5% | 0.04% | 15.8% | 189.5 | 151.7 |
| chronic_hyperglycemia / poor-control IR | 0.49 | 0.72 | 179.9 | 50.9% | 49.1% | 0.04% | 16.3% | 200.5 | 160.9 |
| beta_failure_long_duration | 0.43 | 0.62 | 172.5 | 59.5% | 40.5% | 0.08% | 15.8% | 192.6 | 153.2 |

## Interpretation

- The expanded generator now produces clinically distinct treatment trajectories without direct archetype-to-glucose multipliers.
- Obesity/IR requires the largest escalation and remains the highest-glucose phenotype despite more insulin.
- Poor-control IR and long-duration beta-cell failure are no longer the same phenotype: both can be hyperglycemic, but the IR phenotype requires more insulin, while beta failure remains hyperglycemic at lower SI burden because endogenous reserve is lower.
- Elderly/CKD starts conservatively because age/eGFR are observable treatment-policy inputs; renal physiology is OFF in this audit.
- Moderate CKD stays much closer to the Shanghai anchor than elderly CKD, which is desirable and avoids equating all renal impairment with frailty.

## Guardrails

- Do not tune physiology or archetype prevalence from these approximate numbers.
- Formal adoption requires the exact Node/Actions trajectory report to agree directionally.
- Renal insulin-exposure physiology remains OFF for this comparison.
- The current remaining mismatch is dominated by inpatient time-structure and treatment-policy behavior, not lack of static phenotype diversity.
