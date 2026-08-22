# Patient-level hypoglycemia heterogeneity diagnostic — 2026-08-19

Protocol: N=300 generated T1DM patients, 14 days each, first 2 days warmup, zero-area temporal correction alpha=0.10, rapid scale 0.80, fast scale 0.80, finite-memory coupling 0.28, independent meal gain 5 mg/dL/g at 70 kg. Validation-only branch analysis; main untouched.

## Distribution
- Median patient TBR<70: 3.25%
- 80th percentile: 13.41%
- 90th percentile: 21.57%
- 95th percentile: 28.10%
- Maximum: 41.01%
- Patients with zero TBR<70: 23.67%
- Top 20% of patients account for 64.42% of total hypoglycemia time.

This strongly supports a heterogeneous vulnerability subgroup rather than a uniform global-core error.

## Top 20% hypo-prone vs other 80%: median phenotype
| parameter | top 20% | other 80% |
|---|---:|---:|
| legacy ICR g/U | 7.89 | 10.35 |
| legacy CF mg/dL/U | 40.09 | 33.69 |
| counterreg threshold mg/dL | 65.69 | 68.70 |
| counterreg strength | 0.898 | 1.031 |
| TDD U/day | 31.40 | 44.36 |
| meal bolus total U/day | 22.25 | 18.50 |
| independent meal gain | 5.37 | 4.92 |
| effective insulin gain | 55.80 | 45.43 |
| weight kg | 62.69 | 71.85 |

Directional profile of the hypo-prone subgroup:
- lower ICR -> larger meal bolus dose,
- higher CF / effective insulin gain -> larger glucose fall per unit,
- weaker and lower-threshold counterregulation,
- lower body weight / lower TDD,
- modestly higher independent meal gain.

Individual linear correlations are only moderate because the failure is joint/nonlinear. Strongest simple correlations with patient TBR<70 were effective insulin gain +0.374, CF +0.366, gain +0.316, low weight -0.315, low TDD -0.285, and weak counterregulation around -0.19.

## Interpretation
The remaining excessive hypoglycemia tail is not best described as a uniform prandial-insulin multiplier error. It is concentrated in a generated subgroup where low ICR, high CF/effective insulin gain, low body weight/TDD, and weak counterregulation co-occur. This points to the generator joint distribution / coupling among treatment phenotypes and physiology as the next target.

Do not hard-gate these patients away in external validation. Next step should test whether the joint CF–ICR–counterreg relationship is clinically plausible, preferably against external distributions or canonical T1DM relationships, and then alter generator covariance/derivation rather than adding another glucose-state mechanism.
