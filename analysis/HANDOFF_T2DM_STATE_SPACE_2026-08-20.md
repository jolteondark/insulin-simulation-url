# T2DM state-space / distributional validation handoff — 2026-08-20

## Scope
This document is the authoritative handoff for the current T2DM experimental modeling work from the ChatGPT project channel.

Repository: `jolteondark/insulin-simulation-url`

Experimental branch: `v2/state-space-minimal`

Frozen main SHA: `977378875d948c5dd7f1883f42c50186c74079bc`

**Never write experimental changes to main.**

---

# 1. Project objective

The simulator is an educational inpatient insulin-adjustment game / physiology simulator.

Primary evaluation target is **population distribution fidelity**, not individual next-day prediction accuracy.

The intended progression is:
- T1DM
- T2DM
- T1DM + steroid
- T2DM + steroid

Current work is focused on T2DM inpatient physiology and treatment-policy separation.

Core modeling rules:
- Freeze model during distributional validation.
- Add mechanism/noise only when systematic external mismatch demands it.
- Avoid “right result for wrong reason.”
- Separate physiology / treatment policy / environment / outcome.
- Meals/carbohydrate are environment, not permanent patient parameters.
- Treatment is an input/policy, not intrinsic physiology.
- Previous doctor's prescription must be generated from observable information only.
- `suggestOrder()` is an oracle/debug reference because it sees hidden SI/beta/hepatic IR. Do **not** use it as actual previous-doctor treatment policy.
- Shanghai is development/calibration, **not final external validation**.
- Generic Gaussian glucose noise is OFF.
- Large generic day-level SI noise is rejected.
- Insulin doses remain integer-only because ward workflow requires integer orders.

---

# 2. Shanghai anchor / freeze

Primary source:
Zhao et al., Scientific Data 2023, ShanghaiT1DM / ShanghaiT2DM datasets.

Shanghai T2DM static anchor approximately:
- age 60.17 ± 13.71 y
- BMI 24.12 ± 3.26
- duration 8.71 ± 8.45 y
- FPG ~167.8 mg/dL
- fasting C-peptide ~0.476 nmol/L
- eGFR ~115.8
- HbA1c ~75.9 mmol/mol

Strict Shanghai basal + Regular subset:
- 17 days / effectively 4 sessions (2021, 2025, 2035, 2074)
- day mean ~134.8 ± 31.2
- preB ~122.8
- preL ~135.1
- preD ~124.9
- TBR ~0.50%
- TIR ~81.58%
- TAR ~17.92%
- breakfast Δ120 ~16.8 mg/dL
- breakfast Regular ~11.1 U
- total TDD ~39.3 U

Important freeze decision:
- **Do not alter the Shanghai Regular kernel mean/timing globally.**
- Breakfast Δ120 already matches observed strict Shanghai subset reasonably well.

Freeze decision file:
`analysis/shanghai_strict_basal_regular/freeze_decision_2026-08-20.md`

Freeze commit:
`dfa9a3e6c54cd032087ca95987f552073a9d7afc`

Rejected historically:
- wider equilibrium variance to force SD
- generic bolus mismatch >10%
- large day-level SI variation
- global slower bolus kernel
- Regular-specific potency change without evidence
- generic Gaussian glucose noise
- meal-response latent noise
- inflating carbs to force observed dose
- scaling insulin potency solely to match TDD
- arbitrary morning insulin resistance
- changing basal equation to force fit

---

# 3. Current T2DM phenotype generator — V3

Main file:
`t2dm_patient_phenotype_v3_inpatient_mix_exp.js`

Current version:
`0.3-static-cohort-support-refactor-exp-2026-08-20`

The generator now has **6 phenotype archetypes**:

1. `shanghai_anchor`
2. `obesity_ir`
3. `moderate_ckd`
4. `elderly_ckd`
5. `chronic_hyperglycemia`
6. `beta_failure_long_duration`

Current support weights are **not prevalence estimates**:
```js
{
  shanghai_anchor: .25,
  obesity_ir: .20,
  moderate_ckd: .15,
  elderly_ckd: .10,
  chronic_hyperglycemia: .20,
  beta_failure_long_duration: .10
}
```

Presets include:
- `support_sweep`
- `japan_inpatient_sensitivity`
- `us_obese_inpatient_sensitivity`

