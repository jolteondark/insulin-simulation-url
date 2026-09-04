# Daytime phase-lock discrimination screen — 2026-08-23

## Purpose

Exploratory local screen to discriminate whether the frozen model's strongly negative daytime 2 h autocorrelation can be improved by the current leading family of minimal changes without creating unacceptable glucose tails.

This is **validation-only**. `engine.js` and `patient_generator.js` remain frozen and unchanged.

Source anchors used for the local run:
- `engine.js` blob: `a0b2d51c071f404fbfd79142be910fd28608d9bd`
- `patient_generator.js` blob: `1cea478a112bc6eca719e4df1ecc7aac9984e0ab`
- engine version: `0.94-browser-port`
- generator version: `0.79-browser-port`

The run was executed directly in a local Node environment. GitHub Actions was not used for execution.

## External target used only as a discrimination reference

AZT1D harmonized patient-median daytime ACF:
- r30 = 0.835673
- r60 = 0.579003
- r120 = 0.102483
- r240 = -0.054101

AZT1D harmonized marginal context:
- mean = 145.08 mg/dL
- CV = 32.47%
- TIR 70–180 = 79.09%
- TBR <70 = 1.589%
- TBR <54 = 0.296%
- TAR >180 = 19.32%
- TAR >250 = 3.46%

These are not treated as a pooled canonical target because cohort, treatment and harmonization differ from the simulator population.

## Protocol

Exploratory cohort:
- N = 40 generated gate-valid T1DM patients
- seeds = 960001 onward
- 8 simulated days per patient
- glucose sampled every 5 min for metric calculation
- daytime = 06:00–24:00, requiring both members of each lag pair to remain in daytime
- patient-level Pearson ACF at 30/60/120/240 min, then patient median
- daytime ACF RMSE calculated against AZT1D daytime ACF

The first screen varied:
- aspart action peak: 105 (frozen), 110, 120, 130 min
- duration: 300 (frozen), 330, 360, 390 min
- independent per-meal carbohydrate mismatch amplitude: 0, ±5%, ±10%, ±15%

The second screen compared the temporal structure of carbohydrate mismatch:
- `independent`: a separate random multiplier for breakfast/lunch/dinner
- `shared`: one multiplier shared across all three meals on that day
- amplitudes: ±5%, ±10%, ±15%, ±20%
- frozen rapid profile 105/300 and a mildly broadened 110/390 profile

Important: these are screening runs, not replacement for the canonical 3000-patient validation.

---

## Screen A — rapid profile × independent per-meal carbohydrate mismatch

