# T1DM distributional validation — Run 24 handoff (2026-08-23)

Production remains frozen. No `engine.js` or `patient_generator.js` change was made or approved. GitHub Actions was not used.

## Starting point
Run 23 established the correct next estimand: patient-level daytime raw ACF versus clock-time-demeaned residual ACF, including leave-one-day-out (LOO) de-meaning. The canonical AZT1D numerical result remained blocked only because the execution container could not transfer the public Glucose-ML participant files.

## What Run 24 did
The public Glucose-ML AZT1D repository structure was re-verified directly. The harmonized AZT1D directory contains an extracted participant-CSV directory in addition to the ZIP, and the CSV schema is `timestamp,glucose_value_mg_dl`. Individual files were readable through GitHub; Subject 14 and Subject 25 were explicitly checked, and Subject 26 does not exist. This supports the 1–25 participant numbering used by the new fetcher.

A second public redistribution route, GlucoFM-Bench, was also inspected. It contains AZT1D time series in train/test parquet files and is useful for sensitivity analysis, but its published preprocessing linearly interpolates gaps shorter than one hour. Therefore it remains secondary evidence only and must not replace the canonical Glucose-ML exact-pair audit.

## New reproducibility tooling
Two validation-only scripts were added.

### `validation/scripts/fetch_azt1d_glucose_ml.py`
Downloads the 25 extracted Glucose-ML AZT1D participant CSVs directly from the public GitHub repository instead of relying on the ZIP archive. For each file it:
- validates the expected header;
- writes the original participant CSV unchanged;
- records file size and SHA256;
- writes a JSON manifest containing source URL and checksum.

This removes the previous ZIP-transfer dependency and provides a reproducible provenance record when run in any network-enabled environment.

### `validation/scripts/run_azt1d_residual_audit.py`
Runs `azt1d_clock_demeaned_acf_audit_v2.py` automatically at 5/10/15/30-minute clock bins and writes each full JSON output plus one `SUMMARY.json`. It does not alter the estimand and does not interpolate.

## Local verification
Both new scripts passed `python -m py_compile` locally.

The multi-bin wrapper was also smoke-tested locally against a deterministic fake audit executable. It successfully executed all four bins (5, 10, 15, 30) and assembled the expected summary. This validates orchestration only, not biological results.

## What remains blocked
The actual 25-subject Glucose-ML residual ACF values are still not reported because this automation container has no DNS/network access and the connector cannot stream the multi-file dataset into the local Python runtime. The ZIP blob also cannot be decoded through the text GitHub connector. No numerical residual ACF was fabricated.

## Current interpretation
No physiology change is justified yet. The frozen simulator's clock-demeaned residual process is still known to be nearly deterministic, but the matching external residual target must be measured before adding stochasticity.

The external comparison remains gated as follows:
1. canonical Glucose-ML AZT1D exact-pair residual ACF at 5-minute bins;
2. 10/15/30-minute clock-bin sensitivity and ordinary-versus-LOO comparison;
3. independent residual mismatch replication in T1D-UOM;
4. only then design a minimal stochastic mechanism against residual, not raw, ACF.

## New artifacts
- `validation/scripts/fetch_azt1d_glucose_ml.py`
- `validation/scripts/run_azt1d_residual_audit.py`
- `VALIDATION_RUN24_HANDOFF_20260823.md`

## Next priority
Run the new fetcher and multi-bin audit in the first environment with ordinary outbound network access. If the AZT1D residual target differs materially from the frozen simulator, immediately repeat the same estimand in T1D-UOM before touching production physiology. If it does not differ materially, stop treating residual stochasticity as a missing mechanism and reassess the educational/trajectory-level validation target instead.
