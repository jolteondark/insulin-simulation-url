# T2DM state-space / external validation handoff — 2026-08-20

This file is the handoff for **this channel only**. It is intended to let a new ChatGPT channel continue without rereading the conversation.

## 0. Non-negotiable repo rules

- Repository: `jolteondark/insulin-simulation-url`
- Frozen main SHA: `977378875d948c5dd7f1883f42c50186c74079bc`
- Experimental branch: `v2/state-space-minimal`
- **Never write to `main` / default branch.**
- Current modeling objective: **population distribution fidelity**, not individual next-day prediction accuracy.
- Integer insulin orders are intentional because the ward workflow uses integer units.

## 1. Modeling principles currently in force

- Freeze the Shanghai-anchored core during external validation.
- Add mechanisms only when a systematic mismatch demands them.
- Avoid “right result for wrong reason.”
- Separate:
  - intrinsic physiology,
  - treatment policy,
  - environment / inpatient state,
  - outcome.
- Meals are environment, not permanent patient parameters.
- Previous-doctor orders are treatment-policy inputs, not intrinsic physiology.
- `suggestOrder(p, meals)` sees hidden SI/beta/hepatic IR and is an **oracle**. It may remain as a physiology-balanced debug/reference but **must not be used as the actual ward prescription policy**.
- Generic Gaussian glucose noise remains OFF.
- Large generic day-level SI variation was rejected.
- Steroids are OFF for Emory because Emory excluded steroid-treated patients.
- Renal physiology remains experimental / default OFF unless a renal-specific validation supports it.

## 2. T2DM V3 patient generator

Primary file:

- `t2dm_patient_phenotype_v3_inpatient_mix_exp.js`

Current V3 is a **6-phenotype support generator**, not a prevalence-calibrated national inpatient population.

### 6 phenotype classes

1. `shanghai_anchor`
2. `obesity_ir`
3. `moderate_ckd`
4. `elderly_ckd`
5. `chronic_hyperglycemia` = poor-control / IR phenotype
6. `beta_failure_long_duration`

The important refactor was separating high-HbA1c poor-control IR from long-duration beta-cell failure. Japanese inpatient CGM data suggested HbA1c>=10% patients can be younger, shorter-duration, higher-BMI, more insulin resistant and with higher C-peptide, so the old “high HbA1c = beta failure” assumption was wrong.

Current rough static means from reconstruction/audits:

| phenotype | age | BMI | duration y | eGFR | C-peptide | SI |
|---|---:|---:|---:|---:|---:|---:|
| Shanghai | 60.2 | 24.1 | 8.5 | 117 | 0.48 | 1.02 |
| obesity IR | 56.3 | 33.9 | 8.5 | 117 | 0.58 | 0.52 |
| moderate CKD | 62.7 | 25.7 | 11.2 | 75 | 0.48 | 0.96 |
| elderly CKD | 75.8 | 25.4 | 19.3 | 42 | 0.42 | 0.92 |
| poor-control IR | 54.5 | 26.8 | 6.8 | 92 | 0.57 | 0.76 |
| beta failure | 63.7 | 24.7 | 22.3 | 117 | 0.29 | 0.96 |

Current support/preset philosophy:

- `SUPPORT_WEIGHTS` are **not prevalence estimates**.
- region/cohort presets are for static phenotype support/sensitivity, not for fitting glucose outcomes.
- `us_obese_inpatient_sensitivity` exists to resemble US obese inpatient cohorts such as Emory/RABBIT in static phenotype support.
- Do not tune mixture weights to Emory glucose outcomes.

Notable generator refactor commits from this channel:

- `0a539e3a1f916140509bcb7c6487fa37012f4a3e` — 6-phenotype refactor
- `29bf2d2661838c14998d60226aa6167e5a694bcb` — static audit update
- `f8d3fa91ed0f8de39eff0e7a273236ef265ff32c` — interpretation/decision memo

## 3. Treatment policy separation

File:

- `t2dm_treatment_policy_weight_bg_exp.js`

