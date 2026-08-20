# ShanghaiT2DM basal-bolus target revision (2026-08-20)

## Why this revision
The educational game uses a basal + premeal bolus treatment structure. Therefore the primary dynamic calibration comparator should be the ShanghaiT2DM basal-bolus subgroup, not the full treatment-mixed cohort.

## Clinically re-audited regimen groups
Summary n=109:
- No insulin: 53
- Premix: 28
- Basal-only: 14
- Short/regular-only: 7
- Basal-bolus: 7

CGM-containing sessions are 106; basal-bolus CGM sessions n=7.

Basal-bolus session IDs:
- 2025_0_20210506: Novolin R + insulin glargine
- 2035_0_20210629: insulin detemir + Novolin R (+ oral agents)
- 2036_0_20210803: insulin detemir + Novolin R
- 2043_0_20210513: insulin detemir + Novolin R
- 2074_0_20210707: insulin detemir + Novolin R
- 2090_0_20201130: insulin glargine + insulin glulisine
- 2094_0_20211109: insulin glargine + Humulin R (+ voglibose)

## Basal-bolus dynamic fingerprint
Pooled CGM:
- mean 164.3 mg/dL
- SD 57.6 mg/dL
- TBR <70: 1.51%
- TIR 70-180: 61.62%
- TAR >180: 36.88%

Meal-relative premeal CGM:
- breakfast: 147.7 ± 35.4 mg/dL
- lunch: 156.7 ± 67.6 mg/dL
- dinner: 171.9 ± 65.0 mg/dL

## Consequences
1. The prior all-cohort equilibrium target near 132 mg/dL is NOT appropriate for the basal-bolus game model.
2. The earlier equilibrium near 147 mg/dL was much closer to the treatment-matched basal-bolus pre-breakfast target than we thought.
3. Attempts to force the basal-bolus simulator to reproduce the full-cohort mean ~139 mg/dL and TBR ~2.3% created artificial hypoglycemia and led to unnecessary noise/mismatch experiments.
4. The treatment-matched target is substantially more hyperglycemic and more variable than the full cohort.
5. The original kernel candidate (roughly pooled 148.6 ± 42.5, TBR 2.7%, TIR 76.9%, TAR 20.4%; premeal/fixed-clock ~147/151/151) is therefore under-hyperglycemic and under-variable versus the basal-bolus subgroup, but its fasting center is close.

## Decision
- Stop tuning against the full treatment-mixed Shanghai target for the basal-bolus game.
- Restore/provisionally retain a fasting equilibrium centered around ~148 mg/dL, but increase its dispersion toward the observed pre-breakfast SD ~35 mg/dL rather than the old ~28 mg/dL.
- Recalibrate meal/bolus balance against basal-bolus lunch/dinner targets and pooled TAR, without adding generic noise first.
- Treat the 7-session subgroup as a development/calibration target with high sampling uncertainty; report uncertainty and do not overfit exact percentages.
- Keep Shanghai as development calibration only; final evaluation remains Gaotang independent external validation.

Main branch remains untouched.
