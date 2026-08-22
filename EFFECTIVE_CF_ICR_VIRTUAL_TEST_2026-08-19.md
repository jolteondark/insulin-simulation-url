# Effective CF / ICR virtual test — 2026-08-19

## Question
Are the generator labels `cf_mg_dl_u` and `icr_g_u` themselves inconsistent with clinical CF/ICR, or is the treatment dose generated from those labels inconsistent with the glucose dynamics after meal-gain decoupling?

## Protocol
Branch-only validation. Main untouched.

- N=1000 generated T1DM patients, no generator rejection gate
- isolated virtual 1U correction test and isolated 50 g meal test
- no basal, metabolic-state noise, or counterregulation during the diagnostic
- same restore dynamics as current validation model
- rapid scale 0.80
- fast scale 0.80
- independent meal gain: 5 mg/dL/g at 70 kg with weight exponent 0.65
- zero-area meal shape correction alpha=0.10
- endpoints 180, 240, 300 min
- effective ICR is the continuous g/U that makes the isolated meal neutral at the selected endpoint

## Results

### Label distribution
- legacy CF mean 40.50 mg/dL/U, SD 21.99
- legacy ICR mean 10.60 g/U, SD 4.33
- v2 ICR mean 10.15 g/U, median 9.79
- label CF–ICR correlation r=0.852
- label CF/ICR geometric mean 3.72, log-SD 0.241

### Effective 240-min clinical-like quantities
- effective CF mean 31.45 mg/dL/U, median 26.27
- effective ICR mean 12.25 g/U, median 10.63
- effective CF–ICR correlation r=0.969
- effective CF/ICR geometric mean 2.48
- effective CF/ICR log-SD 0.130

Thus the **shape/correlation of effective CF–ICR is already tight and highly coherent**. The previously suspected broad joint-distribution failure is not the primary explanation.

### Actual meal dose vs neutral isolated-meal dose
Define

`dose_excess = (50 / v2_ICR) / (50 / effective_ICR) = effective_ICR / v2_ICR`.

At 240 min:
- mean dose excess = 1.225
- median = **1.176**
- p10 = 0.945
- p90 = 1.591
- **82.3%** of patients have dose excess >1.00
- **63.9%** >1.10
- **39.0%** >1.25
- **15.5%** >1.50

At 180 min median excess is 1.219; at 300 min median excess is 1.078.

The 240-min dose-excess ratio correlates strongly with legacy CF/ICR: **r=0.832**.

## Interpretation
After decoupling meal glucose appearance from ICR, the old treatment ICR is no longer dynamically neutral in the new engine. In most generated patients it prescribes **more prandial insulin than the current meal+insulin dynamics require to return to baseline over 4 h**.

This directly explains why:
- reducing bolus action to 80% dramatically normalized hypoglycemia in source ablation;
- hypoglycemia is concentrated in high CF/ICR patients;
- forcing literature CF/ICR labels into the current engine worsened hypoglycemia;
- the isolated effective CF–ICR relationship can look coherent while the actual dosing rule remains too aggressive.

## Canonical conclusion
> The current low-glucose excess is not primarily a failure of CF–ICR correlation. It is a **treatment-rule / physiology mismatch introduced by ICR–meal-gain decoupling**: `v2_icr_g_u` still comes from the legacy treatment phenotype, while neutral meal dosing in the new fast subsystem generally requires a larger ICR (fewer units).

## Next step
Do not globally multiply bolus action by 0.8. Instead test a generator/treatment-rule correction in which starter ICR is derived from the patient's effective meal physiology and insulin action, while preserving clinically realistic residual variation. Then rerun full 24 h population validation and integer-dose sensitivity.
