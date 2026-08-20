# Inpatient trajectory heterogeneity — pre-specified decision rules

## Why this layer exists
The previous 8-day external course used one homogeneous stress-decay path for every patient. That structure can create a cohort-wide late decline in glucose and late hypoglycemia even when patient phenotype and treatment policy are heterogeneous.

Emory provides an external reason to test time-structure heterogeneity: infection was a major admission category (~41%) and the median hospital stay was about 7.5 days. These facts motivate a persistent-inflammatory subgroup, but they do not identify the exact stress amplitude or mixture prevalence.

## Pre-specified trajectories
- persistent_inflammatory: high acute stress with a nonzero late floor
- resolving_acute: high admission stress that largely resolves by day 8
- moderate_stable: lower, persistent stress

No generic glucose noise is added. Renal exposure and steroids remain OFF for the Emory sensitivity analysis.

## Decision rules before seeing the glucose result
Retain the trajectory layer as a useful structural candidate only if:
1. the profile audit preserves the intended ordering without glucose-based tuning;
2. persistent_inflammatory patients remain more hyperglycemic later in the stay than resolving_acute patients under the same treatment policy;
3. heterogeneous trajectories reduce the artificial cohort-wide late glucose collapse seen with one universal decay path;
4. any improvement in mean/TAR/CV is not purchased by an obviously wrong hypoglycemia pattern;
5. nocturnal and severe hypoglycemia are reported separately, not hidden inside pooled TBR;
6. mixture weights are not optimized to match Emory glucose endpoints.

Reject or revise the mechanism if the only way to improve external fit is to tune trajectory weights/amplitudes directly against Emory outcomes.

## External metrics to report
- mean glucose
- TIR 70–180
- TAR >180 and >250
- TBR <70 and <54
- patient incidence of any <70 and any <54
- nocturnal (00:00–06:00) any <54
- CV
- daily mean/TAR/TBR across the 8-day course

## Status
Experimental branch only. Shanghai physiology and Regular-insulin anchor remain frozen. This file is a pre-specified interpretation guardrail, not a calibration target.
