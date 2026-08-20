# T2DM equilibrium 132 mg/dL treatment sensitivity

Target cohort: ShanghaiT2DM mirror snapshot, 106 sessions with CGM.

Observed targets:
- pooled CGM mean ~138.99 mg/dL, SD ~49.62
- session-mean TIR ~78.38%, TBR<70 ~2.30%, TAR>180 ~19.32%
- meal-relative pre-breakfast 131.90 ± 35.53 mg/dL
- pre-lunch 133.16 ± 50.87
- pre-dinner 136.10 ± 48.86

Experiment: change only dynamic fasting equilibrium from 147 ± 28 to 132 ± 35.5 mg/dL while retaining v1 kernel and current suggested-order treatment.

5000 patients × 7 days approximate result:
- mean 134.54
- SD 47.37
- TIR 76.39%
- TBR 7.90%
- TAR 15.71%
- >250 1.33%
- pre-breakfast 133.04 ± 34.72
- pre-lunch 136.64 ± 46.41
- pre-dinner 136.34 ± 54.18
- bedtime 137.26 ± 56.30

Interpretation: the lower equilibrium fixes the baseline mean/width but exposes excessive prandial treatment at the lower baseline. TBR becomes far too high. Therefore equilibrium cannot be recalibrated independently of the treatment policy.

Common scaling of all insulin also fails: a scale that brings TBR near 2.3% raises mean glucose to ~157-161 mg/dL, while a scale that gives mean ~140 leaves TBR ~6%.

Bolus-only scaling with basal kept at the maintenance reference likewise shows no single multiplier that simultaneously matches mean and TBR. Around 0.70-0.80 bolus scaling, TBR is ~2.1-2.7% but mean is ~156-161 mg/dL. Around 0.90, mean is ~140 but TBR is ~6.3%.

Decision: do not freeze a global insulin multiplier. The current suggested-order formula / phenotype-response coupling must be recalibrated structurally, likely by separating meal response from insulin sensitivity and avoiding excessive treatment in low-equilibrium patients. Main branch remains untouched.
