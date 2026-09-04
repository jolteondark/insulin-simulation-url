# Constrained relative meal/rapid kernel screen — 2026-08-23

## Question
Run 19 showed that the frozen model's deterministic post-meal balance becomes insulin-dominant at about 59–63 min, while daytime r120 is strongly negative. This screen asked whether **small, area-preserving changes to the relative meal/rapid kernel shapes** can correct daytime temporal structure without worsening tails.

Production `engine.js` and `patient_generator.js` were not modified. GitHub Actions was not used.

External comparison remains the AZT1D harmonized patient-median daytime ACF: r30 0.836, r60 0.579, r120 0.102, r240 -0.054. The harmonized cohort is replication evidence, not an official-raw calibration target.

## Design
Rapid aspart kernel remained normalized to area 1. Tested peak/duration pairs: 95/285, 100/300, 105/300 (frozen rapid reference), 110/315 min.

Meal kernel remained normalized to area 1. Tested variants relative to each generated patient's meal parameters:
- `M0`: unchanged
- `S060`: slow t50 ×0.60
- `S080`: slow t50 ×0.80
- `S060Q+10`: slow t50 ×0.60, fast fraction +0.10
- `S080Q+10`: slow t50 ×0.80, fast fraction +0.10
- `F080S080`: fast and slow t50 ×0.80

Coarse screen: N=25, 5 days/patient, 5-min sampling, daytime 06:00–24:00. Confirmatory reruns used N=50, 8 days/patient. Metrics: patient-median daytime ACF, ACF RMSE vs AZT1D, mean/CV/TIR/TBR/TAR, 4-point distributions, and median meal-vs-rapid instantaneous crossing time.

## Coarse results

|rapid peak/duration|meal|r60|r120|ACF RMSE|mean|CV %|TBR<70 %|TAR>180 %|cross min|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
|110/315|S060Q+10|0.337|-0.512|0.335|125.0|40.2|2.10|18.8|71|
|110/315|S060|0.344|-0.515|0.335|124.6|38.0|1.27|17.8|72|
|110/315|F080S080|0.319|-0.505|0.336|123.5|36.8|0.78|16.5|63|
|110/315|S080Q+10|0.330|-0.514|0.337|123.9|37.6|1.05|17.1|69|
|105/300|S060Q+10|0.327|-0.515|0.338|124.3|38.1|0.84|17.3|68|
|105/300|S060|0.333|-0.519|0.338|124.0|35.9|0.29|16.2|70|
|100/300|S060Q+10|0.315|-0.512|0.339|124.0|36.6|0.26|16.3|66|
|110/315|S080|0.334|-0.519|0.339|123.2|34.5|0.25|15.0|69|
|100/300|S060|0.320|-0.516|0.340|123.8|34.4|0.06|15.1|67|
|100/300|S080|0.307|-0.508|0.340|122.5|31.0|0.00|12.1|64|
|100/300|S080Q+10|0.306|-0.508|0.340|123.1|34.1|0.04|14.4|64|
|95/285|S060Q+10|0.299|-0.506|0.340|123.6|34.5|0.03|14.9|64|
|100/300|F080S080|0.291|-0.499|0.340|122.7|33.5|0.00|14.0|59|
|95/285|S060|0.303|-0.508|0.340|123.4|32.2|0.00|13.5|64|
|105/300|F080S080|0.306|-0.508|0.340|123.0|34.8|0.13|15.1|61|
|105/300|S080Q+10|0.320|-0.517|0.340|123.3|35.5|0.21|15.5|66|
|105/300|S080|0.322|-0.518|0.340|122.8|32.5|0.06|13.3|66|
|95/285|F080S080|0.271|-0.491|0.341|122.4|31.6|0.00|12.6|56|
|110/315|M0|0.323|-0.517|0.341|121.6|32.7|0.06|12.7|66|
|95/285|S080Q+10|0.288|-0.503|0.342|122.7|32.1|0.00|13.0|61|
|100/300|M0|0.297|-0.508|0.342|120.9|29.5|0.00|10.1|60|
|95/285|M0|0.280|-0.502|0.343|120.6|27.7|0.00|8.7|57|
|95/285|S080|0.288|-0.509|0.344|122.2|29.1|0.00|10.5|60|
|105/300|M0|0.310|-0.519|0.344|121.2|30.8|0.00|11.1|62|