Policy is observable-data only:

- weight
- age
- eGFR
- admission glucose
- optional home TDD

Hidden SI, beta reserve and hepatic IR are never policy inputs.

### Starting order

- typical 0.4 U/kg if admission BG <=200
- 0.5 U/kg if >200
- 0.3 U/kg for age>70 or eGFR<=60
- split roughly 50% basal / 50% prandial

Important bug fixed in this channel:

- eGFR <30 had previously fallen out of the dose-reduction condition and reverted to usual dosing.
- fixed to `eGFR <=60`.

Commit:

- `1e1147e0a21371d91e280e6d12bf794cb7666460`

### Daily titration

Old whole-TDD proportional titration was rejected as physiologically/clinically too coupled.

Current preferred policy is **component-specific titration**:

- pre-breakfast -> basal
- pre-lunch -> breakfast bolus
- pre-dinner -> lunch bolus
- bedtime -> dinner bolus

This greatly reduced artificial oscillation.

Commit:

- `b3680a67f6e4493421fff36dc8425844a2fe4a72`

Current `componentTitrate` uses roughly:

- BG <70: -2 U
- BG <100: -1 U
- BG >180: +1 U
- BG >250: +2 U

Do not change this simply to fit Emory. Late-course hypoglycemia remains a possible treatment-policy/time-structure issue, but requires separate evidence.

## 4. V3 course behavior

Independent trajectory reconstruction suggested the 6 phenotypes separate naturally under blind policy.

Approx final TDD/kg examples:

- Shanghai ~0.52
- obesity IR ~0.67
- moderate CKD ~0.53
- elderly CKD ~0.47
- poor-control IR ~0.72
- beta-failure long-duration ~0.62

The useful point is that poor-control IR and beta-failure no longer behave as the same “high glucose” patient.

Relevant commits:

- `09f75832d4e04d77d2b74cb5b18efa2e54acc61a` — 6-phenotype trajectory audit
- `8e311904fa82cb58ee891e56bb6b0dca7d79fc62` — independent reconstruction memo

## 5. Inpatient stress trajectory heterogeneity

File:

- `t2dm_inpatient_trajectory_v1_exp.js`

Old problem: every patient had the same stress decay, which produced overly homogeneous recovery and late over-treatment.

Current stress classes include approximately:

- persistent inflammatory: ~0.78 -> 0.47 over 8d
- resolving acute: ~0.70 -> 0
- moderate stable: ~0.38 -> 0.15

This was intended to represent realistic different inpatient courses without adding generic glucose noise.

Relevant commits:

- `700946431a438420737286a005185a1310dd8d72` — trajectory layer
- `3d2793bfa1d28fc6258a544b9949544fc4de66ca` — homogeneous vs heterogeneous comparison
- `927f480db81935e8e1b24dfe01fd6e21b293db73` — prespecified acceptance guardrails

Approx heterogeneous-course external reconstruction before later mechanism changes:

- mean ~194.6
- TIR ~50.9%
- TAR ~47.8%
- >250 ~19.4%
- TBR<70 ~1.28%
- TBR<54 ~0.56%
- CV ~28.6%
- any <70 ~49.8%
- any <54 ~30.3%

Emory targets are below.

## 6. Emory external benchmark

Primary external benchmark:

Galindo et al., Diabetes Care 2020;43(11):2730–2735. Noncritically ill hospitalized T2DM, basal-bolus insulin + blinded CGM.

Static cohort characteristics:

- age 54.5 +/- 11
- BMI 33.8 +/- 9
- diabetes duration 11.5 +/- 9 y
- HbA1c 10.2 +/- 2%
- infection admissions ~41%
- excluded steroid-treated patients
- excluded severe liver/kidney/pancreatic disorders

Important targets:

- mean 176.1 +/- 46.9 mg/dL
- TIR 70–180: 53.5%
- TAR >180: 42.2%
- TAR >250: 16.1%
- TBR <70: 4.5%
- TBR <54: 1.58%
- CV ~32%
- any CGM <70: 56%
- any CGM <54: 36%
- nocturnal <70: 41%
- nocturnal <54: 26%

