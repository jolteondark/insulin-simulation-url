# T2DM Shanghai 4-point validation — 2026-08-20

Source: uploaded ShanghaiT2DM dataset (`diabetes_datasets.zip`).

## Directly readable subset

20 `.xlsx` CGM sessions, 16,931 CGM points. Four-point extraction used nearest CGM within ±30 min of 07:00 / 11:00 / 17:00 / 21:00. Complete four-point days: n=158.

### Pooled CGM

- mean 150.01 mg/dL
- SD 47.99 mg/dL
- CV 31.99%
- TIR 70–180: 78.00%
- TBR <70: 0.71%
- TAR >180: 21.29%
- >250: 4.19%

### Four-point benchmark

| slot | mean | SD | TIR | TBR<70 | TAR>180 | >250 |
|---|---:|---:|---:|---:|---:|---:|
| 07:00 | 147.17 | 28.36 | 89.24% | 0.00% | 10.76% | 0.00% |
| 11:00 | 148.64 | 55.98 | 75.32% | 1.90% | 22.78% | 8.23% |
| 17:00 | 151.12 | 50.08 | 78.48% | 0.00% | 21.52% | 6.96% |
| 21:00 | 152.13 | 45.18 | 76.58% | 0.00% | 23.42% | 3.16% |
| all 4-point | 149.76 | 46.11 | 79.91% | 0.47% | 19.62% | 4.59% |

### Temporal / variance fingerprint

- between-session SD of session mean: 23.32 mg/dL
- median within-session 4-point SD: 39.59 mg/dL
- mean within-session 4-point SD: 39.09 mg/dL
- median SD of daily 4-point mean within session: 19.89 mg/dL
- mean SD of daily 4-point mean within session: 20.00 mg/dL
- correlation 07→11: 0.354
- correlation 11→17: 0.368
- correlation 17→21: 0.320
- correlation 07→21: 0.254
- correlation 11→21: 0.465

## Static ShanghaiT2DM summary

From 109 summary rows:

- age 60.30 ± 13.94 y
- BMI 24.09 ± 3.30 kg/m²
- diabetes duration 8.69 ± 8.22 y
- fasting plasma glucose 164.87 ± 62.45 mg/dL (n=106)
- 2-h plasma glucose 264.76 ± 95.48 mg/dL (n=87)
- fasting C-peptide 0.471 ± 0.271 nmol/L (n=86)
- 2-h C-peptide 0.963 ± 0.718 nmol/L (n=64)
- HbA1c 74.65 ± 26.43 mmol/mol (n=101)
- eGFR 116.68 ± 41.93 mL/min/1.73m² (n=85)
- sex: 59 male / 50 female
- hypoglycemia flag: 10 yes / 99 no

## Current transient experiment diagnostic

A 1000-patient × 7-day simulation using `t2dm_game_model_v0_transient_exp.js` produced aggregate CGM metrics close to Shanghai but failed the four-point fingerprint:

| metric | model | Shanghai subset |
|---|---:|---:|
| pooled mean | 151.49 | 150.01 |
| pooled SD | 56.13 | 47.99 |
| pooled TBR | 2.40% | 0.71% subset / 2.36% all-session published aggregate |
| 07:00 mean | 129.49 | 147.17 |
| 07:00 SD | 14.55 | 28.36 |
| 21:00 mean | 179.86 | 152.13 |
| 21:00 SD | 77.95 | 45.18 |
| between-patient/session mean SD | 41.90 | 23.32 |
| median within 4-point SD | 31.14 | 39.59 |
| day-mean within SD | 15.77 | 19.89 |
| corr 07→11 | 0.621 | 0.354 |
| corr 11→17 | 0.818 | 0.368 |
| corr 17→21 | 0.853 | 0.320 |

## Interpretation

The transient experiment is **not accepted** despite matching aggregate TIR/TBR/TAR. It has too much persistent patient-level separation and too little independent within-patient movement; morning glucose is too low and bedtime is too high.

The main structural issue is upstream of transient tuning:

1. `fasting_setpoint_mg_dl` is centered far below observed Shanghai fasting / pre-breakfast glucose.
2. Static phenotype distribution is not yet calibrated to Shanghai (e.g. generated BMI target around 26.5 vs observed 24.1).
3. Aggregate glucose matching can therefore be achieved by compensating errors in meal response/transients, which should be avoided.

## Decision

Stop increasing transient strength. Next step is to calibrate the **static T2DM phenotype generator first** (age/BMI/duration/FPG/C-peptide-linked beta reserve/eGFR where appropriate), then re-run glucose validation. Preserve main/frozen model and keep all changes experimental until static and temporal fingerprints both pass.
