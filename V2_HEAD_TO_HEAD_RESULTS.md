# v2 head-to-head results

Experimental only. Do not merge.

## Exact-JS validation protocol

- Same browser-port formulas as branch `engine.js`, `patient_generator.js`, `state_space_v2.js`, and `engine_v2.js`.
- N=300 generated T1DM candidates, seed 7901, no UI starter-day safety rejection.
- 7 consecutive days; day 1 warm-up; days 2-7 analyzed.
- Fixed 50/70/60 g meals, nominal 0.5 U-rounded rapid and basal doses, no infection/steroid.
- v1 carries previous-day end glucose only.
- v2 carries previous-day glucose and latent metabolic state.

## Frozen v1 under this multi-day protocol

- mean 119.58 mg/dL
- SD 50.52
- CV 42.25%
- TIR 80.36%
- TBR<70 6.14%
- TBR<54 0.79%
- TAR>180 13.50%
- TAR>250 2.78%
- r30 0.800
- r60 0.389
- r120 -0.286
- r240 -0.134

## v2 requirement-state redesign

The first v2 implementation coupled the latent state to generic insulin sensitivity and hepatic drive. Exact execution showed only modest temporal improvement and worsened low-glucose tails. Inspection revealed a structural reason: in frozen v1, basal insulin is represented mainly as `actual basal - target basal`; when actual basal equals target, a global insulin-sensitivity multiplier has almost no basal-background pathway to act on.

v2.1 therefore redefines the latent state as a time-varying **basal insulin requirement**. It also explicitly represents target basal physiology versus administered basal activity, reduces fast meal/bolus flux amplitude, and recalibrates the existing fasting set-point level. No extra renal/circadian/activity state is added.

### Temporal-fit candidate

Parameters:

- tau 120 min
- basal requirement coupling 0.28
- fast flux scale 0.74
- fasting set-point shift +15 mg/dL

N=300 result:

- mean 147.07 mg/dL
- SD 55.87
- CV 37.99%
- TIR 71.27%
- TBR<70 4.42%
- TBR<54 0.59%
- TAR>180 24.31%
- TAR>250 5.36%
- r30 0.904
- r60 0.711
- r120 0.359
- r240 0.283

This is the first configuration in which mean/SD/CV and 1-2 h autocorrelation simultaneously enter the observed external-data range. The main failure is excessive 4 h persistence plus somewhat excessive hyperglycemia / reduced TIR.

### More conservative candidate

Parameters:

- tau 90 min
- basal requirement coupling 0.22
- fast flux scale 0.74
- fasting set-point shift +15 mg/dL

N=300 result:

- mean 141.02 mg/dL
- SD 47.54
- CV 33.71%
- TIR 78.75%
- TBR<70 2.59%
- TBR<54 0.26%
- TAR>180 18.66%
- TAR>250 2.95%
- r30 0.873
- r60 0.611
- r120 0.150
- r240 0.149

This preserves safety/range metrics better but under-reproduces total variability and r120.

## External reference

T1D-UOM: mean 146.46, SD 56.23, CV 38.39%, TIR 76.38%, TBR<70 2.06%, TBR<54 0.276%, TAR>180 21.57%, TAR>250 5.94%, r30 0.863, r60 0.634, r120 0.247, r240 -0.012.

HUPA-UCM: mean 135.6, SD 51.6, CV 38.08%, TIR 77.5%, TBR<70 5.74%, TBR<54 1.26%, TAR>180 16.74%, TAR>250 3.43%, r30 0.923, r60 0.779, r120 0.491, r240 0.132.

## Interpretation

The state-space direction is now supported: a continuous basal-requirement state plus redistribution of fast variance can correct the sign and magnitude of r60/r120 while retaining realistic marginal variability.

However a single OU state has a shape limitation. When tuned strongly enough to match r120, it leaves too much r240. Real data appear to require substantial 1-2 h memory with much weaker 4 h memory. The next experiment should therefore change the **correlation shape**, not simply increase state amplitude. Candidate approaches are a short-lived episodic requirement state or a second-order/two-timescale state. Do not add renal/circadian/activity modifiers until this temporal-shape question is resolved.