## Same-protocol frozen reference
N=50, 8 days/patient:
- r30 0.780
- r60 0.314
- r120 -0.524
- r240 -0.168
- ACF RMSE 0.346
- mean 120.56 mg/dL
- CV 31.46%
- TIR 88.80%
- TBR<70 0.241%
- TBR<54 0%
- TAR>180 10.95%
- TAR>250 0.293%
- crossing median 63 min

4-point q10/q50/q90 mg/dL: pre-breakfast 102.0/110.4/118.1; pre-lunch 83.7/93.1/101.0; pre-dinner 81.0/89.5/97.4; bedtime 140.7/149.4/161.5.

## Confirmatory results
The four best coarse candidates were rerun at N=50, 8 days/patient.

### 110/315 + F080S080
- r60 0.320, r120 -0.510, r240 -0.168, RMSE 0.339
- mean 122.90, CV 37.83%
- TBR<70 1.377%, TBR<54 0%, TAR>180 16.31%, TAR>250 1.07%
- crossing 63 min

### 100/300 + S060Q+10
- r60 0.315, r120 -0.513, r240 -0.152, RMSE 0.340
- mean 123.48, CV 37.65%
- TBR<70 0.816%, TBR<54 0%, TAR>180 16.18%, TAR>250 1.29%
- crossing 66 min

### 105/300 + S060
- r60 0.333, r120 -0.522, r240 -0.150, RMSE 0.340
- mean 123.46, CV 36.87%
- TBR<70 0.859%, TBR<54 0%, TAR>180 16.07%, TAR>250 1.02%
- crossing 70 min

### 110/315 + S080Q+10
- r60 0.331, r120 -0.520, r240 -0.161, RMSE 0.340
- mean 123.30, CV 38.69%
- TBR<70 1.714%, TBR<54 0%, TAR>180 16.80%, TAR>250 1.31%
- crossing 69 min

## Key finding
**The constrained local kernel hypothesis failed.** Across the completed screen, median instantaneous crossing time moved from roughly 56 to 72 min, yet daytime r120 stayed tightly clustered around -0.49 to -0.52. Moving crossing time later therefore did not translate into restoration of the observed positive 2-hour correlation.

The numerically best candidates reduced ACF RMSE only from about 0.346 to ~0.339–0.340 on confirmation. This is a very small gain. The modest apparent gain came with substantially larger CV/TBR and shifted 4-point structure. It is not a convincing Pareto improvement.

This refines Run 19: the equation-term decomposition correctly identified where the deterministic post-meal trajectory becomes insulin-dominant, but **that single crossing statistic is not the causal control knob for population daytime ACF**. ACF is an emergent property of the whole repeated trajectory, inter-meal spacing, between-day variability and patient heterogeneity.

## Decision
- Keep production frozen.
- Do not tune meal t50 / fast fraction or small rapid peak-duration changes as a standalone fix.
- Do not use crossing time as a calibration target by itself.
- Earlier aggressive rapid broadening remains rejected because it moved r120 only at the cost of CV/TBR/tail distortion.

## Highest-value next discriminator
The strongest prior positive signal remains **coherent day-level meal/insulin mismatch variability** (Run 18), while the current local-kernel screen is essentially negative. The next experiment should therefore test whether a *small* shared day-level mismatch (e.g. 5–10%) combined with only the mildest safe kernel candidate gives an additive improvement, compared with each component alone, using the same seeds and same N/DAYS.

If the interaction is non-additive or tails worsen before r120 materially improves, the daytime defect should be reclassified as requiring a more fundamental state-space/day-trajectory representation rather than further kernel tuning.