Important conceptual correction already made:
- High HbA1c / poor control is **not automatically beta-cell failure**.
- Japanese inpatient CGM data suggested HbA1c ≥10% patients can be younger, shorter-duration, somewhat heavier, more insulin resistant, with preserved/higher C-peptide.
- Therefore `chronic_hyperglycemia` and `beta_failure_long_duration` were separated.

Approximate independent static reconstruction after refactor:

| phenotype | age | BMI | duration | eGFR | C-peptide | SI |
|---|---:|---:|---:|---:|---:|---:|
| Shanghai | 60.2 | 24.1 | 8.5 | 117 | 0.48 | 1.02 |
| obesity IR | 56.3 | 33.9 | 8.5 | 117 | 0.58 | 0.52 |
| moderate CKD | 62.7 | 25.7 | 11.2 | 75 | 0.48 | 0.96 |
| elderly CKD | 75.8 | 25.4 | 19.3 | 42 | 0.42 | 0.92 |
| poor-control IR | 54.5 | 26.8 | 6.8 | 92 | 0.57 | 0.76 |
| long-duration beta failure | 63.7 | 24.7 | 22.3 | 117 | 0.29 | 0.96 |

Relevant commits:
- `0a539e3a1f916140509bcb7c6487fa37012f4a3e` — 6 phenotype refactor
- `29bf2d2661838c14998d60226aa6167e5a694bcb` — static audit update
- `f8d3fa91ed0f8de39eff0e7a273236ef265ff32c` — phenotype decision record

Interpretation:
- V3 is a **support generator**, not yet a validated national inpatient T2DM population prevalence model.
- Do not tune mixture weights to glucose outcomes.
- US obese preset exists for Emory sensitivity; Japanese game population should not default to Emory-like obesity prevalence.

---

# 4. Treatment policy separation

File:
`t2dm_treatment_policy_weight_bg_exp.js`

Current treatment policy is observable-data only.

Starting dose uses:
- weight
- age
- eGFR
- admission BG
- optional known home TDD

It never uses hidden:
- SI
- beta-cell reserve
- hepatic IR

Important eGFR bug fixed:
- previous condition reduced dose only for eGFR 30–60 and accidentally returned severe CKD <30 to normal starting dose.
- now high-risk renal dosing applies consistently for eGFR ≤60.

Component-specific titration is preferred over whole-TDD proportional titration:
- pre-breakfast → basal
- pre-lunch → breakfast bolus
- pre-dinner → lunch bolus
- bedtime → dinner bolus

Whole-order proportional titration caused unrealistic oscillatory TDD behavior.

Relevant commits:
- `b3680a67f6e4493421fff36dc8425844a2fe4a72` — component-specific titration
- `1e1147e0a21371d91e280e6d12bf794cb7666460` — eGFR dose bug fix
- `502f80ee49ddcfc796a90322668be834f0b79e69` — eGFR regression test

Published protocol bedtime correction was also added:
`emoryBedtimeCorrection(bg)`

Usual bedtime glulisine table encoded:
- ≤220 → 0 U
- 221–260 → 2 U
- 261–300 → 3 U
- 301–350 → 4 U
- 351–400 → 5 U
- >400 → 6 U

This is a real protocol input, not a fitted physiology parameter.

---

# 5. Inpatient time-course / stress trajectories

Files:
- `t2dm_inpatient_state_v1_exp.js`
- `t2dm_inpatient_dynamic_v1_exp.js`
- `t2dm_inpatient_course_v1_exp.js`
- `t2dm_inpatient_trajectory_v1_exp.js`

Current trajectory classes:
- persistent inflammatory
- resolving acute
- moderate stable

Approximate 8-day stress profiles:
- persistent: ~0.78 → ~0.47
- resolving: ~0.70 → 0
- stable: ~0.38 → ~0.15

Purpose:
- avoid unrealistic universal identical stress decay.
- represent admission decompensation / infection persistence / resolution heterogeneity.

Emory infection admissions were ~41% and median LOS ~7.5 d, making heterogeneous stress trajectories more plausible than one universal decay.

Stress heterogeneity improved temporal variability but did **not** explain the major nocturnal hypoglycemia residual.

---

# 6. Emory external benchmark

Galindo et al., Diabetes Care 2020, noncritically ill hospitalized T2DM on basal-bolus insulin with CGM.

Key cohort characteristics:
- age ~54.5 y
- BMI ~33.8
- diabetes duration ~11.5 y
- HbA1c ~10.2%
- infection admissions ~41%
- excluded steroid-treated patients
- excluded severe kidney/liver/pancreatic disease

