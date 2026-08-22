# T1DM distributional validation — run 17 handoff (2026-08-19)

This document is the self-contained handoff for the validation work performed in this cycle. It is intentionally written so another chat/channel can continue from GitHub alone without relying on prior conversation history.

## 0. Scope and safety rule

The project goal is **population distribution fidelity**, not individual next-day prediction accuracy.

The T1DM simulator remained frozen throughout this work. No physiology, patient-generator parameter, or production model file on `main` was changed.

Frozen production reference:
- repo: `jolteondark/insulin-simulation-url`
- `main`: `977378875d948c5dd7f1883f42c50186c74079bc`
- `engine.js` version: `0.94-browser-port`
- `engine.js` blob SHA: `a0b2d51c071f404fbfd79142be910fd28608d9bd`
- `patient_generator.js` version: `0.79-browser-port`
- `patient_generator.js` blob SHA: `1cea478a112bc6eca719e4df1ecc7aac9984e0ab`

All experiments below were run only on validation branch:
- `validation/azt1d-acf-20260819`
- draft PR #1

Do **not** merge any experimental model revision from this branch into `main` without a fresh model-level validation cycle.

---

## 1. Why this cycle was started

Previous formal validation against T1D-UOM V1.0.3 had found a major temporal mismatch:

- frozen model: `r60 = 0.345`, `r120 = -0.425`
- T1D-UOM patient median: `r60 = 0.634`, `r120 = 0.247`

The main question was whether this was dataset-specific or a real model mismatch.

The user explicitly asked to proceed to the next stage only after an independent dataset reproduced the same direction of mismatch.

---

## 2. Independent replication obtained in AZT1D

### Dataset used
AZT1D was analyzed from the public Glucose-ML harmonized derivative of the original AZT1D dataset.

Source used by the workflow:
`https://raw.githubusercontent.com/Augmented-Health-Lab/Glucose-ML-Project/main/3_Glucose-ML-collection/AZT1D/AZT1D-from-Glucose-ML.zip`

Observed ZIP SHA256 during workflow:
`9393f6bcafc37cc1110201ab4291f3050bc3c849b3556b91c00a0c8262e8a136`

Important caveat:
- this is a public harmonized derivative, not the official raw AZT1D archive;
- therefore it is strong independent replication evidence, but the official-raw Tier-A status remains separate.

### Analysis method
For each participant:
- used `timestamp` + `glucose_value_mg_dl`;
- exact timestamp pairs at 30/60/120/240 min;
- this analysis itself performed **no interpolation**;
- participant-level Pearson correlations were calculated;
- dataset summary = patient median ACF.

### AZT1D result
25 participants, 295,567 CGM points.

Patient-median ACF:
- `r30 = 0.8627021804`
- `r60 = 0.6351287169`
- `r120 = 0.2184468350`
- `r240 = 0.0073117640`

Frozen-model reference:
- `r30 = 0.787`
- `r60 = 0.345`
- `r120 = -0.425`
- `r240 = -0.166`

Therefore:
- `Δr60 ≈ +0.290` → MATERIAL
- `Δr120 ≈ +0.643` → MATERIAL

Most important observation:
- T1D-UOM `r60=0.634`, AZT1D `r60=0.635`
- T1D-UOM `r120=0.247`, AZT1D `r120=0.218`

The independent cohort reproduces almost the same 1–2 h correlation structure as T1D-UOM.

### AZT1D marginal summary from the same workflow
- mean glucose ≈ `145.08 mg/dL`
- SD ≈ `47.10 mg/dL`
- CV ≈ `32.47%`
- TIR 70–180 ≈ `79.09%`
- TBR <70 ≈ `1.589%`
- TBR <54 ≈ `0.296%`
- TAR >180 ≈ `19.32%`
- TAR >250 ≈ `3.46%`

These values are secondary/harmonized evidence, not official-raw canonical estimates.

