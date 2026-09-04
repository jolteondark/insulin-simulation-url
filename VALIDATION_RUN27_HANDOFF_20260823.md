# T1DM distributional validation — Run 27 handoff (2026-08-23)

Production remains frozen. No `engine.js` or `patient_generator.js` change was made or approved. GitHub Actions was not used.

## Starting point
Run 26 had pinned the exact 25-participant Glucose-ML AZT1D harmonized source and added a standalone manifest verifier. The scientific bottleneck remained the actual external residual ACF run, blocked in this container by outbound DNS.

## What Run 27 actually advanced
A new hardened local runner was added:
- `validation/scripts/azt1d_estimand_audit_v4.py`

The core estimand is unchanged from v3:
- exact timestamp pairs only;
- no interpolation;
- 30/60/120/240-min ACF;
- raw, clock-demeaned and leave-one-day-out (LOO) residual ACF;
- all-day, daytime 06:00–24:00 and overnight 00:00–06:00;
- 5/10/15-min clock-bin sensitivity.

v4 adds three pre-interpretation safeguards:
1. integrated optional `--manifest` verification, with analysis aborted on filename/byte/Git-blob mismatch;
2. per-subject cadence and exact-pair coverage diagnostics for every lag/daypart;
3. residual SD summarized separately by all-day/daytime/overnight.

It also emits strict JSON (`null` for non-finite values) instead of non-standard NaN tokens.

## Local validation actually completed
`python -m py_compile` passed.

An end-to-end synthetic test used 3 subjects × 12 days, exact 5-min cadence, a fixed circadian waveform plus AR(1) residual (`phi=0.88` per 5 min), and a synthetic Git-blob manifest.

5-min-bin results:
- median cadence 5.0 min;
- exactly-5-min cadence 100%;
- daytime 120-min exact-pair coverage 1.0;
- raw daytime r120 = 0.5093;
- LOO residual daytime r120 = 0.0224;
- LOO overnight residual SD = 11.06 mg/dL.

For reference, the synthetic AR state has theoretical 120-min correlation `0.88^24 ≈ 0.046`, so the LOO estimate returns to the intended short-memory range while raw ACF remains inflated by the repeated clock waveform.

The source-integrity gate was then challenged by changing one CSV without changing file length. File count and total bytes still matched, but the runner exited 2 on Git blob SHA mismatch. Therefore provenance verification is now part of the same canonical analysis command and cannot be silently skipped when `--manifest` is supplied.

Detailed method-check record:
- `validation/results/azt1d_estimand_audit_v4_method_check_20260823.md`

## What remains blocked
The real 25-participant AZT1D residual ACF is still not numerically available in this container. Direct public ZIP acquisition again failed because the local runtime cannot resolve `raw.githubusercontent.com`.

No external residual ACF value was fabricated.

## Scientific decision
Do not alter production physiology.

The next scientific gate is now stricter:
1. acquire the pinned 25 participant CSVs;
2. run v4 with `--manifest` and require integrity `ok=true`;
3. inspect cadence and exact-pair coverage before interpreting ACF;
4. compare raw vs LOO residual ACF and residual SD by daypart against the frozen model;
5. require the main conclusion to be stable across 5/10/15-min bins;
6. if a material residual mismatch remains, independently reproduce it in T1D-UOM before adding stochastic physiology.

## Canonical next command
```bash
python validation/scripts/azt1d_estimand_audit_v4.py \
  --csv-dir <AZT1D participant csv dir> \
  --manifest validation/manifests/azt1d_glucose_ml_source_manifest.json \
  --bins 5 10 15 \
  --output validation/results/azt1d_estimand_audit_v4.json
```

## New artifacts
- `validation/scripts/azt1d_estimand_audit_v4.py`
- `validation/results/azt1d_estimand_audit_v4_method_check_20260823.md`
- `VALIDATION_RUN27_HANDOFF_20260823.md`
