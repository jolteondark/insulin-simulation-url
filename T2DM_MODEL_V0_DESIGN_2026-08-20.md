# T2DM model v0 design — 2026-08-20

Status: exploratory architecture only. Do not treat any numeric parameter below as calibrated or frozen.

## Goal
Add a T2DM disease layer without modifying the frozen T1DM physiology core.

T2DM is not modeled as merely "lower S_I". The minimum phenotype needs three partially independent axes:

1. `S_I_peripheral` — peripheral insulin sensitivity / resistance
2. `beta_cell_reserve` — glucose-responsive endogenous insulin capacity
3. `hepatic_ir` — impaired suppression of endogenous hepatic glucose production

This matches the clinical/pathophysiologic distinction between relative insulin deficiency and insulin resistance, with increased endogenous glucose production as an important contributor to hyperglycemia.

## Proposed shared architecture

```text
common glucose engine
  + patient body/anthropometric phenotype
  + disease phenotype
      T1DM: beta_cell_reserve = 0
      T2DM: beta_cell_reserve > 0, lower S_I, variable hepatic_ir
  + context modifiers
      steroid / infection / renal / intake / timing
  + treatment layer
      insulin and later non-insulin drugs
```

## T2DM v0 state variables

Patient-fixed:
- `si_peripheral`
- `beta_cell_reserve`
- `beta_glucose_threshold_mg_dl`
- `beta_max_effect_u_equiv_per_min`
- `hepatic_ir`
- `hepatic_glucose_output_gain`
- body weight / height / BMI / sex
- age / T2DM duration (presentation initially; physiology only after calibration)

Dynamic:
- glucose
- existing slow requirement state
- existing fast transient
- endogenous insulin secretion/action state

## Minimal endogenous insulin response

First implementation should be simple and explicit rather than biologically over-detailed:

```text
stimulus = max(glucose - beta_glucose_threshold, 0)
secretion = beta_cell_reserve * saturating(stimulus)
endogenous_action = secretion convolved with short insulin-action kernel
```

Important constraints:
- endogenous secretion must be glucose-dependent;
- it must approach zero near/under normal-low glucose, naturally lowering hypoglycemia risk;
- secretion capacity must saturate so severe hyperglycemia can persist in low-reserve T2DM;
- beta-cell reserve and insulin sensitivity must remain separate, otherwise the model collapses T2DM heterogeneity into one dimension.

## Hepatic component

Use a separate hepatic term rather than hiding all T2DM hyperglycemia inside peripheral `S_I`:

```text
EGP_effective = baseline_EGP * hepatic_ir_modifier
                - insulin_suppression(exogenous + endogenous insulin)
```

The first version may use a phenomenological gain, but it must remain a named hepatic parameter so future calibration can distinguish fasting hyperglycemia from postprandial insulin resistance.

## What is explicitly NOT in v0

- glucagon state
- incretin state
- renal glucose excretion
- SGLT2 / GLP-1 / metformin effects
- lipotoxicity/glucotoxicity progression
- separate muscle vs adipose IR
- steroid
- infection

These should be added only if external validation shows a systematic mismatch that the minimal three-axis model cannot explain.

## Validation target order

1. Untreated / minimally treated T2DM fasting and postprandial glucose distributions
2. Basal-insulin response distributions
3. Basal-bolus response / hypoglycemia frequency
4. Patient heterogeneity by BMI and diabetes duration
5. Inpatient four-check joint distribution

Primary philosophy remains population distribution fidelity, not individual prediction accuracy.

## Calibration warning

Do not reuse the T1DM patient generator's `z_insulin_need`, CF, ICR, or TDD as hidden truth for T2DM. They were calibrated around T1DM insulin-treated phenotypes and would make the T2DM layer circular.

The next implementation step is therefore a new `t2dm_patient_phenotype_v0.js` generator with explicit independent latent variables, followed by external calibration before wiring it into the public game.
