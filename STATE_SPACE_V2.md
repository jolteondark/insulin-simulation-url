# State-space v2: minimal persistent-state experiment

This branch starts from frozen `main`. Production behavior is not changed on `main`.

## Why v2 exists

External distributional validation against T1D-UOM and HUPA-UCM suggests that the current model can reproduce much of the marginal glucose distribution, especially total relative variability (CV around 38%), but allocates too much variance to fast meal/bolus oscillations and too little to persistent 1-3 h structure. The residual is not adequately fixed by simply increasing additive glucose noise, widening insulin kernels, or adding a single unbounded insulin-sensitivity perturbation.

## Design principle

Keep the existing patient generator and fast glucose-response core. Add one continuous latent metabolic state `M(t)` that persists across day boundaries.

`M(t)` is an OU/AR(1)-like state with a several-hour time constant. It is not added directly to glucose. Instead it weakly modifies two physiological pathways:

1. hepatic glucose drive
2. insulin sensitivity

This creates a coherent "higher insulin requirement / higher hepatic drive" versus "lower requirement" state without introducing an arbitrary glucose offset.

## Minimal parameters

The first implementation exposes only four state-layer parameters:

- `tau_min`: persistence time constant
- `stationary_sd`: latent-state scale
- `hepatic_coupling_mg_dl_min`: coupling to hepatic drive
- `insulin_sensitivity_coupling`: coupling to insulin sensitivity

No renal, circadian, activity, gastric-emptying, or stress-specific state is added yet.

## Continuity

A simulation day should return an explicit state object:

```js
{
  glucose_mg_dl,
  metabolic_state
}
```

The next day starts from that state. A new day must not reset metabolic state to zero or glucose to fasting set-point unless explicitly requested for a stress test.

## Validation requirements

Do not merge based on T1D-UOM alone. Compare v1 and v2 under the same multi-day context against at least T1D-UOM and HUPA-UCM.

Primary targets:

- mean, SD, CV
- TIR, TBR<70, TBR<54, TAR>180, TAR>250
- r30, r60, r120, r240
- hidden hypoglycemia
- four-check joint structure

The goal is not to hit one dataset's exact r120. The state layer is useful only if it moves temporal persistence into the observed positive range while preserving marginal distribution and safety tails across datasets.

## Current status

`state_space_v2.js` implements the latent-state evolution and physiology modifiers only. It is intentionally not wired into production UI yet. The next step is to integrate it into an experimental stateful engine and run head-to-head validation versus frozen v1.
