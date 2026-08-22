# ShanghaiT2DM meal-relative timing validation — 2026-08-20

Source: uploaded ShanghaiT2DM dataset. Direct parsing here is limited to the 20 native `.xlsx` sessions; the remaining 89 sessions are legacy `.xls` and were not used for this event-level calculation.

## Why the comparison definition changed

Fixed-clock 4-point sampling can misclassify post-meal values as pre-meal values because Shanghai meal times differ from the simulator schedule. The 20 directly parsed sessions show:

- Breakfast events: n=175, mean time 07:14, SD 43 min, median 07:04, 5th–95th percentile 06:16–08:38.
- Lunch events: n=181, mean time 11:38, SD 42 min, median 11:31, 5th–95th percentile 10:58–12:54.
- Dinner events: n=185, mean time 17:43, SD 50 min, median 17:31, 5th–95th percentile 16:55–19:26.

For patient-days with both breakfast and lunch recorded (n=162), breakfast-to-lunch interval was mean 261 min, SD 46 min, median 240 min, 5th–95th percentile 210–345 min.

The provisional simulator schedule had been 08:00 / 13:00 / 19:00 with fixed pre-lunch/pre-dinner checks. Therefore fixed-clock comparisons are not a clean estimate of pre-meal structure.

## Meal-relative pre-meal CGM distribution

Using the CGM value on the row where the dietary event was recorded as the meal-relative pre-meal value:

| Meal | n | mean mg/dL | SD mg/dL | median | p5 | p95 |
|---|---:|---:|---:|---:|---:|---:|
| Breakfast | 175 | 145.2 | 30.3 | 144.0 | 103.9 | 205.2 |
| Lunch | 181 | 141.2 | 51.2 | 133.2 | 75.6 | 234.0 |
| Dinner | 185 | 150.0 | 50.9 | 140.4 | 88.6 | 244.8 |

This preserves the earlier qualitative finding: breakfast variance is relatively narrow while lunch and dinner variance are much wider. But the lunch mean is lower than the earlier fixed-clock estimate, showing that clock-based 4-point sampling was materially mixing timing states.

## Dietary amount field

The `Dietary intake` column stores food names and food weights (e.g. vegetables 50 g, chicken 100 g, rice 75 g), not grams of carbohydrate. Summing listed grams gives total food mass, not carbohydrate exposure, and therefore should NOT be mapped directly to the simulator's `meal_plan_carb_g`.

In the directly parsed `.xlsx` sessions, total listed food mass among events with parseable gram entries was highly variable (breakfast mean ~233 g, SD ~113 g), but this metric is composition-dependent and is not a valid carbohydrate target.

## Decision

1. Replace fixed-clock Shanghai 4-point validation for breakfast/lunch/dinner with meal-relative validation.
2. Do not use total dietary food weight as carbohydrate grams.
3. For meal-size heterogeneity, either derive carbohydrates from food composition with an explicit nutrient mapping or use an external cohort that reports carbohydrate grams directly.
4. Before adding breakfast timing noise to the simulator, re-evaluate the current kernel candidate against meal-relative pre-meal targets (145/30, 141/51, 150/51) rather than the previous fixed-clock targets.

This result means the apparent residual 'lunch SD deficit' should not yet be patched with noise: part of the mismatch came from the validation clock definition itself.