### Critical correction: nocturnal definition

Emory nocturnal hypoglycemia is **22:00–06:00**, not 00:00–06:00.

Earlier work in this channel mistakenly used 00–06 and dramatically understated simulated nocturnal incidence. After correction, legacy model nocturnal <54 was ~4–5%, not ~0.1%.

Even after correction, the model still has a major nocturnal timing deficit.

## 7. Bedtime correction input

Important missing treatment input was found in the protocol: glulisine bedtime correction.

Current policy exports:

- `emoryBedtimeCorrection(bg)`

Usual table encoded:

- <=220: 0 U
- 221–260: 2 U
- 261–300: 3 U
- 301–350: 4 U
- 351–400: 5 U
- >400: 6 U

This is a protocol input, not a fitted parameter.

Current dynamic supports a causal bedtime correction hook using same-day bedtime glucose.

Relevant commits:

- `eb477b8b065c9555459c045fa92bced9e3272e23` — policy bedtime correction
- `7642bfaef64d09872b369d2f4cd53bb48ea2841c` — dynamic hook
- `0fdc79e4a29deb3719feb289d75f5d4151f49300` — course logging
- `4415e14123eedf996118f6464a1def980488ad35` — validation

Formal result:

| arm | mean | TIR | TAR | >250 | TBR<70 | TBR<54 | CV | noct<70 | noct<54 | first noct<54 00–06 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| frozen basal 0.20 | 197.6 | 49.4% | 49.3% | 20.5% | 1.22% | 0.54% | 28.4% | 11.0% | 4.2% | 0% |
| + bedtime correction | 194.6 | 50.4% | 48.4% | 18.7% | 1.21% | 0.53% | 28.0% | 10.9% | 4.2% | 0% |

Bedtime correction improved high glucose but **did not create post-midnight hypoglycemia**.

Exposure:

- correction on ~37.5% of patient-days
- ~80.9% of patients ever corrected
- mean dose when given ~3.62 U

Do not weaken or strengthen this table to fit outcomes.

## 8. Basal potency discovery and freeze

A major structural bug was identified: old basal insulin effect was ~200x weaker than prandial insulin on an integrated-per-unit basis.

Old model behavior:

- changing basal 0.8x -> 1.6x barely moved mean glucose.
- the simulation was effectively a bolus game.

A unit-consistency-based optional basal potency layer was added and screened **without Emory selection**.

File:

- `insulin_basal_potency_prior_exp.js`

Prespecified coarse sweep:

- 0
- 0.10
- 0.20
- 0.30
- 0.40
- 0.50
- 0.75
- 1.0

Selection rule:

- minimum meaningful basal responsiveness
- preserve Shanghai fingerprint
- choose the **weakest admissible** candidate
- Emory not used for selection

### Frozen candidate

**relative potency = 0.20**

Derived gain:

- ~12.06 mg/dL-equivalent / U / day at SI=1

Large-N confirmation:

- basal 0.8 -> 1.2 mean slope: ~5.03 mg/dL
- Shanghai mean delta +0.75
- Shanghai TBR +0.25 pp
- Shanghai TIR -0.76 pp
- preB/L/D +0.75 each
- breakfast delta120 0.00

All prespecified gates passed.

Freeze commit:

- `839f9091f71584c204bee551500af8079bec624f`

Important guardrail:

- **Do not increase basal potency above 0.20 because Emory has more nocturnal hypoglycemia.**
- 0.20 was frozen before external revalidation.

Formal external comparison after freeze:

| arm | mean | TIR | TAR | >250 | TBR<70 | TBR<54 | CV | any<70 | any<54 | noct<54 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| basal OFF | 195.8 | 50.3% | 48.5% | 19.8% | 1.20% | 0.52% | 28.5% | 48.4% | 28.8% | 4.5% |
| basal 0.20 | 197.3 | 49.7% | 49.1% | 20.4% | 1.20% | 0.52% | 28.4% | 47.3% | 28.5% | 4.2% |

