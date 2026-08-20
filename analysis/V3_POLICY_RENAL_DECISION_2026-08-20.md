# V3 inpatient policy / renal decision — 2026-08-20

## Decision

1. Use component-specific four-point insulin titration for the V3 inpatient treatment-policy layer.
2. Retain the renal insulin-exposure modifier as an optional experimental physiology mechanism, but keep it OFF by default until its magnitude is validated against a renal-specific cohort.
3. Do not tune either mechanism directly to Emory pooled glucose metrics.

## Why component-specific titration

The previous `proportionalTitrate()` used the mean of four daily glucose checks to scale the entire insulin regimen. This couples basal and all three prandial components to one aggregate signal and produced strong TDD escalation/oscillation across an 8-day course.

A component-specific mapping is more causally appropriate and remains physiology-blind:

- pre-breakfast -> basal
- pre-lunch -> breakfast insulin
- pre-dinner -> lunch insulin
- bedtime -> dinner insulin

The policy sees only observable glucose and dose history; hidden SI, beta-cell reserve, and hepatic IR remain inaccessible.

A local independent reconstruction of the branch code (400-patient sensitivity run, not a fitted calibration) showed that replacing proportional scaling with component-specific titration changed pooled metrics approximately from:

- proportional: mean 172.5 mg/dL, TIR 58.0%, TAR 36.7%, TBR 5.27%, CV 36.2%
- component-specific: mean 178.7 mg/dL, TIR 59.0%, TAR 38.4%, TBR 2.52%, CV 31.7%

The choice is justified by treatment-policy structure, not by proximity to Emory.

## Renal modifier decision

The renal physiology audit must freeze the insulin order before changing eGFR. Otherwise the clinically appropriate renal starting-dose reduction (`eGFR <=60 -> 0.30 U/kg`) is confounded with the physiology modifier.

With treatment order frozen, the conservative exposure multiplier produces the intended direction in a local reconstruction:

- eGFR 90: exposure 1.00, mean ~174.5 mg/dL, TBR ~3.29%
- eGFR 60: exposure 1.00, identical by construction
- eGFR 45: exposure 1.05, mean ~170.7, TBR ~4.08%
- eGFR 30: exposure 1.10, mean ~166.8, TBR ~4.97%
- eGFR 20: exposure 1.15, mean ~163.0, TBR ~6.06%
- eGFR 10: exposure 1.20, mean ~159.2, TBR ~7.22%

This passes the directional mechanism test, but it does not validate the multiplier magnitude. Therefore the renal modifier remains optional and OFF by default for pooled external validation.

## V3 archetype interpretation

The broadened phenotype mixture now produces clear heterogeneity. In provisional multi-day sensitivity runs:

- `obesity_ir` is the dominant hyperglycemic/high-TAR phenotype.
- `elderly_ckd` has lower treatment starting dose and is the group most selectively affected by renal exposure physiology.
- `chronic_hyperglycemia` is sensitive to treatment-policy history; high admission glucose can cause substantial subsequent dose escalation, so its course cannot be interpreted from static phenotype alone.
- `shanghai_anchor` remains the lower-BMI reference phenotype and should not be forced to reproduce the Emory obesity distribution.

These are archetype sensitivity groups, not prevalence estimates. `DEFAULT_WEIGHTS` must not be tuned to Emory outcomes.

## Guardrails

- Shanghai physiology/kernel freeze remains intact.
- No generic Gaussian glucose noise.
- No large generic day-level SI noise.
- No morning-resistance patch.
- No regular-insulin potency patch.
- Treatment policy remains separate from hidden physiology.
- Emory is a diagnostic external benchmark already used for model diagnosis; do not repeatedly metric-fit to it and still call it pristine external validation.
- A future independent external cohort is still required after the inpatient-state/policy layer is frozen.
