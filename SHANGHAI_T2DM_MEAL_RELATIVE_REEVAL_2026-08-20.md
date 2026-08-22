# Shanghai T2DM meal-relative re-evaluation (2026-08-20)

## Purpose
Re-evaluate the provisional T2DM kernel against meal-relative premeal CGM rather than fixed clock times.

## Shanghai direct re-analysis (20 readable .xlsx sessions)
Meal-relative CGM immediately before recorded meals:
- Breakfast: mean 145.2 mg/dL, SD 30.3
- Lunch: mean 141.2 mg/dL, SD 51.2
- Dinner: mean 150.0 mg/dL, SD 50.9

Observed meal-time distribution from complete days (n=155):
- Breakfast: mean 07:12, SD 42 min
- Lunch: mean 11:38, SD 47 min
- Dinner: mean 17:28, SD 60 min

## Current provisional kernel, fixed model meal times, sampled immediately premeal
5000 synthetic patients:
- Breakfast: mean 144.5, SD 28.0
- Lunch: mean 145.5, SD 39.7
- Dinner: mean 149.9, SD 42.4

Interpretation: meal-relative evaluation fixes much of the mean mismatch, but pre-lunch and pre-dinner variance remain too narrow.

## Empirical meal-time heterogeneity sensitivity test
Synthetic meal times were sampled from complete observed Shanghai day triplets while keeping phenotype generator and kernel unchanged.
- Breakfast: mean 144.5, SD 28.0
- Lunch: mean 147.0, SD 40.7
- Dinner: mean 149.8, SD 45.7

Interpretation: meal-time heterogeneity contributes modestly, especially to pre-dinner variance, but cannot explain the remaining pre-lunch variance deficit.

## Absorption-time heterogeneity sensitivity
Generic meal absorption-tau heterogeneity raises lunch variance but causes excessive dinner variance. Breakfast-only tau heterogeneity is more selective:
- sigma 0.2: lunch 144.4±43.7, dinner 151.4±47.0
- sigma 0.3: lunch 141.4±46.7, dinner 152.9±48.6
- sigma 0.4: lunch 137.9±49.7, dinner 154.4±50.6
- sigma 0.5: lunch 134.6±51.9, dinner 155.7±52.5

This can reproduce the SD pattern but shifts lunch mean too low. Therefore a single breakfast absorption-speed random effect is not sufficient by itself.

## Decision
1. Keep the current equilibrium and kernel parameters provisionally frozen.
2. Use meal-relative CGM definitions for future 4-point validation.
3. Do not add generic treatment noise or generic daily transient yet.
4. Remaining mismatch is specifically: within-patient / meal-level response heterogeneity, especially after breakfast.
5. Next candidate mechanisms should be tested separately: meal carbohydrate-load heterogeneity (requires nutrient conversion rather than raw food grams), meal-specific insulin mismatch, and/or meal-specific response-amplitude variation. Add only mechanisms that improve both mean and SD without damaging later time points.
