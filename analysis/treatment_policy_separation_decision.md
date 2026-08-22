# Decision — separate patient physiology from previous-doctor treatment policy

External validation exposed a structural leakage: the historical `suggestOrder()` uses hidden SI/beta/hepatic-IR values to construct a near-balanced dose. This behaves like an oracle clinician and suppresses the effect of severe insulin resistance on glucose outcomes.

## Evidence
- Pre-specified glulisine PK range independently spans the Emory TBR/CV targets, but not the hyperglycemic mean/TAR residual.
- Replacing the fixed ±1/±2 U titration with an Emory-style percentage titration did not resolve the hyperglycemic residual and increased hypoglycemia in sensitivity analysis.
- Expanding BMI alone had little effect while using physiology-balanced `suggestOrder()`, because the policy automatically compensates for the stronger hidden IR.

## Architecture decision
- Keep `T2DMGameModelV2OrderDecompExp.suggestOrder()` only as a physiology-balanced reference/debug quantity.
- Do not use it as the generated previous-doctor prescription.
- Generate real treatment orders from an observable-data policy layer (weight, age, eGFR, admission BG, optional known home TDD), with no access to hidden SI, beta-cell reserve, hepatic IR, or other latent physiology.
- Preserve integer units.

Experimental implementation: `t2dm_treatment_policy_weight_bg_exp.js`.

## Guardrail
Do not tune the physiology-blind policy to make external glucose targets match. Treatment policy and physiology must be validated separately.
