# T1DM distributional validation — Run 26 handoff (2026-08-23)

Production remains frozen. No `engine.js` or `patient_generator.js` change was made or approved. GitHub Actions was not used.

## Starting point
Run 25 had completed the AZT1D raw/residual ACF runner (`validation/scripts/azt1d_estimand_audit_v3.py`) but could not execute the real 25-participant cohort in the current container because outbound DNS is unavailable.

## What Run 26 actually advanced
The external source itself was audited through the connected GitHub API rather than by relying only on the downloadable ZIP.

The current Glucose-ML AZT1D participant directory resolves to Git tree SHA:
- `40cb96f07e5ac516e80c473464c80e164e628c60`

The directory contains exactly 25 participant CSV blobs totaling:
- `7,070,873` bytes

The current AZT1D ZIP object is:
- Git blob SHA `ba80525963049298728b049b8202b81b492921f6`
- `1,215,941` bytes

The metadata CSV blob is:
- `869c4d8ba58f51a58070c4076e341969c2cac3cc`

All 25 participant filenames, Git blob SHA-1 values and byte sizes were pinned in a new manifest:
- `validation/manifests/azt1d_glucose_ml_source_manifest.json`

This prevents a future analysis from silently using an upstream-revised harmonized dataset while being reported as the same AZT1D validation cohort.

## New integrity gate
Added:
- `validation/scripts/verify_azt1d_source_manifest.py`

It computes the canonical Git blob SHA-1 (`sha1("blob <len>\\0" + bytes)`) for every local participant CSV and checks:
- exact expected file set;
- per-file byte size;
- per-file Git blob SHA-1;
- total file count;
- total participant bytes.

The verifier exits 0 only when the local directory exactly matches the pinned Glucose-ML Git objects, and exits 2 with structured mismatch details otherwise.

## Local verification actually completed
The new verifier passed `python -m py_compile` locally.

A synthetic integrity test was run twice:
1. exact synthetic file -> exit code 0, `ok: true`;
2. same-length one-byte-content change -> exit code 2 and Git blob SHA mismatch detected.

This specifically proves that equal byte size alone cannot falsely pass the gate.

## What remains blocked
The actual AZT1D 25-participant residual ACF numerical run remains unexecuted in this container. Direct `git clone` again failed on DNS resolution, and binary ZIP transfer is not exposed from the connected GitHub text interface into the local Python runtime.

No external residual ACF number was fabricated.

## Current scientific decision
Do not alter production physiology.

The next real scientific gate is still the same, but is now reproducibly version-pinned:
1. acquire the 25 participant CSVs matching `validation/manifests/azt1d_glucose_ml_source_manifest.json`;
2. run the integrity verifier and require `ok: true`;
3. execute `azt1d_estimand_audit_v3.py` with 5/10/15-min bins;
4. compare raw vs clock-demeaned vs LOO residual ACF and residual SD by daypart against the frozen model;
5. if material, reproduce the residual mismatch in T1D-UOM before introducing any new stochastic physiology.

## One-command sequence once data is locally available
```bash
python validation/scripts/verify_azt1d_source_manifest.py \
  --csv-dir <AZT1D participant csv dir> \
  --manifest validation/manifests/azt1d_glucose_ml_source_manifest.json

python validation/scripts/azt1d_estimand_audit_v3.py \
  --csv-dir <AZT1D participant csv dir> \
  --bins 5 10 15 \
  --output validation/results/azt1d_estimand_audit_v3.json
```

## New artifacts
- `validation/manifests/azt1d_glucose_ml_source_manifest.json`
- `validation/scripts/verify_azt1d_source_manifest.py`
- `VALIDATION_RUN26_HANDOFF_20260823.md`
