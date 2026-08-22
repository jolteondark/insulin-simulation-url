# UOM clean-window fingerprint — 2026-08-19

Dataset: ManchesterCSCoordinatedDiabetesStudy V1.0.3.

## Strict clean-window definition
For each clock window, require:
- exactly one carbohydrate-positive main meal in the expected meal class (Breakfast/Brunch for 07-12; Lunch/Brunch for 12-18),
- no additional carbohydrate-positive event in the window,
- exactly one clinically meaningful bolus >=1 U in the window,
- both endpoint CGM values available within ±10 min of clock time.

This avoids counting pump microboluses <1 U as separate correction boluses.

## Results
### 07:00 -> 12:00
- n = 291 patient-windows
- subjects = 14
- 07:00 mean = 124.43 mg/dL
- 12:00 mean = 137.72 mg/dL
- mean change = +13.29 mg/dL
- median change = +12.61 mg/dL
- endpoint SDs = 42.63 / 49.73 mg/dL

### 12:00 -> 18:00
- n = 320 patient-windows
- subjects = 14
- 12:00 mean = 141.88 mg/dL
- 18:00 mean = 158.41 mg/dL
- mean change = +16.53 mg/dL
- median change = +14.41 mg/dL
- endpoint SDs = 49.00 / 64.03 mg/dL

## Meal-time distribution inside clean windows
- Breakfast/Brunch median clock time = 09:00; IQR 08:00–10:00; median carbs 33 g.
- Lunch/Brunch median clock time = 13:30; IQR 12:45–14:48; median carbs 48 g.

## Interpretation
Removing snacks and additional meaningful boluses does NOT remove the positive 07->12 or 12->18 drift. Therefore the earlier low model 12:00/18:00 values cannot be attributed only to snack/correction context.

However, the clean UOM windows have variable meal timing, while the simulator still uses fixed 08:00/13:00 meals and fixed clock POC times. Therefore the next validation should align trajectories to the actual meal time (e.g. premeal and +60/+120/+180/+240 min) rather than continue fitting fixed-clock 12:00/18:00 means.

Do not tune core physiology to the unconditional four-check clock means until this alignment issue is resolved.
