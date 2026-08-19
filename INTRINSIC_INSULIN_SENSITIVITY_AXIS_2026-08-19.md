# Explicit intrinsic insulin sensitivity axis — 2026-08-19

## Purpose
Make insulin resistance a clearly defined physiological axis rather than a concept scattered across TDD, CF, ICR and obesity terms.

## Definition
The patient-fixed primitive is expressed as an insulin-sensitivity multiplier:

`intrinsic_insulin_sensitivity_multiplier = S_I,intrinsic`

- `1.0` = reference insulin sensitivity
- `<1.0` = intrinsic insulin resistance
- `>1.0` = intrinsic insulin sensitivity

For the present diagnostic implementation it is reconstructed from the existing latent structure rather than adding a new latent degree of freedom:

`intrinsicIR = -0.70*z_insulin_sensitivity + 0.18*z_insulin_need`

`S_I,intrinsic = exp(-0.18*intrinsicIR)` with conservative bounds.

The coefficient is provisional and requires external calibration.

## Separation of concepts
Obesity is not the definition of insulin resistance. It is a modifier:

`M_obesity = exp(-0.10*adiposity)`

A convenient descriptive effective sensitivity is therefore:

`S_I,effective = S_I,intrinsic * M_obesity`

Future steroid support should follow the same architecture:

`S_I(t) = S_I,intrinsic * M_obesity * M_steroid(t) * M_other(t)`

The short slow-state is NOT called insulin resistance. It remains a time-varying basal-requirement disturbance.

## Important compatibility rule
The frozen/legacy physiology already embeds `z_insulin_sensitivity` in TDD/CF/ICR and downstream insulin action. Therefore `S_I,intrinsic` is currently explicit/descriptive only and is NOT multiplied into engine insulin action. Doing so now would double-count insulin sensitivity.

This commit is intended as a semantic/architectural refactor with no intended glucose-output change.

## New phenotype fields
- `intrinsic_insulin_sensitivity_multiplier`
- `effective_insulin_sensitivity_multiplier`
- existing `intrinsic_insulin_resistance_index` retained for backward compatibility
- existing `incremental_obesity_insulin_action_multiplier` retained as the obesity modifier

## Intended future architecture

fixed patient phenotype
→ intrinsic S_I
→ obesity modifier
→ steroid/time-varying modifier
→ actual insulin action
→ glucose response
→ derived clinical treatment ratios (CF, ICR, TDD)

CF/ICR/TDD should ultimately be treated as downstream treatment phenotypes, not primitive definitions of insulin resistance.
