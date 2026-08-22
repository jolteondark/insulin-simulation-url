# Explicit intrinsic insulin sensitivity axis — 2026-08-19

## Purpose
Make insulin resistance a clearly defined physiological axis rather than a concept scattered across TDD, CF, ICR and obesity terms.

## Definition
The patient-fixed primitive is insulin sensitivity, `S_I,intrinsic`.

- lower `S_I,intrinsic` = greater intrinsic insulin resistance
- higher `S_I,intrinsic` = greater intrinsic insulin sensitivity

The phenotype layer also exposes a convenient dimensionless multiplier with 1.0 as reference sensitivity.

## What the engine was already doing
The v2 engine historically used:

`insulinGain = CF / unitResponseAt(1U, 240 min)`

This quantity is the actual patient-fixed glucose-lowering drive per unit of normalized insulin activity used in both basal and prandial insulin terms. In engine_v2 v2.4 it has been promoted semantically to:

`intrinsicInsulinSensitivity(...)`

with exactly the same arithmetic.

Therefore the engine refactor itself adds no degree of freedom and should produce numerically identical glucose output.

## Transitional phenotype representation
The phenotype layer currently reconstructs a dimensionless descriptive sensitivity axis from the existing latent structure:

`intrinsicIR = -0.70*z_insulin_sensitivity + 0.18*z_insulin_need`

`intrinsic_insulin_sensitivity_multiplier = exp(-0.18*intrinsicIR)`

The coefficient remains provisional and is NOT multiplied into the engine yet, because the legacy generator already embeds sensitivity in CF/TDD/ICR. Doing so would double-count sensitivity.

This dimensionless field and the engine's absolute insulin-action gain are two representations of the same intended physiological concept; the next generator refactor should make them one explicit generated primitive.

## Separation of concepts
Obesity is a modifier, not the definition of insulin resistance:

`M_obesity = exp(-0.10*adiposity)`

Steroid and infection act on the same insulin-action pathway.

Conceptually:

`S_I,effective(t) = S_I,intrinsic * M_obesity * M_steroid(t) * M_infection(t) * ...`

The short slow-state is NOT insulin resistance. It remains a time-varying basal-requirement disturbance.

## Causal target architecture

fixed patient phenotype
→ `S_I,intrinsic`
→ obesity/steroid/infection modifiers
→ effective insulin action
→ glucose response
→ derived clinical CF / ICR / required TDD

CF, ICR and TDD should be downstream treatment phenotypes, not primitive definitions of insulin resistance.

## Next generator refactor
1. Generate `S_I,intrinsic` directly.
2. Derive CF from a standardized virtual 1U correction response.
3. Derive neutral ICR from meal-response physiology versus insulin action, then add only externally supported residual variation.
4. Derive TDD and starter basal/bolus orders downstream.
5. Verify that the reparameterized generator preserves the validated T1DM distribution before introducing T2DM or steroid-specific calibration.

## Validation requirement
The current engine rename is algebraically identical to prior `insulinGain`; all glucose outputs should remain identical. Any change indicates a refactor bug.

Main branch remains untouched.
