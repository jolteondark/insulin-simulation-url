# T2DM v2 meal-variability provisional findings — 2026-08-20

Goal: test whether Shanghai-derived meal-load variability plus only small bolus mismatch can recover the Shanghai106 distribution without adding generic noise.

Targets (Shanghai106 mirror snapshot): pooled mean 138.99 mg/dL, SD 49.62, TBR 2.32%, TIR 79.60%, TAR 18.09%; meal-relative pre-breakfast/lunch/dinner 131.90±35.53 / 133.16±50.87 / 136.10±48.86 mg/dL.

Structural result:
- Using the same variability strength for all three meals over-expands later-day variance because pre-dinner glucose accumulates breakfast + lunch variability.
- Meal-specific scaling is required: breakfast variability primarily controls pre-lunch SD; breakfast + lunch variability control pre-dinner SD.
- A representative local sensitivity point (breakfast proxy-variation scale ~0.45, lunch ~0.20, dinner ~0.20, bolus mismatch SD ~10%) gives approximately pooled 141.4±43.0 mg/dL, TBR 2.33%, TIR 80.3%, TAR 17.4%; premeal SD breakfast/lunch/dinner ~35.9/49.8/45.4 mg/dL.
- Therefore meal-load variability + small mismatch can recover the observed pre-lunch SD and TBR simultaneously, but pooled SD and pre-dinner SD remain too narrow, and lunch/dinner means remain ~10 mg/dL too high.

Decision:
1. Do not increase bolus mismatch further; prior experiments show that this raises TBR disproportionately.
2. Keep meal variability as a meal-specific layer, not a single global meal-noise scalar.
3. The next remaining candidate should be a modest day-level insulin-sensitivity (SI) state variation, tested while keeping the static phenotype and equilibrium distribution fixed.
4. Only accept the SI layer if it increases pooled/pre-dinner SD and lowers residual mean mismatch without pushing TBR materially above the Shanghai target.

Caveat: the representative numeric point above comes from a local faithful reimplementation of the current experimental equations; the branch GitHub Actions script `scripts/validate_t2dm_v2_meal_variability.js` is the canonical exact-model rerun once its persisted workflow result is available.
