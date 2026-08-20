# Counterregulation V2 acceptance gate

Date: 2026-08-20
Branch: `v2/state-space-minimal`

## Scope

This gate applies to `t2dm_counterregulation_v2_egp_exp.js` only. It is a structural physiology audit. It must not become an Emory outcome-fitting exercise.

## Independent physiological anchors fixed before external inspection

- Awake counterregulatory threshold: 60 mg/dL.
- Sleep counterregulatory threshold: 50 mg/dL.
- Healthy hypoglycemic glucose-production increment: 12.88 umol/kg/min = 2.3184 mg/kg/min.
- Glucose distribution volume anchor: 0.20 L/kg.
- Implied healthy maximum glucose-concentration drive: 2.3184 / (0.20 * 10) = 1.1592 mg/dL/min.
- Antecedent-hypoglycemia sensitivity reserve: 0.68, reflecting a 32% reduction in glucose-production response.
- Activation widths 5, 10 and 20 mg/dL are structural sensitivities, not calibrated parameters.

## Hard acceptance gates

A V2 arm is admissible only if all of the following hold:

1. Shanghai preservation passes the pre-specified gate used in the audit:
   - |delta mean| < 5 mg/dL
   - |delta pre-breakfast| < 5 mg/dL
   - |delta pre-lunch| < 5 mg/dL
   - |delta pre-dinner| < 5 mg/dL
   - |delta breakfast +120 min| < 2 mg/dL
   - |delta TBR<70| < 1 percentage point
   - |delta TIR| < 3 percentage points
2. Catastrophic-depth safety gate passes: no more than 1% of external-sensitivity patients may reach <20 mg/dL.
3. No continuous hidden-CGM rescue treatment is used to make the physiology arm pass.
4. Frozen basal relative potency remains 0.20.
5. Glulisine PK, phenotype weights and treatment-policy coefficients remain unchanged.

## External interpretation rule

Emory metrics are descriptive only. Mean glucose, CV, TBR and nocturnal event rates must not be used to select activation width, counterregulatory reserve, threshold or maximum drive.

If multiple activation widths pass the hard gates, V2 may be retained as a mechanism class but the width remains unresolved until an independent clamp/time-response source constrains it.

If no activation width passes the hard gates, reject V2 rather than weakening or strengthening parameters to improve Emory agreement.

## Rescue-treatment separation

The Emory CGM was blinded/professional CGM. Therefore hidden minute-level simulated glucose cannot trigger a rescue intervention in the Emory external model. Rescue belongs to a separate observation/treatment-policy layer and may only trigger from information a clinical team could actually observe in the modeled protocol.
