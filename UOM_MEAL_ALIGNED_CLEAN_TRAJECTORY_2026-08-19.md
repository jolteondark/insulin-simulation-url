# UOM meal-aligned clean-window trajectory (2026-08-19)

Source: ManchesterCSCoordinatedDiabetesStudy-V1.0.3.

Clean-event definition used here:
- carb-containing meal with known carbs
- no additional carb-containing nutrition event from meal time through +240 min
- exactly one bolus >=1 U within -60 to +30 min of the meal
- no additional bolus >=0.2 U from +30 through +240 min
- CGM available within +/-10 min of meal time and +60/+120/+180/+240 min

Glucose converted mmol/L -> mg/dL using 18.0182.

Main breakfast/lunch/dinner events: n=706 (plus 6 supper events excluded from the meal-type table below).

## All breakfast/lunch/dinner clean meals

Mean premeal glucose: 135.8 mg/dL.

Mean change from premeal:
- +60 min: +13.5 mg/dL
- +120 min: +11.0 mg/dL
- +180 min: +10.5 mg/dL
- +240 min: +9.1 mg/dL

Median change:
- +60 min: +9.0 mg/dL
- +120 min: +9.0 mg/dL
- +180 min: +7.2 mg/dL
- +240 min: +9.0 mg/dL

## By meal type

### Breakfast (n=181)
Median carbs 39 g; median bolus timing 0 min relative to meal.
Mean premeal glucose 137.1 mg/dL.
Mean delta:
- +60: +14.3
- +120: +9.4
- +180: +5.9
- +240: -0.9 mg/dL

### Lunch (n=295)
Median carbs 49 g; median bolus timing 0 min.
Mean premeal glucose 133.1 mg/dL.
Mean delta:
- +60: +15.6
- +120: +21.6
- +180: +16.2
- +240: +6.9 mg/dL

### Dinner (n=230)
Median carbs 68 g; median bolus timing 0 min.
Mean premeal glucose 136.0 mg/dL.
Mean delta:
- +60: +11.5
- +120: +0.8
- +180: +8.6
- +240: +21.2 mg/dL

## Interpretation

Clock-time pseudo-check means were confounded by wide real-world meal timing. Meal alignment reveals that clean events do not share a single universal postprandial shape: breakfast, lunch and dinner differ substantially despite near-zero median bolus lead.

This argues against calibrating one universal meal kernel solely to 12:00/18:00/21:00 means. The next validation target should compare the current candidate model (rapid time-scale 0.80, bolus lead 0, uniform patient-specific ICR) to these meal-aligned trajectories, ideally stratified by meal type and carbohydrate amount.

Caution: even the clean definition cannot remove unobserved activity, composition (fat/protein), basal changes, or small pump microboluses below thresholds.
