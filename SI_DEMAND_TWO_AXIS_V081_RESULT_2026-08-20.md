# S_I + D_insulin two-axis generator v0.81 — 2026-08-20

## Structural definition
Two patient-fixed primitives are now explicit:

- `S_I,intrinsic`: strength of insulin action per effective unit.
- `D_insulin`: chronic insulin demand not explained by S_I or body size.

`D_insulin` is represented as a multiplier with 1.0 as reference; >1 means higher chronic insulin demand. For migration from the legacy generator it is reconstructed as approximately `exp(0.16*z_insulin_need)`.

This is deliberately distinct from:
- obesity, which modifies insulin action;
- steroid, which will be a time-dependent insulin-sensitivity modifier;
- the finite-memory slow state, which is a short-term basal-requirement disturbance.

## TDD reconstruction
Nested regression on 10,000 legacy-generated patients showed:

- body size + S_I: R² ≈ 0.948, residual log SD ≈ 0.090
- body size + S_I + z_need: R² ≈ 0.989, residual log SD ≈ 0.041
- adding hepatic state gives R² ≈ 0.991, residual log SD ≈ 0.0385

Thus the old `z_insulin_need` contains a real second axis and should not simply be deleted. It is better expressed as named `D_insulin`.

## v0.81 validation-only generator
TDD was regenerated without reading legacy TDD:

`log(TDD) = 2.753 + 0.601 log(weight) - 0.410 log(S_I) + log(D_insulin) + 0.0153 z_hepatic + epsilon`

with independent `epsilon` log SD 0.0385.

ICR was the 240-min neutral meal-vs-insulin ratio. Slow state used 90-min finite memory, coupling .36, Jensen mean-centering, fast scale .80, setpoint shift -5.

N=120, 7 days, 1 warmup day:

- mean 147.76 mg/dL (UOM 146.46)
- SD 47.03 (UOM 56.23)
- TBR<70 1.456% (UOM 2.057%)
- TBR<54 0.116% (UOM 0.276%)
- TIR 77.96% (UOM 76.38%)
- TAR>180 20.58% (UOM 21.57%)
- ACF30/60/120/240 = .845/.557/.144/.185 (UOM .863/.634/.247/-.012)
- four-check any low 7.92% (UOM 7.68%)
- all-four TIR 53.75% (UOM 43.31%)

Phenotype summary:
- mean D_insulin multiplier 1.049, SD 0.178
- mean TDD 48.34 U/day, SD 17.45
- mean neutral ICR 11.00 g/U

## Interpretation
The two-axis architecture is viable. Removing direct legacy-TDD dependence did not destabilize population glucose. This supports migrating the generator toward:

`body size + S_I + D_insulin + named modifiers -> treatment need`

rather than generating TDD/CF/ICR as independent primitives.

The remaining dominant mismatches are not caused by this reparameterization: SD remains low and ACF240 remains too positive; four-check circadian pattern also remains imperfect.

These coefficients are migration/calibration coefficients, not externally established physiology, and must not be treated as final until external phenotype-level validation is available.
