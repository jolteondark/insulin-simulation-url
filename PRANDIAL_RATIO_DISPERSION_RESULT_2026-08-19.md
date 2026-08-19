# CF/ICR joint-distribution diagnostic — 2026-08-19

Validation-only. Production/main unchanged.

## Motivation
Patient-level hypoglycemia was highly concentrated: the top 20% of generated patients accounted for ~64.4% of all hypoglycemic minutes. The strongest patient-level correlate was the effective prandial ratio CF/ICR (r≈0.82 with patient TBR<70), rather than CF or ICR alone.

The generator currently derives CF from TDD/body size while deriving ICR directly from latent insulin-need/sensitivity variables. This allows discordant phenotypes such as relatively high CF together with low ICR.

## Diagnostic transform
Let R = CF/ICR. Preserve the cohort median R, but shrink log-dispersion:

R_new = median(R) * exp(lambda * log(R / median(R)))

lambda=1 is the current joint distribution; lambda=0 forces the same R for all patients. ICR is then reconstructed so obesity-action cancellation remains consistent in the current v2 treatment layer.

Fixed: alpha=0.10 zero-area shape correction, rapid scale=0.80, fast_scale=0.80, finite-memory coupling=0.28, gain70=5 mg/dL/g, N=120, 7 days, 1-day warmup.

## Results

| lambda | R p10–p90 | mean | SD | TBR<70 | TBR<54 | any 4-check <70 | all-four TIR | ACF 30/60/120/240 |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1.00 | 2.71–5.08 | 154.3 | 64.7 | 7.49% | 3.41% | 18.47% | 36.94% | .866/.602/.210/.193 |
| 0.75 | 2.92–4.68 | 154.1 | 61.1 | 5.69% | 2.08% | 15.28% | 39.31% | .867/.605/.211/.202 |
| 0.50 | 3.16–4.32 | 153.7 | 58.9 | 4.47% | 1.26% | 12.64% | 41.94% | .866/.619/.227/.210 |
| 0.25 | 3.41–3.99 | 154.6 | 58.3 | 3.83% | 0.82% | 11.39% | 42.92% | .869/.621/.259/.231 |
| 0.00 | 3.68–3.68 | 155.4 | 59.8 | 4.15% | 0.99% | 12.22% | 39.72% | .871/.623/.255/.228 |

UOM reference: mean 146.46, SD 56.23, TBR<70 2.06%, TBR<54 0.276%, any 4-check <70 7.68%, all-four TIR 43.31%, ACF .863/.634/.247/-.012.

## Interpretation
Shrinking CF/ICR dispersion materially improves hypoglycemia tails and overall SD while preserving short/intermediate ACF. Full collapse (lambda=0) is worse than partial shrinkage; therefore real heterogeneity is needed, but the current generator likely over-disperses the effective prandial balance.

Best diagnostic region is lambda≈0.25–0.50. This does not yet justify production calibration because the external empirical distribution of CF/ICR has not been established. Next step should estimate or constrain the joint CF–ICR distribution from real T1DM dosing data rather than choose lambda solely from glucose outcomes.
