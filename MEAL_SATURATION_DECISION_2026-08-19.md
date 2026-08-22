# Meal-size saturation decision — 2026-08-19

Focused N=120 validation with patient-specific meal t50/fast fraction retained, rapid scale 0.80, bolus lead 0 min, decoupled meal gain fixed at 5.0 mg/dL/g at 70 kg, finite-memory state unchanged. Tested early carbohydrate caps 40/50/60/70 g and no saturation.

UOM reference:
- mean 146.463 mg/dL
- SD 56.225 mg/dL
- median ACF 30/60/120/240 = 0.863 / 0.634 / 0.247 / -0.012
- four-check means 121.5 / 149.1 / 153.2 / 154.1
- any <70 7.68%, any >180 53.77%, all four TIR 43.31%

Results:

| early cap | mean | SD | ACF30 | ACF60 | ACF120 | ACF240 | four-check RMSE | any <70 | any >180 | all-four TIR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|40 g|153.07|62.09|0.895|0.683|0.338|0.257|17.50|19.44%|46.94%|35.14%|
|50 g|153.71|63.92|0.882|0.645|0.265|0.215|18.49|20.83%|48.47%|32.50%|
|60 g|154.21|65.45|0.873|0.621|0.225|0.185|19.58|21.11%|49.72%|31.25%|
|70 g|154.30|66.23|0.868|0.609|0.205|0.184|19.44|21.67%|48.89%|31.53%|
|none|154.30|66.23|0.868|0.609|0.205|0.184|19.44|21.67%|48.89%|31.53%|

Because the largest modeled meal is 70 g, cap=70 g is mathematically identical to no saturation. The monotonic pattern is important: relaxing saturation consistently improves the temporal ACF fingerprint toward UOM, especially at 30–120 min. Stronger saturation improves the four-check RMSE slightly, but only by worsening temporal persistence and it does not solve the joint four-check phenotype or excess hypoglycemia.

Decision:
1. Do not add meal-size early saturation to the core physiology model at this stage.
2. Retain patient-specific meal kinetics.
3. Retain ICR / meal glucose-gain decoupling as the structural correction.
4. Keep rapid scale 0.80 as independently supported by isolated bolus validation.
5. Fat-dependent delay remains optional only when measured meal composition exists; do not fabricate fat in the ward/game context.
6. The remaining mismatch is no longer best attacked through meal-size appearance saturation. The next diagnostic target should be why the model has excessive low checks and the wrong clock-time four-check pattern despite acceptable short-lag ACF when saturation is removed.

Notably, no-saturation ACF30/60/120 = 0.868/0.609/0.205 is already close to UOM 0.863/0.634/0.247, whereas ACF240 remains too positive (0.184 vs -0.012). This suggests the next temporal issue is the long tail / inter-meal or state persistence around 4 h, not insufficient meal-size delay.

Main branch remains untouched.
