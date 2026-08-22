# Shanghai cohort alignment correction (2026-08-20)

## Problem identified
Recent meal-heterogeneity experiments used meal timing/composition estimates derived only from the 20 ShanghaiT2DM sessions stored as `.xlsx`, while some aggregate calibration targets (especially TBR 2.36%) came from the full 109-session author-notebook analysis.

These are not the same analysis population and should not be combined for parameter tuning.

## Relevant values
For the directly parsed 20 `.xlsx` sessions (16,931 CGM samples):
- pooled TIR 70–180: ~78.00%
- pooled TBR <70: ~0.71%
- pooled TAR >180: ~21.29%
- pooled mean glucose: ~150.0 mg/dL
- pooled SD: ~48.0 mg/dL

For the full 109-session author-notebook output:
- session-mean TIR: 77.68%
- session-mean TBR: 2.36%
- session-mean TAR: 19.96%

Therefore meal-load variation estimated from the 20-session subset must first be judged against outcomes from the same 20-session subset, unless meal data are recomputed for all 109 sessions.

## Compensation-rate sweep
A provisional sweep of meal-load variation amplitude and prandial-insulin compensation did not find a convincing joint fit when the 20-session meal variation was incorrectly scored against full-109 TBR. This result is not valid for calibration and should not be used to choose a compensation rate.

## Next step
A public third-party GitHub mirror (`MouzKarrigan/2024_TJU_Data_Mining-Analysis`) contains converted CSV files for the ShanghaiT2DM sessions, including files corresponding to the legacy `.xls` originals. Use this only as a format-conversion aid; the original Figshare ZIP remains source of truth.

Recompute a same-cohort full-109 benchmark where possible:
1. meal-relative pre-breakfast/pre-lunch/pre-dinner CGM distributions
2. meal timing distributions
3. meal composition / carbohydrate proxy distributions
4. insulin timing and dose distributions
5. TIR/TBR/TAR and within-/between-session variance

Then resume the meal-load × insulin-compensation sweep on aligned targets.