| peak | duration | carb amp | r30 | r60 | r120 | r240 | day ACF RMSE | mean | CV% | TIR% | TBR<70% | TBR<54% | TAR>180% | TAR>250% |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|105|300|0|0.775|0.310|-0.519|-0.165|0.345|120.60|35.45|86.29|0.58|0.000|13.13|0.70|
|110|330|0.05|0.781|0.321|-0.504|-0.163|0.335|121.89|38.06|82.53|2.42|0.000|15.04|1.30|
|110|360|0.05|0.779|0.320|-0.495|-0.165|0.331|122.64|38.55|81.82|2.58|0.000|15.60|1.49|
|110|390|0.05|0.778|0.320|-0.487|-0.160|0.328|123.67|38.52|81.63|2.35|0.000|16.02|1.64|
|120|330|0.05|0.791|0.339|-0.510|-0.167|0.334|123.01|40.80|77.86|4.90|0.007|17.23|1.83|
|120|360|0.05|0.790|0.338|-0.499|-0.171|0.330|124.25|41.51|76.54|5.40|0.009|18.06|2.17|
|120|390|0.05|0.789|0.338|-0.488|-0.165|0.324|125.79|41.52|76.20|5.06|0.000|18.74|2.43|
|130|330|0.05|0.799|0.354|-0.516|-0.172|0.335|124.42|43.12|73.68|7.11|0.107|19.22|2.43|
|130|360|0.05|0.797|0.353|-0.504|-0.179|0.330|126.26|44.05|71.73|7.85|0.128|20.42|3.04|
|130|390|0.05|0.797|0.353|-0.490|-0.175|0.323|128.39|44.12|71.22|7.38|0.127|21.40|3.63|
|110|330|0.10|0.789|0.341|-0.456|-0.150|0.308|122.09|38.40|80.88|4.02|0.080|15.11|1.41|
|110|360|0.10|0.788|0.339|-0.444|-0.149|0.303|122.83|38.91|80.10|4.24|0.060|15.66|1.60|
|110|390|0.10|0.787|0.340|-0.435|-0.142|0.298|123.83|38.91|79.86|4.08|0.028|16.06|1.74|
|120|330|0.10|0.798|0.356|-0.470|-0.152|0.312|123.32|41.01|76.95|5.82|0.225|17.24|1.95|
|120|360|0.10|0.797|0.355|-0.464|-0.154|0.309|124.55|41.73|75.63|6.28|0.221|18.09|2.35|
|120|390|0.10|0.796|0.357|-0.452|-0.144|0.302|126.07|41.77|75.15|6.13|0.192|18.72|2.65|
|130|330|0.10|0.804|0.367|-0.481|-0.157|0.315|124.73|43.29|73.23|7.58|0.561|19.19|2.63|
|130|360|0.10|0.803|0.367|-0.472|-0.161|0.311|126.57|44.22|71.29|8.31|0.594|20.41|3.31|
|130|390|0.10|0.803|0.369|-0.457|-0.154|0.303|128.71|44.30|70.73|7.91|0.556|21.36|3.93|
|110|330|0.15|0.792|0.358|-0.412|-0.121|0.283|123.15|38.58|79.76|4.94|0.170|15.29|1.56|
|110|360|0.15|0.791|0.358|-0.402|-0.122|0.278|123.90|39.09|78.87|5.25|0.123|15.88|1.74|
|110|390|0.15|0.791|0.360|-0.393|-0.117|0.274|124.87|39.12|78.60|5.13|0.091|16.27|1.88|
|120|330|0.15|0.800|0.369|-0.431|-0.132|0.290|124.40|41.10|76.18|6.41|0.436|17.41|2.09|
|120|360|0.15|0.799|0.369|-0.416|-0.134|0.283|125.63|41.83|74.80|6.90|0.362|18.29|2.52|
|120|390|0.15|0.799|0.371|-0.403|-0.128|0.276|127.13|41.89|74.29|6.76|0.315|18.95|2.85|
|130|330|0.15|0.807|0.381|-0.445|-0.141|0.295|125.77|43.34|72.85|7.75|0.862|19.40|2.83|
|130|360|0.15|0.806|0.381|-0.430|-0.147|0.288|127.58|44.28|70.91|8.46|0.910|20.63|3.56|
|130|390|0.15|0.806|0.382|-0.415|-0.141|0.281|129.71|44.37|70.25|8.20|0.859|21.55|4.18|

### Screen A interpretation

1. Increasing independent meal mismatch generally improves daytime ACF RMSE, but the gain is bought with rapidly increasing TBR and CV.
2. Increasing the rapid-action peak to 120–130 min raises mean/TAR but causes a large TBR/CV penalty before r120 approaches the observed positive value.
3. The least harmful mild candidate in this grid is around peak 110 / duration 390 / ±5% independent meal mismatch, but its improvement is small (RMSE 0.345 → 0.328) and daytime r120 remains very negative (-0.487).
4. The best RMSE in this grid (110/390/±15%) remains far from the target at r120=-0.393 and already has TBR<70=5.13%.

Conclusion: **rapid broadening + independent meal-level mismatch is not sufficient and should not be escalated simply to force ACF agreement.**

---

## Screen B — temporal structure of meal mismatch

