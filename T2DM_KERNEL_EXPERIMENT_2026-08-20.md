# T2DM meal/bolus kernel experiment — 2026-08-20

## Goal

Test whether the ShanghaiT2DM aggregate and 4-point distributions can be approached by correcting meal/bolus time kernels after static phenotype and fasting-equilibrium calibration, without adding daily transient noise.

## Candidate kernel

- meal gain: 0.025
- meal tau: 80 min
- meal support: 330 min
- bolus gain: 0.28
- bolus tau: 90 min
- bolus support: 330 min
- equilibrium restore gain: 0.006
- no daily transient
- patient phenotype: `T2DMPatientPhenotypeV1ShanghaiExp`
- treatment: current `suggestOrder()` reference order

The meal and bolus kernels remain simple gamma-like empirical kernels. This candidate is an experiment, not a frozen pharmacokinetic claim.

## 2,000-patient simulation result

| Metric | Kernel candidate | Shanghai benchmark |
|---|---:|---:|
| Mean glucose | 148.63 mg/dL | ~150 mg/dL (directly readable subset) |
| SD | 42.55 mg/dL | ~48 mg/dL (directly readable subset) |
| TIR 70–180 | 76.88% | 77.68% |
| TBR <70 | 2.71% | 2.36% |
| TAR >180 | 20.41% | 19.96% |

### Four-point distribution

| Time | Model mean | Model SD | Shanghai mean | Shanghai SD |
|---|---:|---:|---:|---:|
| Morning | 146.88 | 27.77 | ~147.4 | ~28.8 |
| Pre-lunch | 151.33 | 42.24 | ~148.2 | ~54.3 |
| Pre-dinner | 150.76 | 51.21 | ~151.7 | ~50.1 |
| Bedtime | 151.94 | 53.57 | ~154.0 | ~46.6 |

## Interpretation

1. The previous claim that Shanghai-like TBR requires daily transient noise is not supported. A slower/longer meal-bolus kernel combined with corrected fasting equilibrium produces Shanghai-like TIR/TBR/TAR without transient noise.
2. Morning mean and SD are now close to the directly readable Shanghai subset.
3. Pre-dinner mean/SD are also close.
4. Pre-lunch variance remains too small, while bedtime variance is somewhat too large. These should be treated as remaining structural discrepancies rather than patched with generic noise.
5. This comparison still uses a model-generated reference insulin order against a heterogeneous real-world cohort with heterogeneous therapies. It is therefore a distributional structural test, not a treatment-matched validation.

## Next validation priority

Before adding transient noise, stratify ShanghaiT2DM by insulin-treatment status / available insulin records and compare meal-level excursion and 4-point variance within more comparable treatment groups. If treatment-stratified data are insufficient, retain the current kernel as provisional and test independent inpatient data before further calibration.