Basal potency fixed the “basal has no effect” bug but **did not explain nocturnal lows**.

## 9. Glargine time-profile sensitivity

Files:

- `insulin_basal_time_profile_prior_exp.js`
- dynamic supports `basal_profile_fn`

Goal: redistribute already-frozen basal action in time with **24h mean multiplier = 1**, i.e. zero-area timing change only.

Sensitivity arms:

- flat
- U100 amplitudes 0.10 / 0.20 / 0.30
- U300 amplitudes 0.10 / 0.20 / 0.30

Important formal result: every arm preserved Shanghai, but **none created post-midnight hypoglycemia**.

Formal table:

| arm | Shanghai gate | Emory-like mean | TBR<54 | CV | noct<70 | noct<54 | 00–06 <54 |
|---|---|---:|---:|---:|---:|---:|---:|
| flat | PASS | 194.4 | 0.51% | 28.0% | 10.6% | 4.2% | 0.1% |
| U100 a=.10 | PASS | 194.2 | 0.53% | 28.1% | 10.8% | 4.5% | 0.1% |
| U100 a=.20 | PASS | 193.9 | 0.53% | 28.3% | 10.8% | 4.4% | 0.1% |
| U100 a=.30 | PASS | 193.8 | 0.53% | 28.4% | 11.1% | 4.8% | 0.1% |
| U300 a=.10 | PASS | 194.1 | 0.54% | 28.2% | 10.7% | 4.6% | 0.1% |
| U300 a=.20 | PASS | 193.8 | 0.55% | 28.4% | 11.1% | 4.9% | 0.1% |
| U300 a=.30 | PASS | 193.5 | 0.57% | 28.6% | 10.9% | 4.8% | 0.1% |

Conclusion:

- glargine time-profile alone is **not the missing mechanism**.
- do not select an amplitude based on Emory.
- keep as sensitivity-only until independent PK/PD amplitude identification.

Relevant commits:

- `3168b98ac20eb6a8864ce881778629e9f9a5f933` — profile prior
- `108da7edb01761d673dd96e6b37ccb02da01b20d` — dynamic hook
- `212f7c1407d3786e51566e058a1d26f31388149c` — sensitivity audit
- `211680c9ab7bd787ccf6707d0fbf349665126215` — correction-function name fix in audit
- `668ec9b39f09047e40bc7b1de40715eb5c9ccbfe` — workflow reorder for time-profile first

## 10. Overnight fasting subsystem experiments

### v1

Attempted to replace generic restore overnight with an explicit fasting balance.

Result: **rejected** by Shanghai.

Shanghai v1 deltas roughly:

- mean +5.59
- preB +15.64
- TIR -3.10 pp
- breakfast delta120 -5.61

This showed that simply removing the old overnight restoring slope lets prior-day hyperglycemia persist too much.

### v2

Slope-matched nonlinear fasting model preserved the old local restoring slope but used endogenous-insulin saturation away from setpoint.

Shanghai gate: **PASS**

Deltas:

- mean +0.49
- TBR<70 +0.17 pp
- TIR -0.37 pp
- preB +1.07
- preL +0.16
- preD ~0
- breakfast delta120 -0.39

But external effect was small / wrong direction:

- mean ~199
- TBR<54 ~0.56%
- noct<54 ~4.7%

Conclusion:

- v2 is a “non-destructive structural alternative” but **does not explain nocturnal hypoglycemia**.
- do not tune its slope to Emory; slope normalization was algebraically tied to old restore_gain.

## 11. Event attribution: where simulated nocturnal lows occur

Formal attribution before thresholded counterregulation:

- noct<70 patients ~10.8%
- noct<54 patients ~4.5%
- first nocturnal <54 in dinner glulisine tail: 100%
- any nocturnal <54 in dinner glulisine tail: 100%
- first <54 at 22–24: 100%
- first <54 at 00–06: 0%

So legacy “nocturnal hypoglycemia” is essentially late dinner-bolus tail, not true post-midnight fasting/basal hypoglycemia.