| mode | rapid peak/duration | carb amp | r30 | r60 | r120 | r240 | day ACF RMSE | mean | CV% | TIR% | TBR<70% | TBR<54% | TAR>180% | TAR>250% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|shared|105/300|0.05|0.779|0.320|-0.491|-0.147|0.328|121.15|35.59|85.03|1.75|0.000|13.22|0.87|
|independent|105/300|0.05|0.776|0.313|-0.507|-0.155|0.338|121.19|35.49|85.36|1.30|0.000|13.34|0.83|
|shared|105/300|0.10|0.788|0.352|-0.427|-0.103|0.290|122.17|36.25|83.02|3.47|0.048|13.52|1.26|
|independent|105/300|0.10|0.785|0.333|-0.454|-0.139|0.308|121.29|35.91|83.88|2.82|0.068|13.30|0.96|
|shared|105/300|0.15|0.804|0.402|-0.325|-0.017|0.233|122.34|37.21|81.12|5.45|0.472|13.43|1.47|
|independent|105/300|0.15|0.789|0.353|-0.410|-0.106|0.282|122.31|36.14|82.67|3.75|0.143|13.58|1.18|
|shared|105/300|0.20|0.813|0.434|-0.223|0.033|0.184|123.64|38.08|79.30|6.63|0.892|14.06|1.85|
|independent|105/300|0.20|0.804|0.398|-0.341|-0.073|0.240|122.68|37.08|80.88|5.34|0.487|13.78|1.38|
|shared|110/390|0.05|0.782|0.327|-0.475|-0.154|0.320|123.61|38.61|81.23|2.81|0.000|15.96|1.63|
|independent|110/390|0.05|0.778|0.320|-0.487|-0.160|0.328|123.67|38.52|81.63|2.35|0.000|16.02|1.64|
|shared|110/390|0.10|0.791|0.355|-0.411|-0.105|0.282|124.75|39.24|78.94|4.80|0.016|16.26|2.06|
|independent|110/390|0.10|0.787|0.340|-0.435|-0.142|0.298|123.83|38.91|79.86|4.08|0.028|16.06|1.74|
|shared|110/390|0.15|0.806|0.408|-0.307|-0.013|0.224|124.93|40.18|76.67|7.17|0.379|16.16|2.39|
|independent|110/390|0.15|0.791|0.360|-0.393|-0.117|0.274|124.87|39.12|78.60|5.13|0.091|16.27|1.88|
|shared|110/390|0.20|0.815|0.440|-0.212|0.028|0.177|126.37|40.98|74.86|8.37|0.828|16.77|2.90|
|independent|110/390|0.20|0.807|0.402|-0.327|-0.080|0.233|125.37|40.02|76.73|6.83|0.500|16.43|2.34|

### Screen B interpretation

A day-level shared mismatch is consistently more effective at increasing r60/r120 than equal-amplitude independent per-meal mismatch. This is mechanistically informative: **the temporal correlation structure of the unmodelled variability matters, not just its variance.**

However, large shared variability is not safe as a standalone fix:
- frozen rapid + shared ±20% improves RMSE to 0.184 and r120 to -0.223, but TBR<70 rises to 6.63% and TBR<54 to 0.89%.
- 110/390 + shared ±20% improves RMSE to 0.177 and r120 to -0.212, but TBR<70 rises to 8.37%.

At the low end, shared ±5% with the frozen rapid profile keeps TBR near the external context (1.75%) but only improves RMSE from 0.345 to 0.328 and leaves r120=-0.491.

---

## New conclusion from this run

The previous statement “add realistic meal variability” is too underspecified.

The evidence now supports a more precise statement:

1. Deterministic repeated meal/bolus balance contributes to the artificial daytime anticorrelation.
2. Day-level coherent variability changes ACF more efficiently than independent meal noise, showing that **slow within-patient state variation across a day** is a plausible missing structure.
3. But treating that slow state simply as a large multiplicative carbohydrate error causes too much hypoglycemia and still does not make daytime r120 positive.
4. Therefore the next candidate should not be “more carb noise.” The next discrimination step should test a **bounded latent daily state** that changes meal/insulin balance coherently while preserving homeostatic/safety constraints, e.g. modest day-level insulin-sensitivity or insulin-demand drift with reversion across days, rather than independent meal perturbations.
5. Rapid-profile broadening may remain a secondary contributor, but the 120–130 min peak region is disfavored because CV/TBR worsen sharply before the temporal target is reached.

## Production decision

**No model change approved. Main remains frozen.**

This run is a negative/structural discrimination result, not a tuning success.

## Highest-priority next experiment

Test a bounded, patient-specific latent daily insulin-demand / sensitivity state with:
- small amplitudes first (e.g. 3–10% effective insulin action variation),
- persistence across 1–3 days rather than independent meal noise,
- zero long-run mean shift,
- explicit checks of daytime ACF, overnight ACF, mean/CV, TBR<70/<54, TAR>180/>250, and 4-point glucose distribution,
- frozen rapid profile first; only then combine with the mild 110/390 profile if the latent-state mechanism improves ACF without tail damage.

The key acceptance criterion is **Pareto improvement**: temporal structure must improve materially without obtaining that gain primarily by increasing hypoglycemia or variability.