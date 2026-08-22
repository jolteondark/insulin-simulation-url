# External Emory basal-bolus residual diagnosis — 2026-08-20

## External target
Independent prospective inpatient T2DM basal-bolus CGM cohort (Galindo et al., Diabetes Care 2020):
- mean daily CGM glucose 176.1 ± 46.9 mg/dL
- TIR 70–180: 53.5 ± 25.8%
- TAR >180: 42.2 ± 27.7%
- TAR >250: 16.1 ± 20.2%
- TBR <70: 4.5 ± 6.9%
- TBR <54: 1.58 ± 3.3%
- CV ~32%
- cohort: age 54.5 ± 11 y, BMI 33.8 ± 9 kg/m2, diabetes duration 11.5 ± 9 y, HbA1c 10.2 ± 2%; 41% infectious admissions.

## Frozen Shanghai model, no retuning
5,000 generated T2DM patients, current suggestOrder, one simulated day, 15-min sampling:
- mean glucose ~140.1 mg/dL
- TIR ~85.4%
- TAR >180 ~13.9%
- TAR >250 ~1.0%
- TBR <70 ~0.74%
- TBR <54 ~0.02%
- mean within-day SD ~9.45 mg/dL
- CV ~6.7%

## Phenotype-matched sensitivity check
Selected 2,000 nearest patients from 100,000 generated candidates using age/BMI/duration distance to Emory. Because the current Shanghai phenotype generator is lean, the matched subset still reached only BMI ~29.5 on average.
- age ~54.6 y
- BMI ~29.5 kg/m2
- duration ~10.4 y
- mean glucose ~142.5 mg/dL
- TIR ~84.8%
- TAR >180 ~14.8%
- TBR <70 ~0.47%
- within-day SD ~10.3 mg/dL
- CV ~7.2%

## Interpretation
The external mismatch is large and persists after crude static phenotype matching. The dominant residual is not a small mean offset: the model has dramatically too little within-day variability and therefore unrealistically high TIR.

This does NOT justify adding generic Gaussian glucose noise. The external cohort contains structured inpatient perturbations that the current model does not represent: acute illness/stress (41% infectious admissions), changing nutritional intake/NPO status, treatment titration/corrections, procedures/activity, renal function changes, and potentially glucocorticoids/other medications.

## Development decision
- Keep the frozen glucose kernel and basal physiology unchanged for now.
- Do not fit a regular-insulin potency multiplier from Shanghai.
- Do not solve the Emory mismatch with unstructured glucose noise.
- Next development layer should be an explicit **inpatient state/environment layer**, separated from permanent patient phenotype and treatment policy.
- Candidate state variables: acute stress/infection, steroid exposure, meal/intake fraction and timing, renal clearance state, activity/procedure/NPO state, and treatment-order changes.
- Emory is now a diagnostic external benchmark and should not be repeatedly tuned against metric-by-metric. A separate external cohort (ideally Gaotang raw after access) is required after the inpatient-state layer is frozen.
