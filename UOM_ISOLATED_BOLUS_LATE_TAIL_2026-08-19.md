# UOM isolated bolus late-tail validation — 2026-08-19

Purpose: determine whether the residual hypoglycemia should be fixed by shortening rapid-insulin action after 120 min.

Strict descriptive extraction from normalized T1D-UOM:
- bolus >=1 U
- no carbohydrate event >5 g from -120 to +360 min
- no other bolus >=0.2 U from -60 to +360 min
- CGM available within +/-10 min at t0 and +60/+90/+120/+180/+240/+300/+360
- baseline glucose >=80 mg/dL

Strict sample: n=362 isolated boluses from 14 subjects.

Median raw glucose decline per unit, normalized to +240 min = 1:
- +60: 0.339
- +90: 0.631
- +120: 0.793
- +180: 0.886
- +240: 1.000
- +300: 1.035
- +360: 1.035

A more permissive definition (no other bolus >=1 U) gave n=398 / 15 subjects and a very similar late pattern: 0.336 / 0.635 / 0.786 / 0.867 / 1.000 / 1.068 / 1.049.

Current rapid kernel scale 0.80, propagated through the restoration term, approximately gives (for typical egp_suppression_strength~1):
- +60: 0.214
- +90: 0.509
- +120: 0.770
- +180: 1.033
- +240: 1.000
- +300: 0.870
- +360: 0.758

Interpretation / caveats:
1. The UOM isolated-bolus signal is observational and still contains basal insulin, spontaneous glucose trends, activity, and unrecorded context; it is not a pure PK/PD experiment.
2. Nevertheless, it does NOT support shortening the rapid-insulin tail. Observed glucose decline persists through 300–360 min, whereas the model response is already decaying after ~180–240 min.
3. Therefore the residual model hypoglycemia should not be repaired by arbitrarily truncating rapid insulin action.
4. Combined with the prandial-balance diagnostic, the more likely issue is excessive amplitude of the opposing fast meal and bolus terms: both are large, then their timing mismatch produces late undershoot.
5. Next test: reduce the common fast subsystem amplitude (fast_scale / matched meal+bolus amplitude) while retuning the finite-memory variance budget, rather than changing rapid PK or meal tail independently.

Main branch untouched.
