# Meal-size dependent early appearance saturation ablation

Branch: v2/state-space-minimal
Date: 2026-08-19

Goal: test one additional mechanism only after decoupling ICR from meal glucose gain: preserve total carbohydrate appearance, but cap the amount entering the early meal component and divert excess carbohydrate to the later component.

Fixed assumptions for this diagnostic screen:
- rapid kernel time-scale 0.80
- bolus timing 0 min
- decoupled meal glucose gain
- no new latent state
- clean UOM meal-aligned targets only

External UOM clean targets (delta glucose mg/dL):
- breakfast 39 g: +60 14.3, +120 9.4, +180 5.9, +240 -0.9
- lunch 49 g: +60 15.6, +120 21.6, +180 16.2, +240 6.9
- dinner 68 g: +60 11.5, +120 0.8, +180 8.6, +240 21.2

Mechanism tested:
- fast carbohydrate grams = min(total_carb * fast_fraction, fast_carb_cap_g)
- slow carbohydrate grams = total_carb - fast_carbohydrate_grams
- total carbohydrate is conserved
- only temporal allocation changes

Diagnostic grid finding:
- saturation improves the joint fit relative to a purely proportional early component.
- best coarse region was approximately:
  - meal glucose gain ~4-5.5 mg/dL/g
  - fast t50 ~90-100 min
  - slow t50 ~130-150 min
  - fast carbohydrate cap ~25-40 g
- a representative coarse reconstruction around gain 4, fast t50 100, slow t50 150, fast fraction 0.7, cap 35 g produced approximately:
  - breakfast: +60 15.7, +120 7.4, +180 5.0, +240 13.1
  - lunch: +60 19.7, +120 9.3, +180 6.3, +240 16.5
  - dinner: +60 21.6, +120 3.9, +180 1.3, +240 18.4
  - 12-point RMSE ~7.8 mg/dL in this simplified reconstruction.

Interpretation:
1. The direction is supported: large meals should not scale the early glucose appearance component linearly with total carbohydrate.
2. Diverting excess carbohydrate into the late component substantially improves the dinner +240 min behavior while limiting the early excursion.
3. However, dinner +60 min remains too high and lunch +120/+180 remain too low in the simplified common-kernel reconstruction.
4. Therefore early-appearance saturation is useful but not by itself sufficient to reproduce all meal-specific UOM trajectories with one universal kernel.
5. Do not respond by immediately introducing breakfast/lunch/dinner-specific arbitrary kernels. First test whether a physiologic delayed-meal feature such as fat/protein-dependent gastric delay or meal composition proxy can explain the residual meal-type structure.
6. This remains diagnostic; exact full-engine JS validation is required before coefficient adoption.

Decision:
- retain early-appearance saturation as a plausible v2 mechanism candidate.
- do not yet merge into production engine_v2.js.
- next test should ask whether meal composition (fat/protein or an equivalent composition proxy available in UOM nutrition data) explains why dinner has low +60 but high +240 and lunch peaks around +120.

Main branch remains untouched.