### Decision after replication
The hypothesis that the frozen model's 1–2 h temporal structure is unrealistic is now supported by **two independent cohorts**:
- T1D-UOM
- AZT1D harmonized derivative

This justified moving from validation-only to **mechanism discrimination / revision screening**, while still keeping production `main` frozen.

---

## 3. Critical refinement: the model is NOT simply “too short-memory”

A daypart analysis was run for both AZT1D and the frozen model.

### AZT1D patient-median ACF by time of day
All day:
- r30 `0.863`
- r60 `0.635`
- r120 `0.218`
- r240 `0.007`

Overnight 00:00–06:00:
- r30 `0.889`
- r60 `0.760`
- r120 `0.460`
- r240 `0.086`

Daytime 06:00–24:00:
- r30 `0.836`
- r60 `0.579`
- r120 `0.102`
- r240 `-0.054`

### Frozen model, 250-patient daypart screen
All day:
- r30 `0.800`
- r60 `0.381`
- r120 `-0.361`
- r240 `-0.132`

Overnight 00:00–06:00:
- r30 `~1.000`
- r60 `~1.000`
- r120 `~1.000`
- r240 `~1.000`

Daytime 06:00–24:00:
- r30 `0.779`
- r60 `0.312`
- r120 `-0.525`
- r240 `-0.171`

### Interpretation
This changes the mechanistic interpretation substantially.

The model is not globally under-persistent.

Instead:
1. **overnight is far too deterministic/smooth** — almost no within-patient stochasticity, hence ACF ≈ 1;
2. **daytime is too phase-locked and reverses too sharply around 1–2 h** — the deterministic meal/bolus waveform drives a strongly negative r120.

Therefore the original phrase “memory is too short” is only a coarse all-day description.
The actual structural problem is a mixture of:
- excessive overnight determinism;
- excessive daytime meal–insulin phase locking.

---

## 4. Model revision screens performed

All screens used validation-only source transformation at runtime. No production model file was changed.

### 4.1 Weaker `restoreK`
Tested approximately 0.75×, 0.50×, 0.35× restoration strength.

1000-patient screen baseline reproduced the recorded frozen ACF closely enough for interpretation:
- protocol RMSE vs recorded frozen ACF ≈ `0.0418`

Example 0.50× restore:
- r60 `0.410`
- r120 `-0.299`
- mean `117.27 mg/dL`
- TIR `91.78%`

Example 0.35× restore:
- r60 `0.415`
- r120 `-0.286`
- mean `115.79 mg/dL`
- TIR `92.82%`

Decision:
**reject as primary fix.**

Reason:
- only modest ACF improvement;
- moves mean glucose even lower;
- raises TIR further;
- therefore worsens the recurring external marginal mismatch that the frozen model appears too low-centered / too normoglycemic.

---

### 4.2 Slow OU variation in fasting setpoint
Tested OU-like slow latent variation with amplitudes around 5–15 mg/dL and half-lives around 8–12 h.

Result:
- very small effect on r60/r120;
- larger amplitudes add more low excursions / hypoglycemia.

Decision:
**not effective as the main mechanism.**

---

### 4.3 Slow zero-mean hepatic / balance drive
Tested slow stochastic additive drive with 8–12 h half-life at several amplitudes.

Representative result at stronger tested level:
- baseline r120 about `-0.364`
- stronger drive r120 about `-0.340`

Marginal effect:
- little gain in temporal structure;
- increasing amplitude increases TBR.

Decision:
**not effective at tested range; not safe to use as a blunt fix.**

---

### 4.4 Wider meal absorption kernel
Meal t50 parameters were widened ~1.25× and 1.5×.

Result:
- r120 became no better and often worse;
- mean fell;
- TIR increased;
- hyperglycemia fell too much.

Decision:
**reject.**

This argues against “meal absorption is simply too narrow” as the main explanation.

---

### 4.5 Longer / later rapid-insulin action profile
This was the first change that moved multiple outcomes in the realistic direction at once.

