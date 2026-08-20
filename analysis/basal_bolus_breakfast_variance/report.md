# Basal-bolus breakfast-to-lunch variance decomposition

Breakfast-day records: **64**

## CGM trajectory
- pre: n=64, 147.7 ± 35.7
- g60: n=61, 169.0 ± 48.5
- g120: n=60, 188.9 ± 63.0
- g180: n=60, 174.5 ± 62.5
- pre_lunch: n=59, 152.6 ± 67.2
- d60: n=61, 21.1 ± 29.2
- d120: n=60, 42.3 ± 46.5
- d180: n=60, 27.8 ± 49.3

## Breakfast inputs
- food_weight_g: n=55, 202.40 ± 90.07
- staple_weight_g: n=47, 100.89 ± 32.09
- near_breakfast_insulin_u: n=64, 13.89 ± 7.37
- insulin_time_rel_breakfast_min: n=64, -12.19 ± 12.21

## Spearman correlations
- food_weight_g__d60: n=55, rho=0.146
- food_weight_g__d120: n=54, rho=0.100
- food_weight_g__d180: n=54, rho=-0.008
- food_weight_g__pre_lunch: n=53, rho=-0.025
- food_weight_g__auc_above_baseline_0_180: n=55, rho=0.077
- staple_weight_g__d60: n=47, rho=0.127
- staple_weight_g__d120: n=46, rho=0.022
- staple_weight_g__d180: n=46, rho=-0.114
- staple_weight_g__pre_lunch: n=45, rho=-0.149
- staple_weight_g__auc_above_baseline_0_180: n=47, rho=-0.004
- near_breakfast_insulin_u__d60: n=61, rho=-0.324
- near_breakfast_insulin_u__d120: n=60, rho=-0.370
- near_breakfast_insulin_u__d180: n=60, rho=-0.417
- near_breakfast_insulin_u__pre_lunch: n=59, rho=-0.608
- near_breakfast_insulin_u__auc_above_baseline_0_180: n=61, rho=-0.410
- insulin_time_rel_breakfast_min__d60: n=61, rho=-0.169
- insulin_time_rel_breakfast_min__d120: n=60, rho=-0.054
- insulin_time_rel_breakfast_min__d180: n=60, rho=-0.050
- insulin_time_rel_breakfast_min__pre_lunch: n=59, rho=0.024
- insulin_time_rel_breakfast_min__auc_above_baseline_0_180: n=61, rho=-0.100
