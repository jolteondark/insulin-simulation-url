# Prandial insulin formulation PK/PD prior decision

Date: 2026-08-20
Branch: v2/state-space-minimal

## Principle

Do not choose formulation timing parameters by optimizing against the Emory aggregate target. Use external pharmacology to define allowable timing-shape ranges first, then ask whether the independent inpatient external fingerprint falls within the resulting behavior.

Integrated bolus-kernel area remains normalized to the frozen regular-human-insulin reference so formulation timing does not silently become a potency multiplier.

## Regular human insulin

Simulation anchor remains tau=90 min, duration=330 min because Shanghai strict Basal+Regular already anchored the current model and mean breakfast delta120 was approximately reproduced. Do not reopen this from Emory.

FDA Novolin R label pharmacodynamic facts: SC glucose-lowering begins about 30 min, is maximal around 1.5–3.5 h, and terminates around 8 h; concentration peak occurs around 1.5–2.5 h and returns near baseline around 5 h.

Source: https://www.accessdata.fda.gov/drugsatfda_docs/label/2013/019938s072lbl.pdf

## Insulin aspart

Use only a literature-constrained range at this stage: phenomenological gamma tau 60–90 min, duration 180–300 min. No final point estimate adopted.

FDA NovoLog label: maximum glucose-lowering effect 1–3 h after SC injection; duration 3–5 h.

Source: https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/020986s090s091lbl.pdf

## Insulin glulisine

Use a literature-constrained range: phenomenological gamma tau 55–80 min, duration 240–300 min. Candidate coordinate 65/270 is allowed for sensitivity analysis but is not calibrated/adopted.

FDA Apidra label: more rapid onset and shorter duration than regular human insulin. Median concentration Tmax was 60 vs 120 min in T1DM and 100 vs 240 min in T2DM for glulisine vs regular human insulin.

Source: https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021629s039s040lbl.pdf

## Lyumjev (insulin lispro-aabc)

Do not assign a single-gamma point kernel yet. FDA labeling shows a very rapid early component but a substantial dose-dependent tail: first measurable effect ~15–17 min, peak effect ~120–174 min, return to baseline ~4.6–7.3 h; plasma appearance ~1 min and concentration Tmax ~57 min.

A single gamma1 kernel ties early rise, peak, and tail too tightly. Formal Lyumjev support should therefore use a fast component plus a slower tail component, with total integrated effect normalized separately.

Source: https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/761109s004lbl.pdf

## Guardrails

- No formulation timing parameter may be changed to improve mean glucose; total bolus action is area-normalized.
- Shanghai Regular remains frozen.
- Emory glulisine is an external validation target, not a calibration target.
- A parameter may graduate from a range to a fixed prior only when supported by pharmacology independent of the validation dataset.
- Generic glucose noise remains off.
- Formulation PK belongs to treatment/drug layer, never patient phenotype.
