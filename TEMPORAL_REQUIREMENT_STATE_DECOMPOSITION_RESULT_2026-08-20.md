# Temporal requirement-state decomposition — 2026-08-20

## Fixed base for this diagnostic
- validation-only two-axis generator: intrinsic insulin sensitivity `S_I` + patient-fixed insulin-demand multiplier `D_insulin`
- neutral 240-min meal ICR
- mean-preserving requirement multiplier
- rapid scale 0.80 unless explicitly varied
- fast scale 0.80
- setpoint shift -5 mg/dL
- small zero-area transient retained at tau 90 min / amplitude 8 mg/dL where noted
- no legacy TDD reference in v0.81+

UOM reference:
- mean 146.463 mg/dL
- SD 56.225 mg/dL
- TBR<70 2.057%
- TBR<54 0.276%
- TIR 76.376%
- ACF30/60/120/240 = 0.863 / 0.634 / 0.247 / -0.012

## 1. v0.82 integrated transient
Adding the accepted small AR(1)-first-difference transient to the v0.81 two-axis generator was safe but small:
- mean ~147.9
- SD ~47.5
- TBR<70 ~1.6-1.7%
- ACF240 ~0.17

Conclusion: amplitude ~8 is reasonable as a small unobserved disturbance, but it is not the source of the missing population variance.

## 2. Restore x rapid transfer-function ablation
Changing the glucose-restoration strength and rapid-insulin time scale did not independently control ACF120 and ACF240.

Representative results:
- restore 0.60 / rapid 0.80: ACF120 0.243, ACF240 0.257, SD 52.44, mean 157.94
- restore 1.00 / rapid 0.80: ACF120 0.133, ACF240 0.173, SD 47.48, mean 147.87
- restore 1.20 / rapid 0.80: ACF120 0.122, ACF240 0.137, SD 46.27, mean 144.91

Conclusion: restore and rapid-tail tuning move 120- and 240-min persistence largely together. They cannot create the required pattern of substantial 120-min correlation with approximately zero 240-min correlation.

## 3. Component attribution
Removing the slow basal-requirement state changed:
- SD ~47.5 -> ~37.3 mg/dL
- ACF120 ~+0.15 -> ~-0.27
- ACF240 ~+0.17 -> ~-0.08

Removing the state from the basal-requirement term gave essentially the same result.

Therefore the residual positive 240-min autocorrelation is specifically carried by the slow basal-requirement state. The state is simultaneously an important source of realistic variance.

Canonical conclusion:
> The slow requirement state is necessary, but its temporal covariance shape is wrong. The 240-min persistence problem is a basal-requirement-state shape problem rather than a rapid-insulin-tail or restoration-strength problem.

## 4. Biphasic / zero-DC requirement state
A band-pass requirement state was tested by subtracting the preceding innovation window from the recent innovation window. This gives equal positive and negative lobes and therefore approximately zero DC response.

Short half-widths (30-90 min) were too aggressive: ACF240 became near zero/negative, but ACF120 became strongly negative and SD collapsed to ~38-41 mg/dL.

Wide half-widths were more useful.

Representative wide result, half-width 240 min / coupling 0.48:
- mean 144.92
- SD 49.30
- TBR<70 2.48%
- TBR<54 0.256%
- TIR 77.03%
- ACF30/60/120/240 = 0.846 / 0.566 / 0.147 / 0.011

This nearly solves the 240-min tail while preserving acceptable mean and low-glucose metrics, but ACF120 remains too low and SD remains under target.

## 5. Two-component requirement process
A weak independent finite-memory component was added to the wide biphasic requirement component.

Best balanced tested combination:
- biphasic half-width 240 min, coupling 0.42
- finite-memory width 120 min, coupling 0.08
- small transient amplitude 8 retained

Result:
- mean 146.11
- SD 49.13
- TBR<70 2.19%
- TBR<54 0.254%
- TIR 76.73%
- TAR>180 21.08%
- ACF30/60/120/240 = 0.846 / 0.580 / 0.153 / 0.021

A slightly longer medium component (150 min / 0.08) produced ACF 0.848 / 0.574 / 0.161 / 0.030 with similar marginal metrics.

Increasing medium coupling raises SD and ACF120, but also reintroduces ACF240 and hypoglycemia. For example 120 min / coupling 0.20 reached ACF120 ~0.202 and SD ~50.26, but TBR<70 rose to ~2.90% and ACF240 to ~0.060.

## Structural interpretation
The original single rectangular moving-average slow state should not be expected to simultaneously supply:
1. realistic total variance,
2. positive correlation through ~120 min,
3. approximately zero correlation by 240 min,
4. appropriate hypoglycemia tails.

A two-component requirement process is structurally better:
- a wide zero-DC / biphasic component removes long low-frequency persistence;
- a weaker medium-timescale component restores some 30-120 min covariance.

However, the current rectangular medium component still couples ACF120, ACF240, variance, and hypoglycemia too tightly.

Canonical conclusion:
> The 240-min persistence problem is specifically a basal-requirement-state shape problem. A wide zero-DC/biphasic requirement component can remove the long tail. A weak independent finite-memory component can restore some 60-120 min structure, but the current rectangular medium component still couples ACF120, ACF240, variance, and hypoglycemia too tightly.

## Current best structural candidate
Not frozen yet:
- patient generator centered on `S_I` + `D_insulin`
- wide biphasic requirement state around half-width 240 min / coupling ~0.42
- weak medium requirement component around 120-150 min / coupling ~0.08
- small zero-area transient amplitude ~8

The next diagnostic should change the medium component kernel shape rather than simply increasing its coupling. A tapered or explicitly designed FIR covariance kernel should aim to add covariance at 60-120 min and variance while contributing almost no covariance at 240 min.

Do not fit the core requirement process directly to unconditional four-check clock means; those remain an integrative/behavior-layer validation target.
