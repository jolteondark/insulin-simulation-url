# Provisional model-side breakfast response screen (2026-08-20)

Purpose: compare the model's between-patient heterogeneity of patient-mean breakfast Δ120 against the Shanghai basal-bolus 7-session target.

Observed basal-bolus target from the same-cohort analysis:
- patient mean Δ120, mean-of-means: 44.4 mg/dL
- between-patient SD of patient-mean Δ120: 28.1 mg/dL
- observed patient-mean range: 0.3 to 73.3 mg/dL

Candidate structure held near the best aggregate fingerprint: equilibrium center ~147 mg/dL, equilibrium SD ~35 mg/dL, prandial coverage ~0.80, meal variability scale ~0.55 of the crude Shanghai staple-weight proxy CV, bolus mismatch SD ~10%.

A direct vectorized reproduction of the current kernel (meal tau 80 min, bolus tau 90 min) gave approximately:
- patient-mean Δ120: ~17 mg/dL
- between-patient SD: ~13 mg/dL

Thus the model under-generates both the mean +120-minute excursion and the between-patient heterogeneity.

A shape-only sensitivity screen, recomputing prandial balance from kernel areas, showed that faster meal appearance and slower insulin action can recover the mean Δ120 without requiring extra amplitude noise. Examples:
- meal tau 65 / bolus tau 150 min: mean Δ120 ~44.6, between-patient SD ~15.3
- meal tau 55 / bolus tau 135 min: mean Δ120 ~45.2, between-patient SD ~15.5
- meal tau 45 / bolus tau 120 min: mean Δ120 ~43.3, between-patient SD ~14.9

Interpretation:
1. The current 80/90 kernel is too flat/overlapping around +120 min for the basal-bolus Shanghai fingerprint.
2. Kernel timing can plausibly fix the mean post-breakfast excursion.
3. Kernel timing alone still leaves roughly half of the observed between-patient SD unexplained (~15 vs 28 mg/dL).
4. Therefore a patient-level meal-response/absorption heterogeneity term may be justified, but only after the revised kernel is validated against the full 24-hour fingerprint and not merely Δ120.

Do not merge this sensitivity result into main. It is an experimental diagnostic, not a final calibrated parameter set.
