# Hypoglycemia source ablation — 2026-08-19

Branch-only validation. Main untouched.

Protocol: N=120 generated T1DM candidates, 7 days with 1 warm-up day, no generator safety reject, patient-specific meal kinetics, decoupled meal gain 5.0 mg/dL/g at 70 kg, no meal-size saturation, rapid scale 0.80, bolus at meal time, finite-memory state 210 min / coupling .28 / fast_scale .80 / setpoint shift +15.

UOM reference: mean 146.46, SD 56.23, TBR<70 2.06%, TBR<54 0.276%, any four-check <70 7.68%, median ACF 0.863 / 0.634 / 0.247 / -0.012.

## Baseline
- mean 154.30
- SD 66.23
- TBR<70 7.94%
- TBR<54 3.25%
- any four-check <70 21.67%
- four-check means 144.7 / 128.5 / 135.9 / 169.8
- median ACF 0.868 / 0.609 / 0.205 / 0.184

## Main ablations

### Bolus action 80%
- mean 192.11
- SD 68.37
- TBR<70 1.90%
- TBR<54 0.51%
- any four-check <70 6.67%
- four-check means 162.3 / 163.9 / 179.6 / 226.8

This nearly normalizes hypoglycemia but causes marked hyperglycemia. Therefore the excess low-glucose burden is strongly prandial-insulin dependent, but simply reducing all bolus action is not an acceptable final calibration.

### Basal contribution 80%
- mean 150.88
- SD 61.95
- TBR<70 7.42%
- TBR<54 3.16%
- any four-check <70 18.47%

### Basal contribution off
- mean 139.27
- SD 51.80
- TBR<70 7.52%
- TBR<54 3.27%
- any four-check <70 15.0%

Reducing/removing the net basal term does not materially normalize CGM TBR. Basal is not the dominant source of the excess hypoglycemia in this formulation. Note the basal term is a target-minus-delivered balance term, not simply a one-direction insulin dose term, so its ablation should not be interpreted as clinical basal withdrawal.

### Counterregulation
150% counterregulation:
- TBR<70 7.18%
- TBR<54 2.54%
- any four-check <70 19.17%

Counterregulation off:
- TBR<70 14.68%
- TBR<54 10.69%
- any four-check <70 30.42%

Counterregulation is important and protective, but increasing the present mechanism by 50% is insufficient to solve the baseline excess hypoglycemia.

### Restore
80% restore increases TBR<70 to 8.87%; restore off becomes unstable (mean 466, SD 439, TBR<70 13.2%). The restore term is essential global stabilization and should not be used as a hypoglycemia tuning knob.

### Meal off
Produces profound hypoglycemia (TBR<70 54.7%), confirming that the current prandial insulin exposure is very large relative to carbohydrate appearance when meal input is absent.

## Interpretation
1. Excess hypoglycemia is primarily linked to the prandial balance: meal appearance versus bolus insulin exposure.
2. Basal contribution is not the principal cause.
3. Current counterregulation is physiologically protective but cannot compensate for the prandial mismatch without unrealistic strengthening.
4. Restore is a stabilizer, not a calibration target.
5. A global 20% reduction in bolus action fixes hypoglycemia but severely overshoots mean glucose, so the next step is not a simple bolus multiplier.
6. The next calibration should jointly examine prandial insulin gain/dose and meal glucose gain while constraining both overall mean/SD and TBR, ideally using clean meal-aligned trajectories plus 24h population fingerprints.
7. In particular, inspect whether CF-derived insulin gain and v2 ICR-derived dose are jointly producing excessive prandial effect or double-counting treatment need in some phenotypes.
