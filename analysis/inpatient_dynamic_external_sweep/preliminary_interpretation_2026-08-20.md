# Preliminary interpretation — inpatient dynamic state external validation

Status: exploratory; do not treat as calibrated parameters.

External benchmark motivating this work: Emory general-ward T2DM basal-bolus CGM showed much higher mean glucose and glycemic variability than the Shanghai-calibrated frozen model.

Current mechanism attribution from deterministic sensitivity experiments:

1. Acute stress / infection state moves mean glucose and TAR in the correct direction, but a day-constant or single-block stress state is insufficient to reproduce observed CV.
2. Meal intake/timing mismatch increases within-day variability and TBR. Strong mismatch overshoots hypoglycemia before reaching the external CV target; therefore it should not be used as the sole variance mechanism.
3. Bolus delay or partial under-delivery selectively increases hyperglycemic excursions, but alone remains insufficient.
4. Admission/decompensation state (starting above treated equilibrium) improves mean/TAR/CV simultaneously and is mechanistically distinct from permanent phenotype. Retain it as a candidate state variable.
5. Even combined mechanistic states remain below the external CV target in preliminary sweeps. Do not add generic Gaussian glucose noise yet. The next search should focus on additional clinically interpretable high-side variability: evolving stress, treatment changes/corrections, procedures/NPO transitions, and multi-day state carryover.

Model-development decision:
- Keep Shanghai phenotype and core glucose kernel frozen.
- Keep inpatient states outside permanent patient phenotype.
- Retain acute stress, steroid exposure, meal intake/timing, bolus timing/delivery, NPO, and admission glucose offset as experimental state/environment variables.
- Do not calibrate any single state severity from the Emory aggregate cohort.
- Require improvement across mean/TIR/TAR/TBR/CV jointly before accepting a state model.
