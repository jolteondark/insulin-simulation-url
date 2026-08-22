# Emory multi-day external validation — local reproduction interpretation

This is an independent local reproduction of the branch logic while GitHub Actions result persistence is pending. It is not a calibration target and no core Shanghai parameter was changed.

External Emory aggregate target used for comparison: mean 176.1 mg/dL, TIR 53.5%, TAR 42.2%, TBR 4.5%, CV 32%.

Approximate 5-day patient-level results (1200 generated patients):

| scenario | mean | TIR | TAR | TBR | patient-course CV |
|---|---:|---:|---:|---:|---:|
| stable | 138.8 | 92.9% | 6.8% | 0.31% | 8.1% |
| carryover_only | 155.6 | 72.1% | 27.7% | 0.23% | 27.1% |
| heterogeneous_ward | 150.2 | 78.9% | 20.3% | 0.88% | 20.0% |
| high_variability_sensitivity | 174.2 | 59.3% | 39.9% | 0.87% | 25.6% |

Key observation: multi-day carryover itself explains a large fraction of the missing variability. Day-level CV remains much lower, but patient-course CV rises from roughly 8% to roughly 27% when an admission glucose offset and resolving stress are carried across days.

The high-variability mechanistic sensitivity scenario approaches the external mean/TIR/TAR without adding generic glucose noise, but TBR remains too low (about 0.9% vs external 4.5%) and CV remains somewhat low (about 26% vs 32%).

Interpretation:
- Retain multi-day state carryover as a high-value structural candidate.
- Do not increase generic meal mismatch merely to force TBR upward; prior sensitivity work showed that this can create an implausible hypo tail.
- The next residual to investigate is a clinically interpretable low-glucose mechanism: renal insulin clearance / reduced intake after insulin delivery / lagged overtreatment as acute stress resolves.
- Core glucose kernel, basal formula, and generic glucose noise remain frozen.