This is a key diagnostic.

## 12. Low-side homeostasis ablation

Current dynamic has generic restore:

`restore = -restore_gain * (G - equilibrium)`

At low glucose this strongly pushes glucose upward. Example: if equilibrium ~140 and G~70, with restore_gain .006/min this is on the order of +25 mg/dL/h restoring pressure.

A diagnostic-only overnight low-side ablation attenuated this generic restore only when:

- time 22:00–07:00
- glucose <80 mg/dL

Formal results:

| restore multiplier | mean | TBR<70 | TBR<54 | CV | noct<70 | noct<54 | 00–06 <54 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.00 | 194.4 | 1.19% | 0.51% | 28.0% | 10.6% | 4.2% | 0.1% |
| .75 | 194.3 | 1.21% | 0.52% | 28.0% | 10.8% | 4.3% | 0.3% |
| .50 | 194.3 | 1.25% | 0.54% | 28.1% | 11.3% | 5.2% | 1.3% |
| .25 | 194.2 | 1.35% | 0.59% | 28.2% | 12.9% | 6.8% | 2.3% |
| 0.00 | 193.9 | 1.67% | 0.83% | 28.5% | 14.6% | 9.3% | 5.8% |

Interpretation:

- generic restore is clearly suppressing post-midnight lows.
- but even removing it entirely only gets noct<54 ~9.3%, still far below Emory 26%.
- therefore it is a contributor, not the whole explanation.
- do not select a restore multiplier by Emory closeness.

Commits:

- `4dd05b7ebdc53c4e606746ec4eb8f81d3de88241` — low-side ablation script
- `0211c853cbc693767ca2d08c80b682487dcc7c05` — workflow

## 13. Thresholded counterregulation v1 — latest major result

Files:

- `t2dm_counterregulation_v1_exp.js`
- `scripts/audit_counterregulation_v1.js`
- `.github/workflows/counterregulation-v1-audit.yml`

The physiological idea:

- below 80 mg/dL, remove the generic setpoint tether
- replace it with threshold-triggered counterregulatory drive
- awake threshold: ~60 mg/dL
- sleep threshold: ~50 mg/dL
- thresholds were set from clamp/sleep physiology, not Emory
- drive slope reuses frozen `restore_gain`

Important current code constants:

- `AWAKE_THRESHOLD_MG_DL = 60`
- `SLEEP_THRESHOLD_MG_DL = 50`
- `LOW_SIDE_SWITCH_MG_DL = 80`

The candidate also includes a sensitivity arm where only `beta_failure_long_duration` has counterregulatory reserve 0.55.

### First run bug

Initial workflow failed because `Math.min(...hugeArray)` overflowed the JS call stack.

This was fixed by using an iterative `minOf()` helper.

Fix commit:

- `0dd99118708a7d750e5ae06551b00c9c73387496`

### Formal successful result

| arm | Shanghai gate | mean | TBR<70 | TBR<54 | CV | noct<70 | noct<54 | 00–06 <70 | 00–06 <54 | patients <20 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| legacy | PASS | 194.6 | 1.21% | 0.53% | 28.0% | 11.0% | 4.4% | 0.4% | 0.1% | 8.6% |
| thresholded preserved | PASS | 191.4 | 5.22% | 4.01% | 32.5% | 38.0% | 33.0% | 24.0% | 19.6% | 33.4% |
| thresholded beta-failure reserve .55 | PASS | 191.2 | 5.28% | 4.10% | 32.7% | 38.3% | 33.3% | 24.2% | 20.1% | 33.7% |

Emory reference:

- mean 176.1
- TBR<70 4.5%
- TBR<54 1.58%
- CV 32%
- noct<70 41%
- noct<54 26%

### Interpretation

This is the most important current result:

- the thresholded counterregulation structure moves the model **strongly in the correct direction**.
- CV 28.0 -> 32.5%, almost exactly Emory 32%.
- noct<70 11 -> 38%, close to 41%.
- noct<54 4.4 -> 33%, overshoots 26% but is now the right order of magnitude.
- true 00–06 lows finally appear: 00–06 <54 ~19.6%.

