# AZT1D estimand audit v4 — method check (2026-08-23)

## Why v4 was added
The v3 runner could compute raw / clock-demeaned / leave-one-day-out (LOO) residual ACF, but three interpretation safeguards were still separate or missing:

1. pinned-source manifest verification was a separate command and therefore could be accidentally skipped;
2. exact-pair coverage and source cadence were not reported, so a correlation could be interpreted without knowing how much of the trace contributed exact timestamp pairs;
3. residual SD was only summarized all-day, although the current scientific question is explicitly daypart-specific (overnight stochasticity versus daytime trajectory structure).

`validation/scripts/azt1d_estimand_audit_v4.py` adds these safeguards without changing the core estimand.

## New outputs / gates
- Optional `--manifest` verifies every participant CSV using filename, byte count and Git blob SHA-1 before analysis. Any mismatch aborts with exit code 2.
- Per-subject cadence diagnostics: median interval, q95 interval, percent exactly 5 min, percent <=10 min.
- For each lag/daypart/estimand: exact pair count, eligible point count, exact-pair coverage.
- Clock-demeaned and LOO residual SD separately for all-day, daytime 06:00–24:00 and overnight 00:00–06:00.
- Output JSON is strict JSON: non-finite values are emitted as `null`, not non-standard `NaN` tokens.

## Local tests actually run
`python -m py_compile` passed.

A synthetic end-to-end test used 3 subjects × 12 days on an exact 5-minute grid with:
- a fixed circadian waveform;
- AR(1) residual state with phi=0.88 per 5 min;
- a synthetic Git-blob manifest.

Observed 5-min-bin aggregate diagnostics:
- median cadence: 5.0 min;
- exactly-5-min cadence: 100%;
- daytime 120-min exact-pair coverage: 1.0;
- raw daytime r120: 0.5093;
- LOO residual daytime r120: 0.0224;
- LOO overnight residual SD: 11.06 mg/dL.

The expected AR(1) 120-min correlation is `0.88^24 ≈ 0.046`, so the observed LOO value is in the expected short-memory range while the raw ACF remains inflated by the repeated 24-hour waveform. This confirms that the runner separates deterministic clock structure from residual temporal dependence in the intended direction.

The manifest test was then repeated after a same-length content mutation to one CSV. File count and total bytes remained unchanged, but the v4 runner aborted with exit code 2 because Git blob SHA-1 no longer matched. This confirms the integrated provenance gate cannot be bypassed by equal byte size.

## What this does NOT establish
These are synthetic method checks only. They do not provide any biological estimate for AZT1D and do not justify changing production physiology.

The actual 25-participant AZT1D residual ACF remains pending because the current local execution container cannot resolve external DNS. The canonical next run should therefore use v4, not v3, once the pinned participant files are locally available.

## Canonical command once the data are available
```bash
python validation/scripts/azt1d_estimand_audit_v4.py \
  --csv-dir <AZT1D participant csv dir> \
  --manifest validation/manifests/azt1d_glucose_ml_source_manifest.json \
  --bins 5 10 15 \
  --output validation/results/azt1d_estimand_audit_v4.json
```