Example: Aspart peak 120 min / duration 360 min
- r60 `0.426`
- r120 `-0.298`
- mean `125.93 mg/dL`
- CV `36.50%`
- TIR `80.60%`
- TBR<70 `2.80%`
- TAR>180 `16.60%`

Example: Aspart peak 140 min / duration 420 min
- r60 `0.477`
- r120 `-0.213`
- mean `135.88 mg/dL`
- CV `40.71%`
- TIR `71.03%`
- TBR<70 `5.37%`
- TBR<54 `0.198%`
- TAR>180 `23.60%`
- TAR>250 `3.99%`

Interpretation:
- it improves ACF;
- raises mean/hyperglycemia toward external cohorts;
- but at the stronger setting overshoots variability and tails;
- r120 still remains negative.

Decision:
**important partial mechanism, but not acceptable as a standalone revision.**

---

### 4.6 Meal-time jitter
Tested daily meal clock jitter of approximately ±30 min.

Effect:
- very small change in all-day/daytime ACF.

Decision:
**meal clock timing by itself is not the main problem.**

---

### 4.7 Bolus lead-time variability
Tested variable bolus timing relative to meals.

Representative effect:
- all-day r60 improved from ~0.401 to ~0.434
- all-day r120 from ~-0.261 to ~-0.224

Marginals became more variable.

Decision:
**small partial contributor, insufficient alone.**

---

### 4.8 Day-to-day carbohydrate / meal-insulin mismatch variability
Tested approximately ±20% carbohydrate variation while insulin orders remained based on the original fixed order.

This gave one of the clearest structural clues.

Representative 14-day screen:
- all-day r60 `0.479`
- all-day r120 `-0.109`
- daytime r60 `0.406`
- daytime r120 `-0.322`
- mean `123.03 mg/dL`
- CV `36.06%`
- TIR `81.91%`
- TBR<70 `4.83%`
- TAR>180 `13.26%`

Compared with deterministic baseline in the same screen:
- all-day r60 `0.401`
- all-day r120 `-0.261`
- daytime r60 `0.311`
- daytime r120 `-0.522`

Decision:
**important partial mechanism.**

Interpretation:
The frozen model's fixed meal sizes and perfectly repeated meal/insulin balance are a substantial cause of the artificial daytime anticorrelation.

But ±20% carb variation alone still does not reproduce AZT1D daytime r120 ≈ +0.102.

---

### 4.9 Combined timing + carb variability
Meal jitter + bolus lead jitter + carb variability was also screened.

Representative result:
- all-day r60 `0.491`
- all-day r120 `-0.103`
- daytime r60 `0.410`
- daytime r120 `-0.318`
- CV `39.00%`
- TIR `79.37%`
- TBR<70 `5.98%`
- TAR>180 `14.65%`

This improves temporal realism but also pushes low-glucose exposure upward.

Decision:
**useful evidence that deterministic daily repetition matters, but not a final parameterization.**

---

## 5. Current leading mechanistic interpretation

The most plausible revision is **structural and two-component**, not a single scalar tuning.

### Component A — daytime
Reduce unrealistic phase locking by combining:
- realistic day-to-day meal amount variation;
- realistic meal/bolus mismatch / lead-time variation;
- a revised rapid-insulin action profile that is somewhat broader/longer than current, but not as extreme as the 140/420 min test.

Goal:
- raise daytime r60/r120;
- reduce the artificial 2 h sign reversal;
- simultaneously move mean/TAR toward observed T1D cohorts;
- avoid excessive TBR/CV.

### Component B — overnight
Add modest **within-patient stochastic variability** so overnight ACF is not ≈1.

Important:
- simple slow setpoint OU and simple slow hepatic drive were already tested and were not satisfactory;
- therefore the next overnight-noise design should not simply repeat those failed mechanisms.