BUT:

- ~33% of patients reach <20 mg/dL.
- therefore **counterregulation v1 is NOT acceptable as-is**.
- do not weaken thresholds/reserve merely to fit Emory incidence.
- the correct next question is whether the simulation lacks **post-hypoglycemia rescue treatment / ward intervention**, because real hospitalized patients with severe lows receive treatment and regimen review rather than drifting indefinitely.

This is the immediate frontier.

## 14. Important suspicion: rescue treatment layer is missing

Current dynamic can continue through severe hypoglycemia without a ward rescue intervention.

Real inpatient care generally includes immediate hypoglycemia treatment and subsequent insulin regimen review.

Therefore the extreme <20 tail in thresholded counterregulation may reflect two things at once:

1. removing the unrealistic generic low-side setpoint tether exposed realistic hypoglycemia propensity,
2. but the model then lacks the clinical rescue action that would truncate extreme low tails.

The next implementation should therefore be **treatment/environment**, not a weaker intrinsic counterregulation parameter.

Possible safe architecture:

- dynamic detects glucose <70 and/or <54,
- invoke a `hypoglycemia_rescue_fn` supplied by treatment/environment layer,
- apply a short carbohydrate/dextrose rescue input,
- optionally mark the event and allow next-order reduction through policy,
- do not hardcode Emory event rates.

Do not immediately implement a fitted glucose clamp to 100 mg/dL; that would be outcome-fitting.

First determine a protocol-based ward rescue representation from independent standards/literature.

## 15. Renal modifier status

Earlier this channel added/rewired a renal insulin exposure mechanism.

Important findings:

- direction is plausible: lower eGFR -> more insulin exposure -> lower glucose / more TBR.
- however Emory excluded severe kidney disease, so pooled Emory fit must **not** validate renal physiology.
- default remains OFF pending renal-specific cohort or independent subgroup target.

Also fixed:

- incorrect hook naming / module wiring during audit development,
- treatment policy eGFR<=60 issue.

Do not use renal physiology to repair Emory pooled residuals.

## 16. What has been rejected / must not be reintroduced casually

Rejected or currently disallowed:

- generic Gaussian glucose noise
- large generic daily SI noise
- arbitrary meal variability as a “variance knob”
- direct HbA1c glucose offset
- tune mixture weights to Emory glucose outcomes
- use `suggestOrder()` as actual previous-doctor treatment policy
- increase basal potency above frozen 0.20 because Emory has more nocturnal lows
- tune glulisine PK beyond literature prior to fix nocturnal tails
- tune glargine time-profile amplitude to Emory
- remove overnight restore wholesale (fasting v1 failed Shanghai)
- choose low-side restore multiplier from Emory
- accept thresholded counterregulation v1 while ~33% of patients reach <20

## 17. Key source facts worth remembering

### Shanghai

Shanghai static anchor is evidence-grounded and remains development/calibration data, not final external validation.

Strict Shanghai Basal+Regular fingerprint previously used for freeze:

- day mean ~134.8 +/-31.2
- within-day SD ~31.8 +/-18.5
- preB ~122.8
- preL ~135.1
- preD ~124.9
- +120 ~139.7
- breakfast delta120 ~16.8
- TBR ~0.5%
- TIR ~81.6%

Do not alter Shanghai Regular kernel globally from Emory results.

### Emory

Important methodological caveats:

- no steroids
- severe renal disease excluded
- obesity / poor control much greater than Shanghai
- glargine U100/U300 + glulisine
- bedtime correction exists in protocol
- nocturnal window 22–06

## 18. Immediate next action in a new channel

If user says `続行` / `はい`, do this without clarification:

### Step 1 — rescue-treatment architecture

Implement an **optional hypoglycemia rescue treatment layer** on `v2/state-space-minimal` only.

Requirements:

- keep thresholded counterregulation v1 experimental
- do not touch main
- treatment rescue must be external to intrinsic physiology
- use independent protocol logic rather than Emory calibration
- log each rescue event: minute, glucose, intervention amount/type
- permit next-day policy reduction based on documented low glucose rather than hidden physiology

### Step 2 — prespecified audit before external interpretation

Compare at least:

- legacy low-side restore
- thresholded counterregulation v1 without rescue
- thresholded counterregulation v1 + protocol rescue

Audit:

- Shanghai preservation
- severe-tail safety: <20, <40, <54
- TBR<70 / <54
- CV
- noct<70 / noct<54
- 00–06 <70 / <54
- number of rescue events per patient-day
- whether nocturnal lows still occur but extreme tails are truncated

Do **not** select rescue amount/threshold by Emory closeness.

### Step 3 — only then reconsider counterregulation reserve heterogeneity

If rescue solves the absurd <20 tail while preserving realistic nocturnal incidence, then evaluate whether reserve should vary by phenotype using independent physiology.

Possible candidates for later, but not yet accepted:

- long-duration beta failure / recurrent-hypoglycemia phenotype lower reserve
- sleep-related threshold shift
- age/renal effects only if independently justified

### Step 4 — later external revalidation

Only after rescue architecture is accepted, rerun Emory full metrics:

- mean
- TIR
- TAR>180
- TAR>250
- TBR<70
- TBR<54
- CV
- any <70 / <54
- nocturnal <70 / <54
- 00–06 events
- hourly TBR clock
- daily day1..day8 trajectory

## 19. Useful recent commits in this channel

Selected list, newest concepts first:

- `0dd99118708a7d750e5ae06551b00c9c73387496` — fix counterregulation audit stack overflow
- `df46751607b5ab729578c2bab5d0e437483adb8d` — counterregulation-v1 audit workflow was present/triggered around this point
- `4faa881c9a92639d46ae2a85b0b24534c3938352` — upper-bound / follow-up diagnostic work around low-side homeostasis
- `0211c853cbc693767ca2d08c80b682487dcc7c05` — low-side homeostasis audit workflow
- `4dd05b7ebdc53c4e606746ec4eb8f81d3de88241` — low-side restore ablation script
- `668ec9b39f09047e40bc7b1de40715eb5c9ccbfe` — time-profile audit moved before heavy sweep
- `211680c9ab7bd787ccf6707d0fbf349665126215` — fix bedtime correction function name in time-profile audit
- `212f7c1407d3786e51566e058a1d26f31388149c` — glargine time-profile sensitivity audit
- `108da7edb01761d673dd96e6b37ccb02da01b20d` — basal time-profile hook
- `3168b98ac20eb6a8864ce881778629e9f9a5f933` — glargine time-profile prior
- `839f9091f71584c204bee551500af8079bec624f` — freeze basal relative potency 0.20
- `4415e14123eedf996118f6464a1def980488ad35` — bedtime correction external validation
- `0fdc79e4a29deb3719feb289d75f5d4151f49300` — bedtime correction course logging
- `7642bfaef64d09872b369d2f4cd53bb48ea2841c` — dynamic bedtime correction hook
- `eb477b8b065c9555459c045fa92bced9e3272e23` — protocol bedtime correction table
- `09f75832d4e04d77d2b74cb5b18efa2e54acc61a` — 6-phenotype trajectory audit
- `0a539e3a1f916140509bcb7c6487fa37012f4a3e` — V3 6-phenotype generator refactor
- `b3680a67f6e4493421fff36dc8425844a2fe4a72` — component-specific titration
- `1e1147e0a21371d91e280e6d12bf794cb7666460` — eGFR<=60 policy fix

## 20. One-sentence state summary

The project has moved from “not enough patient parameters” to a much more structured V3 phenotype + observable treatment policy + heterogeneous inpatient course, and the **current dominant unresolved defect is that realistic thresholded low-glucose counterregulation produces the right nocturnal variability but, without a ward hypoglycemia-rescue layer, allows an implausible extreme <20 mg/dL tail**.
