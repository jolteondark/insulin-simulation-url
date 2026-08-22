# T2DM v2 day-level SI variation: negative result

Branch: `v2/state-space-minimal`

Purpose: test whether the remaining ShanghaiT2DM variance gap can be explained by a single day-level insulin-sensitivity (SI) multiplier after adding meal-load variability and a small bolus mismatch.

Fixed structure used for this sensitivity test:
- Shanghai106 shifted-lognormal dynamic equilibrium phenotype
- equilibrium-centered kernel model
- physiologic/kernel-derived prandial order decomposition
- meal-load variability approximately 45% of observed staple-weight proxy CV for breakfast and 20% for lunch/dinner
- independent prandial dose mismatch SD 10%

Monte-Carlo sensitivity (common random-number design; approximate):

| day SI CV | pooled mean | pooled SD | TBR <70 | TIR | TAR >180 | pre-lunch SD | pre-dinner SD |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0% | 138.9 | 40.9 | 2.26% | 82.59% | 15.16% | 47.8 | 42.7 |
| 3% | 139.0 | 41.2 | 2.35% | 82.28% | 15.37% | 48.1 | 43.2 |
| 5% | 139.1 | 41.8 | 2.52% | 81.76% | 15.72% | 48.6 | 44.1 |
| 7.5% | 139.3 | 42.9 | 2.90% | 80.76% | 16.34% | 49.4 | 45.8 |
| 10% | 139.5 | 44.4 | 3.39% | 79.52% | 17.09% | 50.6 | 48.2 |
| 12.5% | 139.9 | 46.2 | 4.04% | 78.01% | 17.95% | 52.1 | 51.0 |
| 15% | 140.3 | 48.4 | 4.76% | 76.37% | 18.87% | 53.9 | 54.2 |
| 17.5% | 140.8 | 50.8 | 5.56% | 74.61% | 19.83% | 55.8 | 57.8 |
| 20% | 141.3 | 53.4 | 6.39% | 72.74% | 20.87% | 58.0 | 61.6 |

Shanghai106 targets: pooled mean 138.99 mg/dL, SD 49.62 mg/dL, TBR 2.32%, TIR 79.60%, TAR 18.09%; pre-lunch SD 50.87, pre-dinner SD 48.86 mg/dL.

Interpretation:
- Small SI variation (about 3%) preserves TBR but does almost nothing to the pooled SD gap.
- SI variation large enough to recover pooled SD (~15–18%) drives TBR to ~4.8–5.6% and over-expands meal-slot variance.
- Therefore a single day-level SI noise term is not a valid explanation for the remaining Shanghai variance gap.
- Do not add large generic SI noise to the candidate model.

Next methodological step:
The calibration target currently pools markedly different treatment regimens (no insulin, premix, basal-only, short/regular-only, etc.). Before adding more stochastic physiology, stratify the full Shanghai raw-session cohort by treatment regimen and compare the basal-bolus-like simulator only against the treatment-compatible subgroup. Residual variance should be attributed only after this treatment-context mismatch is removed.