Possible directions to test later:
- bounded low-amplitude insulin-sensitivity drift;
- basal absorption / delivery variability;
- endogenous glucose production variability with physiologically constrained amplitude;
- sensor/process noise only if the validation estimand requires observed-CGM rather than latent plasma glucose.

These must be discriminated by safety-tail and daypart metrics.

---

## 6. Marginal-distribution context accumulated before / during this cycle

Several independent real-world T1D cohorts have higher mean glucose than the frozen model. These are not all formal raw canonical comparisons, but the direction is recurrent.

Examples previously audited:
- AZT1D harmonized mean ≈ `145.08 mg/dL`
- HUPA-UCM common-pipeline mean ≈ `154.44 mg/dL`
- BrisT1D source-summary mean ≈ `157.24 mg/dL`
- T1DiabetesGranada primary-paper mean ≈ `164.78 mg/dL`
- DiaTrend common-pipeline mean ≈ `182.69 mg/dL`

Frozen nominal reference previously recorded: `129.18 mg/dL`.

This is why a revision that improves ACF but drives mean even lower (e.g. weaker restoreK) is considered directionally wrong.

Therapy / age / preprocessing differ across cohorts, so these values are **systematic-mismatch candidates**, not automatically a formal pooled target.

---

## 7. What was NOT done

- Production `engine.js` was not changed.
- Production `patient_generator.js` was not changed.
- `main` was not merged or advanced.
- No candidate revision has been approved for production.
- No official raw AZT1D archive analysis was completed; the independent replication uses the public Glucose-ML harmonized derivative.
- No claim was made that the tested 250-patient / 80-patient screens replace the original canonical 3000-patient population validation.
- No individual-patient predictive-accuracy claim is intended.

---

## 8. GitHub validation artifacts / workflows created on the branch

The branch contains validation-only workflows including:
- AZT1D independent autocorrelation validation
- AZT1D daypart / mechanism discrimination
- short-memory model revision screen
- quick revision screen
- slow-drive screen
- meal/insulin kernel-width screen
- frozen-model daypart ACF
- daytime variability screen

Representative successful Actions results included:
- AZT1D independent ACF: success
- AZT1D mechanism/daypart discrimination: success
- 1000-patient restore/slow-OU revision screen: success
- kernel-width screen: success
- frozen-model daypart ACF: success
- daytime variability screen: success

The validation branch and PR are intentionally draft / experimental.

---

## 9. Current decision

### Evidence status
- T1D-UOM short-memory/all-day ACF mismatch: reproduced
- AZT1D independent same-direction r60/r120 mismatch: reproduced
- mechanism identified as a simple single-parameter defect: **no**
- safe production revision found: **no**

### Freeze status
**Production model remains frozen.**

The correct next step is not to merge the best-looking scalar tweak.

---

## 10. Next recommended work

1. Build a focused 2D/3D screen around **moderate** rapid-insulin broadening plus realistic meal/carb mismatch variability.
2. Score candidates simultaneously on:
   - r30/r60/r120/r240 all-day;
   - daytime ACF;
   - overnight ACF;
   - mean / SD / CV;
   - TIR / TBR<70 / TBR<54 / TAR>180 / TAR>250;
   - min/max and safety-tail frequency.
3. Add an overnight stochastic component separately, but do not reuse the already ineffective simple setpoint-OU / additive-drive forms without a new rationale.
4. Re-run the winning candidate on the full canonical population size and the original distributional validation battery before touching `main`.
5. If possible, later repeat AZT1D using official raw data to upgrade the independent replication from harmonized-derivative evidence to formal raw Tier-A evidence.

---

## 11. One-sentence handoff

**Two independent T1D cohorts now show the same r60/r120 mismatch; the frozen model is almost deterministic overnight and over-phase-locked around meal/bolus dynamics during daytime, and current screens indicate the likely fix is a combined daytime meal/insulin variability + moderate rapid-insulin-profile revision plus a separately designed small overnight stochastic component — but no production change has yet passed the full validation gate.**
