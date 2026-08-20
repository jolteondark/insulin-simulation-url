# ShanghaiT2DM treatment-stratified validation (2026-08-20)

## Cohort composition
From `Shanghai_T2DM_Summary.xlsx` (109 recording sessions):
- insulin-containing regimen: 56 sessions
- no insulin in summary regimen: 53 sessions

Regimen labels from the summary medication field:
- No insulin: 53
- Premix: 28
- Basal-only: 17
- Short/regular-only: 9
- Other insulin: 2

## Direct CGM recomputation subset
The uploaded dataset contains 20 `.xlsx` sessions and 89 legacy `.xls` sessions. The 20 `.xlsx` sessions were directly re-read and stratified by the summary medication field. In this directly recomputable subset there were 15 insulin sessions and 5 no-insulin sessions.

Pooled CGM metrics:

| group | mean mg/dL | SD mg/dL | TIR 70-180 % | TBR <70 % | TAR >180 % | TAR >250 % |
|---|---:|---:|---:|---:|---:|---:|
| insulin | 149.9 | 47.0 | 78.1 | 0.65 | 21.24 | 3.97 |
| no insulin | 150.5 | 52.5 | 77.5 | 1.00 | 21.53 | 5.31 |

The two groups have almost identical pooled mean glucose and TIR/TAR in this subset. Treatment mixing alone therefore does not explain the observed overall dispersion.

## Four-point reconstruction (07:00 / 11:00 / 17:00 / 21:00, nearest CGM within ±30 min)

### Insulin group
- morning: 148.8 ± 29.7 mg/dL (n=147)
- lunch: 145.8 ± 53.4 (n=146)
- dinner: 153.1 ± 49.5 (n=148)
- bedtime: 155.6 ± 45.3 (n=148)

### No-insulin group
- morning: 140.7 ± 23.5 mg/dL (n=29)
- lunch: 160.6 ± 59.0 (n=28)
- dinner: 144.9 ± 53.6 (n=31)
- bedtime: 145.9 ± 53.3 (n=30)

## Interpretation for the current candidate model
Current kernel candidate (no transient) was approximately:
- morning 146.9 ± 27.8
- lunch 151.3 ± 42.2
- dinner 150.8 ± 51.2
- bedtime 151.9 ± 53.6

Against the insulin-treated Shanghai subset, the model is already close for morning mean/SD and dinner mean/SD. The main residual pattern is:
- lunch variability too low (~42 vs ~53 mg/dL)
- bedtime variability too high (~54 vs ~45 mg/dL)

The no-insulin subset also shows very large lunch variability, so the lunch-SD deficit is unlikely to be explained simply by mixing insulin and non-insulin treatment groups.

## Decision
Do not add a treatment-mixture noise term just to match the global SD. Keep the equilibrium + prolonged meal/bolus kernel candidate provisionally frozen. Next validation target should be meal-level heterogeneity/timing and within-patient day-to-day structure, especially mechanisms that can increase pre-lunch variance without inflating bedtime variance.

## Limitations
The treatment-stratified CGM metrics above are based on the 20 directly readable `.xlsx` sessions only. The medication counts use all 109 summary rows. The published ShanghaiT2DM overall TIR/TBR/TAR remains the preferred full-cohort aggregate benchmark.