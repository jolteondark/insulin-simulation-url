# Patient-specific meal appearance validation — 2026-08-19

Purpose: retain the existing patient-specific meal absorption heterogeneity (`meal_t50_fast_min`, `meal_t50_slow_min`, `meal_fast_fraction`) while testing only ICR/meal-gain decoupling plus meal-size early saturation. Rapid scale 0.80, bolus lead 0, uniform ICR, circadian off, finite-memory basal-requirement state unchanged.

Directional N=30 results with decoupled meal gain 5.0 mg/dL/g at 70 kg:

- cap 25 g: POC 147.9 / 124.8 / 144.2 / 149.0; RMSE 18.66; mean 146.39; SD 57.74; median ACF30/60/120/240 0.930 / 0.786 / 0.509 / 0.396; any<70 19.44%; any>180 44.44%; all-four TIR 37.22%.
- cap 30 g: POC 147.2 / 124.2 / 142.5 / 151.0; RMSE 18.75; mean 146.69; SD 58.32; ACF 0.924 / 0.762 / 0.482 / 0.368.
- cap 35 g: POC 146.5 / 123.5 / 140.9 / 152.9; RMSE 18.93; mean 147.00; SD 58.97; ACF 0.917 / 0.742 / 0.452 / 0.339.
- cap 40 g: POC 145.9 / 122.9 / 139.3 / 154.9; RMSE 19.20; mean 147.32; SD 59.69; ACF 0.910 / 0.722 / 0.410 / 0.322.

UOM reference:
- POC 121.5 / 149.1 / 153.2 / 154.1
- overall mean 146.46, SD 56.23
- median ACF 0.863 / 0.634 / 0.247 / -0.012
- any<70 7.68%, any>180 53.77%, all-four TIR 43.31%

Interpretation:
1. Restoring patient-specific meal timing heterogeneity improves temporal structure substantially compared with the rejected globally-slowed 90/150 min common kernel.
2. Nevertheless the tested 25–40 g early caps still over-retain glucose dynamics, especially at 120–240 min; they are too aggressive as global saturation rules.
3. The trend is monotonic: weaker saturation (larger cap) reduces long-lag ACF. Therefore the next directional test should extend caps upward (e.g. 40/50/60/70 g plus no-saturation control) while keeping gain near 5.0 and the patient-specific t50 distribution unchanged.
4. Gain 5.5 is clearly too high for the 24h mean in this setup (~164–165 mg/dL), so keep gain near 5.0 for the next cap-only refinement.
5. No current saturation coefficient is accepted yet. Main branch remains untouched.
