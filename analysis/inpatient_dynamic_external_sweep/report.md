# Dynamic inpatient-state external sensitivity sweep

N per scenario: **5000**

External benchmark: Emory general-ward T2DM basal-bolus CGM; mean 176.1 mg/dL, CV 32%, TBR<70 4.5%, TIR70-180 53.5%, TAR>180 42.2%.

No scenario below is a calibrated or accepted parameter set. The purpose is mechanism attribution only.

| scenario | mean | within-day SD | CV% | TBR% | TIR% | TAR% |
|---|---:|---:|---:|---:|---:|---:|
| baseline | 140.1 | 9.5 | 7.2 | 0.73 | 85.4 | 13.9 |
| stress41 | 155.6 | 24.0 | 14.9 | 0.58 | 73.4 | 26.0 |
| stress_timing | 149.9 | 24.6 | 16.3 | 1.98 | 74.3 | 23.7 |
| stress_timing_under | 152.9 | 27.4 | 18.0 | 1.74 | 72.5 | 25.8 |
| plus_admission50_100 | 158.9 | 28.8 | 18.5 | 1.51 | 68.4 | 30.1 |
| plus_admission75_150 | 166.4 | 34.5 | 21.6 | 1.34 | 63.3 | 35.3 |

Interpretation rule: do not tune physiology to match this table. A mechanism is retained for further study only if it moves the intended residual without creating a worse opposing residual.
