# N300 biphasic finalist confirmation — 2026-08-20

Protocol: generator v0.81 (`S_I + D_insulin`), 300 generated T1DM patients, 14 simulated days with 2 warm-up days, zero-area transient tau 90 min / amplitude 8 mg/dL. Finalist single biphasic basal-requirement states: 320/.34, 330/.32, 350/.32.

## Main result

The N300 confirmation favored **w=330 min, coupling=0.32** as the most stable cross-dataset compromise.

### w=330, c=0.32
- mean 148.47 mg/dL
- SD 49.55 mg/dL
- TBR<70 2.008%
- TBR<54 0.209%
- TIR 76.044%
- TAR>180 21.948%
- ACF30/60/120/240 = 0.8580 / 0.6065 / 0.2368 / 0.1240
- four-check any-low 10.59%
- four-check any-high 47.51%
- all four TIR 47.64%

UOM targets: mean 146.46, SD 56.23, TBR70 2.057, TBR54 .276, TIR 76.376, TAR180 21.567, ACF .863/.634/.247/-.012, any-low 7.68%, any-high 53.77%, all-four-TIR 43.31%.

HUPA temporal target: ACF .923/.779/.491/.132; HUPA SD 51.6.

## Comparison

320/.34 gave ACF120 0.250 and ACF30 0.863, but TBR70 2.24% and four-check any-low 12.15% were worse. 350/.32 increased ACF240 to 0.149 and TBR70 to 2.28%.

The 330/.32 candidate is therefore preferable because it retains the UOM-compatible marginal distribution and TBR while producing ACF240 almost exactly equal to HUPA (0.124 vs 0.132) and ACF120 close to UOM (0.237 vs 0.247). It does not force the model to overfit UOM's near-zero ACF240.

## Interpretation

A single biphasic, zero-DC basal-requirement state is sufficient; the previously explored two-component and tapered medium-state architectures are not justified by the current external datasets. Residual mismatch remains in overall variance (SD ~49.5 vs UOM 56.2, but close to HUPA 51.6) and unconditional four-check joint statistics. These should be documented rather than patched by adding extra hidden mechanisms at this stage.

## Candidate freeze

Shortlist/freeze candidate for subsequent held-out validation:
- generator: v0.81 `S_I + D_insulin`
- basal-requirement state: single biphasic zero-DC, w=330 min, coupling=0.32
- transient: tau=90 min, amplitude=8 mg/dL

Do not merge to main yet. Validate held-out distributional fingerprints before any production promotion.
