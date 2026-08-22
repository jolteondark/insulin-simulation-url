# Run 23 — AZT1D residual-ACF estimand audit: method hardening (2026-08-23)

## Scope
Production remains frozen. No `engine.js` or `patient_generator.js` change was made. GitHub Actions was not used.

Run 22 established that the frozen simulator's raw daytime r120 is dominated by the repeated deterministic 24-hour waveform: after per-patient clock-time de-meaning, residual SD was only ~0.133 mg/dL and residual ACF was ~1.0. Therefore the next decisive comparison is the same detrending applied to external AZT1D CGM.

## Data-source verification
The public Glucose-ML AZT1D directory was re-verified. It contains one harmonized CSV per participant with exactly the required columns:
- `timestamp`
- `glucose_value_mg_dl`

The Glucose-ML README identifies the original dataset as AZT1D (Mendeley DOI `10.17632/gk9m674wcx.1`, CC BY 4.0). The existing validation branch already established the raw AZT1D ACF from this harmonized cohort (25 participants).

A secondary GlucoFM-Bench representation was also inspected. It exposes AZT1D participant series in train/test parquet files but explicitly performs interpolation for gaps shorter than one hour. It is therefore suitable only as a sensitivity source, not as the canonical exact-pair estimand for this audit.

## Methodological issue found and fixed
The first `clock_demeaned_acf_audit.js` subtracts each participant's mean at each exact clock-time bin using all available days. That is a reasonable descriptive residualization with long recordings, but in shorter simulator runs the observation being evaluated contributes to its own reference mean. This self-inclusion can shrink residual variance and slightly alter covariance.

A new independent implementation was added:

`validation/scripts/azt1d_clock_demeaned_acf_audit_v2.py`

It reports three estimands per participant using exact timestamp pairs at 30/60/120/240 min and daytime pairs with both endpoints at 06:00–24:00:
1. raw ACF;
2. ordinary within-subject clock-time-demeaned ACF;
3. leave-one-day-out (LOO) clock-time-demeaned ACF, where each day's expected clock-time trajectory is estimated only from the other days.

It also reports:
- pair counts at every lag;
- participant-level residual SD;
- LOO residual SD;
- days per participant;
- patient median and IQR for each estimand;
- configurable 5/10/15/30-min clock bins as a sensitivity analysis.

The script does not interpolate missing observations. It accepts either the Glucose-ML extracted CSV directory or, for sensitivity only, local GlucoFM-Bench parquet files.

## Local execution checks
The new script was compiled successfully with `python -m py_compile`.

A synthetic 3-subject, 12-day CGM test with a fixed daily sinusoidal trajectory plus an AR(1) residual was run locally. The audit behaved as intended: raw ACF was high because it contained the repeated daily waveform, while clock-demeaned ACF recovered a much shorter residual correlation structure. LOO and ordinary de-meaning were essentially identical in this balanced 12-day synthetic test, demonstrating that the LOO path is operational and provides a direct sensitivity check rather than silently changing the target.

Synthetic smoke-test numbers are not biological results and are not used for model selection.

## External AZT1D execution status
The canonical 25-participant AZT1D residual ACF was **not numerically claimed in this run**. The connected GitHub interface can inspect the public participant CSVs, but the execution container in this run could not resolve external hosts or download the multi-file dataset; the Hugging Face binary download path was also unavailable. The user's File Library was searched and did not contain AZT1D.

This is an execution-environment limitation, not a data-availability limitation. The dataset and schema are verified and the analysis is now self-contained once the CSV directory is locally available.

## Decision impact
No physiology should be changed from this run.

The key methodological decision is strengthened:
- raw daytime ACF remains a mixed trajectory-plus-residual statistic;
- external residual ACF must be computed before treating the raw r120 gap as evidence for a richer latent state;
- LOO de-meaning should accompany ordinary de-meaning so that the very low simulated residual variance is not dismissed as an artifact of self-inclusion.

If AZT1D clock-demeaned residual SD is orders of magnitude larger than the frozen model's ~0.133 mg/dL and has materially lower r60/r120 than ~1, that will directly quantify the missing within-patient variability target. If most of the raw ACF difference disappears after identical de-meaning, daytime work should shift away from generic memory/noise and toward realistic trajectory heterogeneity.

## Next highest-value execution
Run the new script on the 25 Glucose-ML AZT1D CSVs, first at 5-min bins, then repeat at 10/15-min bins and compare ordinary vs LOO residual ACF. After that, apply the same estimand to T1D-UOM as an independent replication before any production stochastic-process change.
