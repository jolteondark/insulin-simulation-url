# T1DM distributional validation — Run 25 handoff (2026-08-23)

Production remains frozen. No `engine.js` or `patient_generator.js` change was made or approved. GitHub Actions was not used.

## Starting point
Run 24 had already added direct per-subject Glucose-ML fetch/orchestration scripts, but the scientific bottleneck remained the same: obtain the external residual ACF before changing physiology.

## What Run 25 added
A consolidated local-only runner was added:
- `validation/scripts/azt1d_estimand_audit_v3.py`

It combines direct public ZIP acquisition, SHA256 provenance capture, archive extraction, participant discovery, and exact-pair ACF auditing in one command. It is an alternative to the separate fetch + wrapper path and is designed for ordinary local execution rather than Actions.

More importantly, v3 expands the estimand beyond the previous daytime-only output. For raw glucose, ordinary clock-demeaned residuals, and leave-one-day-out clock-demeaned residuals it now reports ACF at 30/60/120/240 min for:
- all day;
- daytime 06:00–24:00, requiring both lag endpoints to be daytime;
- overnight 00:00–06:00, requiring both lag endpoints to be overnight.

Default clock-bin sensitivity is 5/10/15 min in one run. Exact timestamp pairing is retained and the script performs no interpolation.

## Source verification
The public Glucose-ML AZT1D README was re-read. It explicitly states that the harmonized participant CSVs contain `timestamp` and `glucose_value_mg_dl`, and that `AZT1D-from-Glucose-ML.zip` contains the harmonized glucose data, metadata, and README for direct download. It cites the original AZT1D dataset DOI `10.17632/gk9m674wcx.1` and CC BY 4.0 licensing.

## Local verification actually completed
The v3 script passed `python -m py_compile` locally.

A synthetic 3-subject × 12-day CGM set with a repeated daily waveform plus correlated residual was run end-to-end through the CSV path at 5/10/15-min bins.

Synthetic daytime r120 medians:
- raw: `0.506`
- ordinary clock-demeaned: `0.356`
- leave-one-day-out: `0.356`

At 10 and 15 min the residual r120 remained ~0.355–0.357. This confirms the combined multi-bin/daypart/LOO path behaves as intended. These values are software smoke-test values only and are not biological evidence.

## Runtime limitation
The canonical 25-participant numerical AZT1D residual ACF could still not be executed in this container because outbound DNS is disabled. The public ZIP is verifiably present, but the connected GitHub binary-blob path attempts UTF-8 decoding and therefore cannot bridge the ZIP into Python. No external residual number was fabricated.

## Current decision
Do not change production physiology yet.

The next scientific gate remains:
1. execute the canonical AZT1D residual ACF with 5/10/15-min sensitivity and daypart outputs;
2. compare residual SD and r30/r60/r120/r240 against frozen simulation;
3. if material, independently reproduce the same residual mismatch in T1D-UOM;
4. only then introduce the minimum stochastic mechanism against residual, not raw, ACF.

## New artifact
- `validation/scripts/azt1d_estimand_audit_v3.py`
- `VALIDATION_RUN25_HANDOFF_20260823.md`

## One-command execution
`python validation/scripts/azt1d_estimand_audit_v3.py --download --bins 5 10 15 --output validation/results/azt1d_estimand_audit_v3.json`
