# Validation experiment: slow-state basal v1

Experimental branch only. Do not merge into production until independent-dataset validation is complete.

## Structural changes

- Keep the existing generated patient parameters.
- Represent basal physiology explicitly as a balance between the patient's target basal requirement and the actually administered glargine activity, instead of only a pre-computed basal dose difference.
- Lengthen the glucose mean-reversion half-life from 300 min to 1500 min.
- Broaden nominal aspart action from peak 105/duration 300 min to peak 135/duration 420 min.
- Broaden meal absorption time constants by 1.4x.
- Add a deterministic within-patient low-frequency metabolic drive (AR(1), tau 360 min, SD 0.04 mg/dL/min) seeded by the simulation seed.

## First-pass T1D-UOM comparison

Reference T1D-UOM: mean 146.46 mg/dL, SD 56.23, CV 38.39%, TIR 76.38%, TBR<70 2.06%, TBR<54 0.276%, TAR>180 21.57%, TAR>250 5.94%; autocorrelation r30 0.863, r60 0.634, r120 0.247, r240 -0.012.

Approximate sensitivity-analysis result for this experimental configuration (nominal dosing, generated population): mean 147.85, SD 56.15, CV 37.98%, TIR 74.61%, TBR<70 2.74%, TBR<54 0.49%, TAR>180 22.65%, TAR>250 6.65%; autocorrelation r30 0.851, r60 0.508, r120 -0.154, r240 -0.047.

Interpretation: marginal distribution and safety tails become substantially closer to T1D-UOM, and 1 h / 2 h temporal persistence improves materially versus the frozen model (r60 0.345, r120 -0.425), but 2 h autocorrelation remains materially too low. This is therefore a useful direction, not a validated replacement.

## Mechanism ablation (2026-08-19)

Ablation was run against the same nominal generated-patient protocol to identify which structural change is moving the temporal statistics. The important qualitative findings were:

- Slowing mean reversion alone improves r120 only modestly (approximately -0.42 -> -0.35).
- Broadening meal absorption alone does not solve the problem and can slightly worsen r120.
- Broadening the aspart profile is the strongest single deterministic contributor: r60 rises to about 0.42 and r120 to about -0.31, while mean glucose rises strongly.
- Combining slower restore + broader aspart moves r60 to about 0.51 and r120 to about -0.10, but overshoots mean glucose substantially if meal kinetics are not adjusted.
- The current small additive slow metabolic drive contributes only a small amount at SD 0.04 mg/dL/min. Increasing its amplitude can make r120 positive, but then mean/SD/TAR become too high; therefore simply increasing additive noise is rejected as a solution.
- A slowly varying multiplicative insulin-sensitivity state can also make r120 positive at sufficient amplitude, but likewise inflates SD and hyperglycemic tails. This is also rejected as a one-parameter fix.
- A slowly drifting restore set-point has little effect because restore is intentionally weak in this branch.

Conclusion: the residual 2-hour mismatch is not explained by one coefficient. The frozen model allocates too much variance to fast, regular meal/bolus excursions and too little variance to persistent within-patient metabolic state. The next mechanistic target should redistribute variance from fast oscillatory components into a persistent state while preserving the already-good total SD/CV, rather than merely adding more noise.

## Rules

- Keep `main` as the frozen baseline.
- Do not tune further solely to T1D-UOM.
- Do not increase the additive slow-drive amplitude simply to match r120; that damages marginal distribution and tails.
- Next step is to test this branch unchanged against another independent T1DM CGM dataset before deciding whether to continue this mechanism, and to use that independent dataset to constrain any persistent-state redesign.
