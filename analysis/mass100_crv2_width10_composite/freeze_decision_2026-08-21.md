# Freeze decision — mass-action100 + CR V2 width10 composite

Date: 2026-08-21
Branch: `v2/state-space-minimal`

## Frozen candidate

The T2DM low-side physiology candidate is frozen before independent Graz validation as:

1. **Prandial low-side mass action**
   - enabled below the patient's pre-existing `endogenous_insulin.glucose_threshold_mg_dl`
   - reference = **100 mg/dL** (pre-existing generator field; not selected from Emory outcomes)
   - multiplier = `G / reference` below reference; current calibrated prandial behavior unchanged at/above reference

2. **Counterregulation V2**
   - pre-existing primary/default structure
   - activation width = **10 mg/dL**
   - reserve = **1.0 (healthy)**
   - awake threshold = 60 mg/dL
   - sleep threshold = 50 mg/dL
   - low-side switch = 80 mg/dL
   - EGP increment and glucose distribution volume remain the independently defined module constants

No PK, basal potency, stress trajectory, phenotype weights, insulin correction scale, rescue rule, or treatment-policy threshold is changed.

## Development evidence used before freeze

Focal audit: GitHub Actions run `32486193162`, job `96783133240`.

Shanghai preservation, N=2500, days 3–8:
- control TIR 92.60%
- composite TIR 92.41%
- delta TIR **-0.194 pp**
- control mean 148.87 mg/dL
- composite mean 149.24 mg/dL
- composite TBR<70 0.107%
- formal Shanghai preservation gate: **PASS**

Emory registered-protocol diagnostic context, ~N=8000:
- composite mean 196.8 mg/dL
- TIR 46.2%
- TBR<70 0.71%
- TBR<54 0.03%
- any<70 21.2%
- any<54 2.0%
- nocturnal<70 3.7%
- nocturnal<54 0.9%
- 00–06<54 0.9%
- patients <20: **0.00%**
- patients <30: **0.00%**
- patients <40: **0.00%**
- D1 breakfast-window <20: **0.00%**
- POC mean 203.2 mg/dL
- POC TIR 42.7%
- POC TBR<70 1.72%
- POC TBR<54 0.02%
- catastrophic safety gate (<20 <=1%): **PASS**

The composite restores more moderate low-side structure than mass-action100 alone while eliminating the catastrophic additive-insulin tail and preserving Shanghai.

## Freeze rule

Emory has now contributed to model diagnosis/development and is not a pristine final external validation set for this candidate.

The next dataset is the independent Graz inpatient T2DM CGM/BG cohort (Schaupp et al., Diabetes Technology & Therapeutics 2015). **No parameter in the frozen candidate may be altered after seeing Graz results.** Graz is validation only. If Graz fails, report the failure and reopen model development using a new, independently justified structural hypothesis rather than tuning the frozen 100 mg/dL reference, CR width, reserve, PK, basal potency, stress, phenotype weights, or treatment thresholds to Graz.
