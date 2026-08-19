# Validation context correction — frozen baseline rerun

Date: 2026-08-19

A correction to the earlier exploratory context-confounding interpretation is required.

The earlier near-match of r120 (~0.237 vs T1D-UOM 0.247) was obtained in the experimental physiology branch, not in the untouched frozen baseline. It therefore cannot be used to claim that validation context alone explains the temporal mismatch.

A rerun using the frozen baseline engine (restore half-life 300 min, aspart peak 105 min/duration 300 min, original meal kinetics, no added slow state), with the UI safety rejection removed as before, showed:

- isolated fixed nominal days: r30 ~0.784, r60 ~0.345, r120 ~-0.386, r240 ~-0.138
- multi-day carryover, fixed meals: r30 ~0.801, r60 ~0.395, r120 ~-0.286, r240 ~-0.128
- multi-day carryover + meal-time SD ~30 min + carb CV ~5%: r30 ~0.802, r60 ~0.398, r120 ~-0.261, r240 ~-0.104
- multi-day carryover + meal-time SD ~60 min + carb CV ~10-15%: r30 ~0.805, r60 ~0.417, r120 ~-0.19, r240 ~-0.11

Reference T1D-UOM medians remain r30 0.863, r60 0.634, r120 0.247, r240 -0.012.

Interpretation:

1. Daily reset/fixed-meal validation conditions do exaggerate the temporal mismatch. Realistic exogenous context improves r60/r120 materially even with the frozen engine.
2. However context correction alone is insufficient. The untouched engine still has materially too little 1-2 h persistence, especially r120, which remains negative.
3. Therefore the correct conclusion is mixed: part validation-protocol artifact, part residual model time-structure deficiency.
4. The previous statement that the 2 h mismatch could nearly disappear purely by removing reset/fixed meals was too strong and should not be used as evidence.
5. Main remains frozen. The experimental slow-state/basal branch remains exploratory only.

Next decision rule: build the primary multi-day validation protocol first, then quantify the residual mismatch on the frozen model and on the experimental branch side-by-side. Only the residual after context matching is a candidate target for physiology changes.