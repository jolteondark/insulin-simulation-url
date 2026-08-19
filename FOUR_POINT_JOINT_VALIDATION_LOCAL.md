# Four-point joint validation — local reconstruction

Experimental validation only. Do not merge to main.

## Frozen candidate

- finite-memory basal-requirement state
- memory_min = 210 min
- basal_requirement_coupling = 0.28
- fast_scale = 0.80
- setpoint_shift_mg_dl = +15
- clinical layer enabled: adiposity/incremental IR, mean-preserving meal-specific ICR, circadian requirement
- eGFR = 90
- N=300 generated T1DM patients
- 7 days, day 1 warm-up, days 2–7 analyzed
- fixed meals 50/70/60 g and starter dosing policy

## Model four-point fingerprint

Pseudo-POC times match the game: 07:00 / 12:00 / 18:00 / 21:00.

### Marginals by check

| Check | Mean mg/dL | SD |
|---|---:|---:|
| 07:00 | 147.5 | 43.6 |
| 12:00 | 94.0 | 41.1 |
| 18:00 | 117.2 | 41.6 |
| 21:00 | 187.0 | 43.7 |

Mean transitions:
- 07→12: -53.5 mg/dL
- 12→18: +23.2 mg/dL
- 18→21: +69.8 mg/dL

### Same-day correlation matrix

| | 07 | 12 | 18 | 21 |
|---|---:|---:|---:|---:|
| 07 | 1.000 | 0.538 | 0.202 | 0.109 |
| 12 | 0.538 | 1.000 | 0.467 | 0.250 |
| 18 | 0.202 | 0.467 | 1.000 | 0.688 |
| 21 | 0.109 | 0.250 | 0.688 | 1.000 |

Patient-day pattern rates:
- any of four checks <70: 37.6%
- any of four checks >180: 61.9%
- all four checks 70–180: 18.6%

## Interpretation

This is an important failure signal despite a good 24-h marginal distribution. The model currently produces an unusually large deterministic within-day swing: high-ish fasting, marked pre-lunch trough, partial recovery by pre-dinner, and a large bedtime peak.

Do **not** tune against this result yet. First regenerate the exact same 07/12/18/21 pseudo-check fingerprint from T1D-UOM V1.0.3, then compare time-specific means/SDs, correlation matrix, transition distributions and pattern rates. If the real dataset is materially flatter, likely mechanisms to inspect are:

1. meal-specific ICR redistribution is too strong for the current fast core;
2. circadian requirement amplitude/timing is too strong or phase-misaligned;
3. breakfast rapid-insulin action and breakfast meal absorption are mismatched;
4. dinner meal/bolus timing may place too much excursion at the 21:00 check.

This is exactly why four-point joint validation was specified separately from 24-h marginal validation.

## Provenance / caveat

These numbers were produced by local reconstruction of the branch formulas, not GitHub Actions. The public Zenodo V1.0.3 record was located, but the ZIP could not be downloaded through the current runtime. External four-point values should therefore not be guessed.