Important consequence:
- Do not use severe CKD to repair pooled Emory mismatch.
- Do not use steroid to repair Emory mismatch.

External reference metrics:
- mean 176.1 mg/dL
- TIR 53.5%
- TAR >180 42.2%
- TAR >250 16.1%
- TBR <70 4.5%
- TBR <54 1.58%
- CV ~32%
- any <70: 56%
- any <54: 36%
- nocturnal <70: 41%
- nocturnal <54: 26%

**Nocturnal window is 22:00–06:00.**
A previous audit mistakenly used 00:00–06:00 and substantially underestimated nocturnal events. This is fixed.

---

# 7. Prandial PK

Emory used rapid glulisine, while Shanghai strict anchor involves Regular insulin.

Rapid-insulin prior module:
`insulin_prandial_pk_prior_ranges_exp.js`

Current glulisine candidate is literature-informed, faster than Regular.

Key previous result:
- glulisine time-shape can explain a meaningful portion of CV / hypoglycemia variability.
- it cannot by itself explain the high-side mean/TAR residual.
- do not select a PK row by best Emory fit.

Current simulated hypoglycemia without counterregulation replacement remains heavily concentrated in afternoon/postprandial periods, especially ~14–17h.

---

# 8. Basal potency problem and fix

Major bug found:
- legacy basal dose effect was ~100–200× weaker than bolus effect on an integrated per-unit basis.
- changing basal 0.8× → 1.6× barely moved mean glucose.

An optional unit-consistency-derived basal potency prior was introduced.

Full-strength 1.0 was rejected because it damaged Shanghai TBR/TIR.

A pre-specified admissibility sweep used only:
- mechanistic responsiveness
- Shanghai preservation

**Emory outcomes were explicitly not used to choose the value.**

Weakest admissible candidate:
- relative potency = **0.20**
- derived gain = **12.06 mg/dL-equivalent/U/day at SI=1**

Large-N confirmation:
- basal 0.8→1.2 mean shift ~5.03 mg/dL
- Shanghai mean +0.75 mg/dL
- Shanghai TBR +0.25 pp
- Shanghai TIR −0.76 pp
- preB/L/D +0.75 mg/dL each
- breakfast Δ120 unchanged

Frozen commit:
`839f9091f71584c204bee551500af8079bec624f`

Guardrail:
- **Do not increase 0.20 based on Emory.**

Emory re-validation with frozen 0.20:
- mean ~197.3
- TIR ~49.7%
- TAR ~49.1%
- >250 ~20.4%
- TBR<70 ~1.20%
- TBR<54 ~0.52%
- CV ~28.4%
- nocturnal<54 ~4.2%

Thus basal potency scale was a real structural bug, but fixing it did not solve nocturnal hypoglycemia.

---

# 9. Glargine time-profile sensitivity

File:
`insulin_basal_time_profile_prior_exp.js`

Tested U100/U300 time-profile shapes with zero-area redistribution:
- total 24h basal action is preserved
- only timing is redistributed
- amplitudes 0.10 / 0.20 / 0.30

All tested profiles passed Shanghai preservation.

Results (Emory-like):
- flat: noct<54 ~4.2%, 00–06 <54 ~0.1%
- U100 a=.10/.20/.30: noct<54 ~4.5/4.4/4.8%, 00–06 <54 ~0.1%
- U300 a=.10/.20/.30: noct<54 ~4.6/4.9/4.8%, 00–06 <54 ~0.1%

Conclusion:
- **Glargine time-profile shape alone does not explain the nocturnal deficit.**
- Do not increase amplitude to chase Emory.

---

# 10. Bedtime correction result

Published bedtime correction was missing and has now been implemented causally from the same-day bedtime glucose.

Exposure in external simulation:
- correction on ~37.5% patient-days
- ~80.9% patients ever corrected
- mean ~3.62 U when given

Effect:
- mean ~197.6 → 194.6
- TAR>250 ~20.5 → 18.7%
- TIR ~49.4 → 50.4%
- nocturnal<54 ~4.2 → 4.2%
- first nocturnal <54 at 00–06 remained 0%

Conclusion:
- bedtime correction is a necessary missing treatment input.
- it improves hyperglycemia.
- it does **not** explain the missing true post-midnight hypoglycemia.

---

# 11. Low-side homeostasis ablation

Legacy restore term is essentially:
`restore = -restore_gain * (G - equilibrium)`

