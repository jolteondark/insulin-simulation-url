# Strict Basal+Regular calibration decision — 2026-08-20

Strict target (17 days, 4 sessions):
- day mean 134.8 ± 31.2 mg/dL
- within-day SD 31.8 ± 18.5 mg/dL
- pre-breakfast 122.8 ± 31.5 mg/dL
- pre-lunch 135.1 ± 57.0 mg/dL
- pre-dinner 124.9 ± 52.4 mg/dL
- +120 glucose 139.7 ± 50.4 mg/dL
- breakfast Δ120 16.8 ± 42.2 mg/dL
- breakfast regular dose 11.1 ± 3.6 U
- TBR 0.50%, TIR 81.58%, TAR 17.92%

Interpretation:
- The previously inferred need to slow the bolus kernel to force breakfast Δ120 to ~40 mg/dL disappears after strict day-level treatment alignment. The current generic kernel produced an approximate mean Δ120 of ~17 mg/dL in the earlier model-side check, essentially matching the strict observed mean 16.8 mg/dL.
- Therefore do not add a new meal-response latent parameter or alter insulin kinetics on the basis of the previous session-level target.
- The large observed SD of Δ120 (42.2 mg/dL) remains potentially interesting, but the target is only 17 days from 4 sessions and is heavily clustered by patient. It should not be fitted directly before a clustered/within-patient analysis and external validation.
- Next model-side comparison should use the current unmodified kernel and a treatment policy aligned to the observed regular-dose distribution rather than reusing previously tuned coverage/noise values from the mixed-regimen target.
- Shanghai remains a development/calibration cohort, not final external validation. Freeze decisions only after an independent cohort check.

Decision: revert to the simpler pre-noise/pre-kernel-change model structure as the reference candidate; treat previous high-variance/high-mean tuning as invalidated by treatment-regimen misalignment.
