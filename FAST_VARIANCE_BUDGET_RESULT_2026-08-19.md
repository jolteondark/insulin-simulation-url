# Fast vs persistent variance budget validation — 2026-08-19

Branch: `v2/state-space-minimal`. Main untouched.

Purpose: test the hypothesis that excessive hypoglycemia is caused by excessive common fast-subsystem amplitude, and whether reducing fast variance while increasing persistent finite-memory variance can preserve the UOM temporal fingerprint.

Protocol:
- N=60 generated patients, no safety reject
- 7 days, 1 warmup day
- patient-specific meal kinetics retained
- decoupled meal gain 5.0 mg/dL/g at 70 kg
- rapid kernel scale 0.80
- finite-memory W=210 min
- setpoint shift +15 mg/dL
- fast_scale grid: 0.55, 0.60, 0.65, 0.70, 0.75, 0.80
- basal-requirement coupling: 0.28, 0.32, 0.36, 0.40
- ACF computed within patient then median across patients

UOM targets: mean 146.46, SD 56.23, ACF 30/60/120/240 = 0.863/0.634/0.247/-0.012, TBR<70 2.06%, TBR<54 0.276%.

Key results at coupling 0.28:

| fast_scale | mean | SD | ACF30 | ACF60 | ACF120 | ACF240 | TBR<70 | TBR<54 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.80 | 149.90 | 64.34 | .870 | .615 | .209 | .201 | 9.15% | 4.11% |
| 0.75 | 149.24 | 62.31 | .877 | .635 | .249 | .229 | 8.69% | 3.75% |
| 0.70 | 148.62 | 60.31 | .885 | .655 | .291 | .257 | 8.26% | 3.37% |
| 0.65 | 148.05 | 58.35 | .894 | .676 | .336 | .287 | 7.73% | 3.02% |
| 0.60 | 147.55 | 56.43 | .903 | .702 | .384 | .313 | 7.17% | 2.66% |
| 0.55 | 147.11 | 54.55 | .912 | .729 | .435 | .339 | 6.60% | 2.28% |

Interpretation:
1. Reducing the common fast scale predictably reduces total SD, but only modestly reduces hypoglycemia. Even fast_scale 0.55 leaves TBR<70 at 6.6%, far above UOM 2.06%.
2. As fast_scale decreases, ACF becomes too persistent, especially at 120–240 min. Thus a common multiplicative shrinkage of meal and bolus fast effects trades variance for excessive persistence rather than fixing the hypoglycemia mechanism.
3. Increasing finite-memory basal-requirement coupling above 0.28 raises mean/SD and generally worsens the combined match; it does not rescue the low-glucose problem.
4. This falsifies the simple hypothesis that the problem is primarily an excessive common fast-variance budget.
5. Combined with the prior ablation (bolus 0.8 sharply reduced TBR while basal reduction did not), the remaining issue is asymmetric meal-vs-prandial-insulin balance rather than a common fast_scale.
6. Do not adopt a lower fast_scale solely to fit SD/TBR. Keep 0.80 provisional until asymmetric prandial calibration is tested.

Next test:
- hold meal physiology and rapid timing fixed
- vary prandial insulin action/dose scale independently (e.g. 0.80–1.00)
- compensate mean with a slow/basal/setpoint component rather than increasing meal gain
- evaluate whether a combination can reduce TBR without destroying ACF or marginal mean/SD
- separately inspect whether CF-to-insulin-gain calibration and ICR dose calibration should be made mutually consistent rather than multiplying bolus effect by an arbitrary scale.