At low glucose it creates a very strong automatic upward pull toward the setpoint.

Diagnostic-only ablation attenuated this restore only during 22:00–07:00 and G<80.

Results:

| low-side restore multiplier | noct<54 | 00–06 <54 |
|---:|---:|---:|
| 1.00 | 4.2% | 0.1% |
| 0.75 | 4.3% | 0.3% |
| 0.50 | 5.2% | 1.3% |
| 0.25 | 6.8% | 2.3% |
| 0.00 | 9.3% | 5.8% |

Interpretation:
- generic low-side restore **does suppress nocturnal lows materially**.
- but removing it entirely still does not reproduce all Emory nocturnal incidence.
- multiplier sweep is an ablation only; do not choose a multiplier by Emory closeness.

Relevant commit:
`4dd05b7ebdc53c4e606746ec4eb8f81d3de88241`

---

# 12. Thresholded counterregulation v1 — latest important finding

File:
`t2dm_counterregulation_v1_exp.js`

Concept:
- Below 80 mg/dL, remove the generic setpoint tether.
- Replace it with explicit threshold-triggered counterregulatory drive.
- Awake threshold = 60 mg/dL.
- Sleep threshold = 50 mg/dL.
- These thresholds are literature-derived approximations from clamp physiology (~3.3 mmol/L awake and ~2.7 mmol/L asleep).
- Gain reuses the already-frozen `restore_gain`; no Emory output selects the gain.

Optional reserve parameter exists for impaired counterregulation.

The current sensitivity arm applies reserve 0.55 only to `beta_failure_long_duration`.

Latest formal audit result:

| arm | Shanghai gate | mean | TBR<70 | TBR<54 | CV | noct<70 | noct<54 | 00–06 <70 | 00–06 <54 | patients <20 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| legacy | PASS | 194.6 | 1.21% | 0.53% | 28.0% | 11.0% | 4.4% | 0.4% | 0.1% | 8.6% |
| thresholded preserved | PASS | 191.4 | 5.22% | 4.01% | 32.5% | 38.0% | 33.0% | 24.0% | 19.6% | 33.4% |
| thresholded beta-failure reserve=.55 | PASS | 191.2 | 5.28% | 4.10% | 32.7% | 38.3% | 33.3% | 24.2% | 20.1% | 33.7% |

External reference for comparison:
- TBR<70 4.5%
- TBR<54 1.58%
- CV 32%
- noct<70 41%
- noct<54 26%

Interpretation:
- **This is the first mechanism that reproduces the correct direction and magnitude of nocturnal temporal variability.**
- It passes Shanghai preservation.
- But it causes implausibly severe lows: ~33% of simulated patients fall below 20 mg/dL.
- Therefore V1 is **NOT acceptable as final physiology**.
- Do not weaken it merely to fit Emory incidence.
- The current likely missing layer is **post-hypoglycemia rescue treatment / behavior**, and possibly more realistic saturation of counterregulation.

The very high legacy `<20` rate (~8.6%) also shows the simulator already lacks realistic rescue handling even before counterreg replacement.

Audit script:
`scripts/audit_counterregulation_v1.js`

Workflow:
`.github/workflows/counterregulation-v1-audit.yml`

Bug fixed during audit:
- `Math.min(...largeArray)` caused stack overflow.
- replaced by iterative `minOf()`.

Latest fix commit:
`0dd99118708a7d750e5ae06551b00c9c73387496`

---

# 13. Current strongest interpretation

The major residual is no longer best described as “missing variance noise.”

What has been learned:

1. **Patient support was initially too narrow** → improved with 6-phenotype V3.
2. **Oracle treatment policy hid phenotype difficulty** → fixed with physiology-blind observable policy.
3. **Whole-TDD titration caused unrealistic oscillation** → replaced by component-specific titration.
4. **Universal stress decay was unrealistic** → heterogeneous illness trajectories added.
5. **Rapid glulisine PK matters for CV/hypoglycemia** but does not explain high-side mean/TAR alone.
6. **Basal potency was structurally far too weak** → fixed with Shanghai-preserving frozen 0.20 prior.
7. **Bedtime correction was a real missing treatment input** → added, improves high-side glucose but not post-midnight lows.
8. **Glargine timing profile alone is insufficient.**
9. **Generic low-side setpoint restore is too protective** and suppresses true hypoglycemia dynamics.
10. **Thresholded counterregulation produces the right temporal distribution** but exposes another missing layer: rescue after hypoglycemia.

