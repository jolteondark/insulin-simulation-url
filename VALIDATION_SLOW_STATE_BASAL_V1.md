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

## Persistent-variance redesign test (2026-08-19)

A second targeted sweep tested the proposed "fast variance -> persistent variance" idea without changing production code. The experiments replaced part of the additive slow drive with either (a) a slowly varying insulin-sensitivity multiplier or (b) a slowly varying restore target/set-point, while varying restore half-life and rapid-insulin width.

Findings:

- Small persistent insulin-sensitivity variation improves r60/r120 only modestly when total SD is kept near the observed range.
- Increasing persistent insulin-sensitivity variation enough to approach positive r120 pushes SD and hyperglycemic tails upward, so it cannot simply be added on top of the existing fast meal/bolus excursions.
- A slow restore-target/set-point state has little leverage when restore is weak; even 5-20 mg/dL target-state SD changes r120 only minimally.
- Making rapid insulin still broader can move r120 toward zero or positive values, but at the cost of severe upward shifts in mean glucose/SD/TAR before the real r120 ~ +0.25 is reached.

Therefore the current evidence supports a redistribution model, not an additive-state model: reduce the amplitude/regularity of fast meal-versus-bolus excursions and use that freed variance budget for a persistent metabolic state. The persistent state should represent a physiological driver (e.g. slowly varying insulin requirement/hepatic drive) rather than unconstrained glucose noise.

## Validation-context confounding test (2026-08-19)

Before adding more physiology, the nominal validation protocol itself was stress-tested. The original model-vs-real comparison used one isolated 24 h model day per virtual patient, initialized exactly at each patient's fasting set-point, with meals fixed at 08:00/13:00/19:00 and fixed nominal carbohydrate amounts. Real outpatient CGM days do not satisfy those conditions.

Targeted context-randomization showed:

- Randomizing meal timing alone by roughly +/-60 to 90 min moved r120 from approximately -0.14 toward 0 to +0.06 without any new physiological state.
- Chaining successive simulated days using the previous day's end glucose as the next day's starting glucose had a much larger effect.
- In an exploratory multi-day run with meal-time SD about 60 min and modest carbohydrate variation, median autocorrelation reached approximately r30 0.898, r60 0.676, r120 0.237, r240 0.080, versus real T1D-UOM r30 0.863, r60 0.634, r120 0.247, r240 -0.012.
- Thus the previously dramatic 2 h autocorrelation mismatch can nearly disappear purely by removing the artificial daily reset and fixed-meal schedule.
- However this exploratory multi-day context currently worsens the marginal/safety distribution (approximately mean 142.6, SD 67.7, TIR 69.0%, TBR<70 7.7%, TBR<54 1.6%, TAR>180 23.3%), so this is not yet a valid replacement simulation protocol.

Interpretation: a major fraction of the apparent temporal-structure failure was likely caused by validation-context mismatch rather than the glucose physiology engine itself. The isolated nominal-day stress test remains useful, but it should not be interpreted as a direct estimate of real-world continuous-CGM autocorrelation. Before introducing additional latent physiology, the primary comparison must be rebuilt as a multi-day simulation with realistic exogenous context (meal timing/intake and previous-day carryover) while separately checking marginal and safety-tail fidelity.

## Fast-to-slow variance budget sweep (2026-08-19)

A targeted sweep then explicitly reduced the amplitude of the deterministic meal/rapid pair while increasing a slow hepatic-like state, with low-glucose attenuation of negative drive to avoid creating artificial severe hypoglycemia. This was an exploratory mechanism test, not a candidate production implementation.

Best compromise found in the coarse sweep reduced fast excursion amplitude by roughly 25% and used a persistent state with tau about 9 h and SD about 0.055 mg/dL/min. Approximate metrics were: mean 145.5 mg/dL, SD 52.2, TIR 77.0%, TBR<70 2.44%, TBR<54 0.33%, TAR>180 20.5%, TAR>250 5.0%, r30 0.859, r60 0.539, r120 -0.096, r240 -0.017.

This is important because marginal distribution and safety tails can remain close to T1D-UOM while r120 improves substantially from the frozen nominal-day value, but r120 still remains negative. Therefore variance redistribution alone is insufficient: at least one additional piece of temporal physiology or context coupling is needed to obtain the observed positive 2 h persistence without damaging the tails.

## Practical design implication

1. Preserve total 24 h SD/CV near the observed real values.
2. Do not optimize r120 from an isolated reset-at-fasting nominal day.
3. Compare real CGM to multi-day simulated trajectories with previous-day carryover.
4. Add realistic meal timing/intake variation as exogenous context, not as new patient physiology.
5. Only if a same-direction residual autocorrelation mismatch remains after context-matched multi-day validation should a new persistent physiological state be added.
6. Require simultaneous improvement of mean, TIR/TBR/TAR, safety tails and r30/r60/r120/r240.
7. Constrain any new state using an independent T1DM dataset before merge.

## Rules

- Keep `main` as the frozen baseline.
- Do not tune further solely to T1D-UOM.
- Do not increase additive slow-drive amplitude simply to match r120; that damages marginal distribution and tails.
- Treat the first isolated nominal-day comparison as a structural stress test, not final temporal validation.
- Next priority is a context-matched multi-day validation protocol and an independent T1DM dataset before any model-level freeze break.
