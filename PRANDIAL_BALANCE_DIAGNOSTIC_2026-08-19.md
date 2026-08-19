# Prandial meal vs bolus balance diagnostic — 2026-08-19

Branch-only validation; main untouched.

Protocol:
- N=300 generated T1DM patients, no generator safety gate
- patient-specific meal kinetics retained
- decoupled meal glucose gain = 5.0 mg/dL/g at 70 kg with weight scaling
- rapid insulin kernel time-scale 0.80
- fast_scale 0.80
- v2 ICR used for dose, legacy CF used to calibrate insulin gain, obesity action multiplier applied in engine
- isolated meal and bolus contributions propagated through the same restoration term
- evaluated at +60/+120/+180/+240 min

Median insulin-fall / meal-rise ratio:
- +60: 0.288 (0% >1)
- +120: 0.834 (22.2% >1)
- +180: 1.125 (72.7% >1)
- +240: 1.157 (75.2% >1)

Median net isolated contribution (meal rise + bolus fall):
- +60: +93.0 mg/dL
- +120: +25.2 mg/dL
- +180: -20.1 mg/dL
- +240: -24.4 mg/dL

Nominal total bolus/meal amplitude ratio median = 0.721 (p10 0.582, p90 0.931), so the problem is not simple total insulin excess. Instead, the balance reverses over time: meal appearance dominates early, while insulin action dominates by 180–240 min.

Structural identity:
`v2_icr ~= legacy_icr * obesity_action`, while bolus action is also multiplied by `obesity_action`. Ignoring dose rounding, these approximately cancel. Therefore effective prandial strength is driven mainly by legacy CF / legacy ICR relative to the independent meal gain, not by an additional obesity double-count.

Correlations of +240 fall/rise ratio were modest: legacy CF +0.17, legacy ICR -0.26, v2 ICR -0.19, obesity action +0.26, weight -0.27; meal t50/fast fraction correlations were near zero. There is no single obvious patient parameter causing the late dominance.

Interpretation:
1. Do not simply weaken all bolus action; the prior 0.8 bolus ablation fixed hypoglycemia but raised mean glucose excessively.
2. The key residual is temporal: insulin action remains too dominant relative to meal appearance at 180–240 min.
3. Because rapid_scale=0.80 was selected from isolated-bolus response normalized to 240 min, that earlier validation did not strongly constrain the *late tail shape* beyond 120 min.
4. Next validation should extend UOM isolated-bolus response to 180/240/300/360 min and compare late-tail shape, before changing meal physiology again.