Thus the current model mismatch is increasingly explained by **missing causal treatment/physiology layers**, not random noise.

---

# 14. Immediate next steps — ordered

## NEXT 1 — implement inpatient hypoglycemia rescue layer
Do this before adjusting counterregulation strength.

Design principle:
- Rescue is a **treatment/environment response**, not physiology.
- Trigger should use observed current glucose only.
- It must be causal and occur after the low is detected.
- Do not fit rescue dose/timing to Emory event rates.
- Use published inpatient hypoglycemia protocols / guideline-concordant rescue ranges.
- Explicitly record rescue event, carbohydrate/dextrose amount, recheck timing, and whether subsequent insulin order is reduced.

Need at least two levels:
1. immediate rescue of current low
2. subsequent treatment-policy response (dose reduction after hypoglycemia)

Primary test:
- thresholded counterregulation + rescue should reduce `<20` events sharply while preserving realistic nocturnal <70/<54 incidence and CV.

## NEXT 2 — separate event incidence from duration/severity
Emory reports patient incidence. Current thresholded model may be producing too-long low episodes rather than simply too many patients.

Audit:
- number of low episodes per patient
- duration <70 / <54
- nadir distribution
- first-event clock
- recovery time after <70 and <54

## NEXT 3 — counterregulatory reserve as a patient parameter
Do not use one fixed reserve for all T2DM.

Potential mechanistic correlates:
- long diabetes duration
- beta-cell failure / low C-peptide
- recurrent antecedent hypoglycemia
- age/frailty
- renal impairment only if separately justified

But parameterization must come from independent physiology literature / cohort evidence, not Emory fit.

## NEXT 4 — re-run Emory with rescue + thresholded counterregulation
Keep fixed:
- phenotype preset
- glulisine prior
- basal potency 0.20
- bedtime correction table
- stress trajectories
- component-specific titration
- no steroid
- renal modifier OFF for Emory

Compare:
- mean
- TIR
- TAR / >250
- TBR<70 / <54
- CV
- any <70 / <54
- nocturnal <70 / <54 using 22:00–06:00
- 00–06 first-event incidence
- nadir distribution
- episode duration

## NEXT 5 — do not touch renal modifier yet
Renal modifier remains experimental/standard OFF.
Emory excluded severe renal disease, so pooled Emory cannot validate renal physiology.

---

# 15. Things explicitly NOT to do next

Do **not**:
- increase basal potency above frozen 0.20 because Emory nocturnal hypoglycemia is low
- alter Shanghai Regular kernel to improve Emory
- tune glulisine PK to match nocturnal incidence
- choose a counterregulation threshold by Emory closeness
- choose a low-side restore multiplier by Emory closeness
- change phenotype weights from glucose outcomes
- add generic Gaussian glucose noise
- add large generic SI noise
- use steroid to fix Emory
- use severe CKD to fix Emory
- use `suggestOrder()` as real previous-doctor policy
- write any of this to main

---

# 16. Key files to read first in a new channel/session

In this order:

1. `analysis/HANDOFF_T2DM_STATE_SPACE_2026-08-20.md`  ← this file
2. `t2dm_patient_phenotype_v3_inpatient_mix_exp.js`
3. `t2dm_treatment_policy_weight_bg_exp.js`
4. `t2dm_inpatient_dynamic_v1_exp.js`
5. `t2dm_inpatient_course_v1_exp.js`
6. `t2dm_inpatient_trajectory_v1_exp.js`
7. `insulin_basal_potency_prior_exp.js`
8. `insulin_basal_time_profile_prior_exp.js`
9. `t2dm_counterregulation_v1_exp.js`
10. `scripts/audit_counterregulation_v1.js`
11. `scripts/audit_low_side_homeostasis_ablation.js`
12. `scripts/audit_glargine_time_profile_sensitivity.js`
13. `analysis/shanghai_strict_basal_regular/freeze_decision_2026-08-20.md`

---

# 17. Minimal continuation instruction

If continuing autonomously from this handoff:

**Do not modify main. Stay on `v2/state-space-minimal`. Implement a causal inpatient hypoglycemia rescue-treatment layer first, using external guideline/protocol evidence rather than Emory fitting. Then re-run thresholded counterregulation with episode-duration/nadir metrics. Reject any version that produces implausible severe lows even if pooled Emory metrics look better.**
