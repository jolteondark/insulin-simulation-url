# T1DM distributional validation — run 18 handoff (2026-08-23)

Read `VALIDATION_RUN17_HANDOFF_20260819.md` first for the full history through independent AZT1D replication and the earlier mechanism screens.

## What changed in this run

A new local, validation-only daytime phase-lock discrimination screen was executed. GitHub Actions was not used.

New artifacts:
- `validation/scripts/daytime_phase_lock_screen.js` — standalone Node runner
- `validation/results/daytime_phase_lock_screen_20260823.md` — protocol, full screening tables, interpretation and next-step decision

Production files remain unchanged:
- `engine.js` blob `a0b2d51c071f404fbfd79142be910fd28608d9bd`
- `patient_generator.js` blob `1cea478a112bc6eca719e4df1ecc7aac9984e0ab`

## Main new result

The previous hypothesis “meal variability may reduce artificial daytime phase locking” was refined.

### 1. Rapid-action broadening + independent meal error is not enough

Exploratory N=40, 8-day screen across aspart peak 110/120/130 min, duration 330/360/390 min and independent per-meal carbohydrate mismatch ±5/10/15%:

- frozen reference in this protocol: daytime ACF RMSE 0.345, r120 -0.519, TBR<70 0.58%
- least harmful mild region (~110/390 + ±5%): RMSE 0.328, r120 -0.487, TBR<70 2.35%
- best RMSE region (~110/390 + ±15%): RMSE 0.274, r120 -0.393, TBR<70 5.13%
- larger peak shifts 120–130 min increase mean/TAR but drive CV and TBR up substantially before r120 becomes realistic

Therefore this mechanism family does not provide a safe route to the AZT1D daytime structure.

### 2. Temporal structure of variability matters

A second screen compared the same carbohydrate variance arranged either as:
- independent meal-level perturbations, or
- one shared multiplier across all three meals of the same day.

Shared day-level variability improved r60/r120 much more efficiently than independent meal noise.

Examples with frozen rapid profile 105/300:
- independent ±20%: r120 -0.341, RMSE 0.240, TBR<70 5.34%
- shared ±20%: r120 -0.223, RMSE 0.184, TBR<70 6.63%

At low amplitude:
- shared ±5%: r120 -0.491, RMSE 0.328, TBR<70 1.75%

This is an important structural clue: the missing variability appears to need **within-patient persistence across meals / hours**, not simply independent noise.

But large shared carbohydrate mismatch is still unsafe and still leaves r120 negative. It is therefore evidence for a latent slow state, not a recommendation to add large carb noise.

## Current model interpretation

The daytime defect is now better described as:

- repeated deterministic meal/bolus balance creates excessive phase locking;
- realistic unmodelled variation likely contains a coherent slow component across a day;
- independent meal noise is inefficient;
- large multiplicative carb error can force ACF improvement only by worsening hypoglycemia/variability;
- aggressive rapid-profile broadening also worsens tails before solving r120.

The overnight defect remains separate: the frozen model is still far too deterministic overnight. No overnight model change was made in this run.

## Production decision

**No production model change. Keep main frozen.**

The new result is a mechanism-discrimination result, not a successful tuning result.

## Highest-priority next experiment

Test a bounded latent patient-day insulin-demand / insulin-sensitivity state rather than more meal noise.

Recommended first screen:
- frozen rapid profile first
- effective insulin-action modulation around ±3%, ±5%, ±7.5%, ±10%
- persistence across 1–3 days (AR/OU-like day-level state), zero long-run mean
- same state shared across meals within a day
- evaluate daytime and overnight ACF separately
- also mean, CV, TIR, TBR<70/<54, TAR>180/>250 and 4-point glucose distributions
- only combine with mild 110/390 rapid broadening if the latent-state mechanism shows a Pareto improvement without hypoglycemia-tail damage

Acceptance principle: temporal realism must improve materially without obtaining that improvement mainly by making the simulated cohort more unstable or hypoglycemic.