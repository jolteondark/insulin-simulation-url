# Held-out fingerprint validation result — 2026-08-20

## Frozen candidate tested
- generator: v0.81 `S_I + D_insulin`
- single biphasic basal-requirement state: `w=330 min`, `coupling=0.32`
- zero-area transient: `tau=90 min`, `amp=8 mg/dL`
- N=300 patients, 14 days, 2 warm-up days
- no retuning to the held-out fingerprints below

## Held-out population fingerprint
Model:
- mean 148.86 mg/dL
- SD 49.94 mg/dL
- CV 33.55%

External references:
- UOM CV 38.389%
- HUPA CV 38.08%

Quantiles (model vs UOM):
- p5 81.01 vs 79.28
- p10 92.94 vs 90.09
- p25 114.29 vs 108.11
- p50 140.90 vs 133.34
- p75 174.90 vs 171.17
- p90 215.97 vs 223.43
- p95 244.79 vs 257.66

Interpretation:
- lower tail is reproduced reasonably well without tuning to these quantiles;
- central distribution is shifted modestly high;
- upper tail is too light, especially p90-p95;
- the low CV is therefore a real residual mismatch, not merely a single-SD artifact.

## Four-check held-out joint fingerprint
Model vs UOM:
- any check <70: 11.42% vs 7.68%
- any check >180: 49.25% vs 53.77%
- all four checks 70-180: 45.44% vs 43.31%

Interpretation:
- all-four-TIR is close;
- model has too many days with at least one low check and too few days with at least one high check;
- therefore unconditional four-check joint behavior remains an explicit mismatch.

## Patient-level heterogeneity (descriptive; no direct external target yet)
- median patient TBR<70: 1.55%
- p80: 3.59%
- p90: 4.90%
- p95: 5.95%
- zero-TBR patients: 5.0%
- top 20% of patients account for 49.40% of hypoglycemic minutes
- between-patient SD of mean glucose: 8.28 mg/dL
- median within-patient SD: 46.87 mg/dL

These are descriptive diagnostics only until an external patient-level heterogeneity target is available. Do not tune to them yet.

## Decision
The candidate is good enough to stop adding physiology solely to match one scalar metric, but it should be called a **provisional freeze**, not a fully validated final model.

Supported:
1. marginal center is close;
2. lower-tail quantiles are close;
3. TIR/TBR from prior N300 validation are close;
4. temporal ACF 30-120 min is close to UOM and ACF240 lies between UOM and HUPA;
5. all-four-TIR is close.

Residual mismatches to carry forward explicitly:
1. CV/SD too low (~33.6% vs ~38% externally);
2. upper tail too light (p90/p95 low);
3. four-check any-low too high and any-high too low;
4. patient-level heterogeneity not externally validated.

Next action should be held-out/external validation on additional data or context-rich behavior layers, not another physiology parameter search. Structural changes should require a reproducible mismatch across independent datasets.
