# Interim decision — basal potency and nocturnal hypoglycemia

## Finding

The current V2/V3 dynamic model makes basal dose deviations pathologically weak. The legacy term is:

`(effectiveBasalU - referenceBasalU) / 1440 * 0.30 * SI`

so a 1 U basal deviation changes the integrated 24 h glucose trajectory by only about 0.30 mg/dL-equivalent at SI=1.

By contrast, the simulator's area-normalized prandial 1 U effect is approximately:

`bolus_gain * integral(gamma1) = 0.28 * 215.33 = 60.29 mg/dL-equivalent`

Thus the model currently makes a basal unit deviation roughly 200-fold weaker than a prandial unit deviation.

A local independent challenge using the same heterogeneous inpatient course found that varying basal from 0.8x to 1.6x under the legacy term barely changed mean glucose and did not materially change nocturnal <54 mg/dL. With the unit-consistent optional gain, basal 0.8x to 1.2x changed mean glucose by roughly 25 mg/dL and increased nocturnal hypoglycemia in the expected direction.

## External residual

In the Emory CGM benchmark, nocturnal CGM hypoglycemia <54 mg/dL occurred in 26% of patients. The current heterogeneous model produces almost no nocturnal <54; hypoglycemia is concentrated in the afternoon after prandial insulin.

This is a structural mismatch. Do not tune stress-trajectory weights, add Gaussian glucose noise, or alter the glulisine kernel to fix a nocturnal residual.

## Decision

- Keep the existing frozen behavior as default for backward compatibility.
- Add and audit the optional unit-consistent basal-dose-deviation potency prior.
- Promote it to V3 external validation only if the mechanism audit passes.
- Re-run Shanghai strict Basal+Regular before any default/global promotion.
- Do not fit the basal gain to Emory; derive it from the simulator's own 1-U integrated prandial potency.
- Glargine U100/U300 temporal profiles remain a separate later step. U100 should remain relatively flat over ~24 h; U300 is flatter/prolonged and must not be represented by an artificial nocturnal peak.

## Status

Experimental / not promoted.
