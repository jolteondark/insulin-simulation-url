# Emory glulisine prior-range independent cross-check

Independent Python/Numba reimplementation of the current branch equations. This is a cross-check of the JS sweep, not a new calibration.

External comparison target: mean 176.1 mg/dL, TIR 53.5%, TAR 42.2%, TBR 4.5%, CV 32.0%.

| tau | duration | mean | TIR | TAR | TBR | CV |
|---:|---:|---:|---:|---:|---:|---:|
| 90 | 330 | 156.3 | 70.0% | 27.7% | 2.26% | 29.0% |
| 55 | 240 | 154.6 | 64.5% | 29.5% | 6.00% | 33.0% |
| 55 | 270 | 154.7 | 65.6% | 29.1% | 5.37% | 32.2% |
| 55 | 300 | 154.9 | 66.1% | 28.8% | 5.02% | 31.7% |
| 65 | 240 | 155.2 | 66.8% | 28.7% | 4.55% | 31.1% |
| 65 | 270 | 155.4 | 68.2% | 28.1% | 3.71% | 30.1% |
| 65 | 300 | 155.6 | 68.8% | 27.9% | 3.28% | 29.7% |
| 80 | 240 | 155.8 | 68.1% | 28.2% | 3.62% | 29.9% |
| 80 | 270 | 155.9 | 69.6% | 27.7% | 2.74% | 29.1% |
| 80 | 300 | 156.0 | 70.2% | 27.5% | 2.32% | 28.8% |

Interpretation:
- The pre-specified glulisine literature range naturally spans the external TBR and CV targets. This supports a formulation-specific rapid-insulin timing kernel.
- The same range does not reproduce Emory mean glucose or TAR. Therefore rapid PK must not be used to tune the hyperglycemic side.
- Hyperglycemic residual should be investigated in cohort chronic glycemic burden / admission-state conditioning and treatment-policy persistence, not by increasing rapid-insulin potency or adding generic glucose noise.
