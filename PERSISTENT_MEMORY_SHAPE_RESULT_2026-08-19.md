# Persistent memory-shape validation — 2026-08-19

## Question
Can the residual long-lag glucose autocorrelation be fixed by shortening the finite-memory basal-requirement state while preserving the improved neutral-ICR / mean-centered slow-state architecture?

Fixed diagnostic architecture:
- mean-preserved slow multiplier: exp(c*z - 0.5*c^2)
- neutral ICR centered, sigma_log = 0
- setpoint shift = -5 mg/dL
- fast scale = 0.80
- rapid scale = 0.80
- zero-area meal shape correction alpha = 0.10
- patient-specific meal kinetics
- N=120, 7d, 1 warmup day

UOM targets: mean 146.463, SD 56.225, TBR70 2.057%, TBR54 0.276%, ACF30/60/120/240 = .863/.634/.247/-.012.

## Memory-only grid, coupling=.28

- memory 210: mean 149.48, SD 53.01, TBR70 3.11, TBR54 .373, ACF .884/.673/.374/.311
- memory 150: mean 148.88, SD 49.65, TBR70 2.25, TBR54 .211, ACF .869/.626/.274/.257
- memory 120: mean 148.52, SD 47.65, TBR70 1.79, TBR54 .133, ACF .856/.591/.202/.221
- memory 90: mean 148.14, SD 45.30, TBR70 1.24, TBR54 .064, ACF .841/.545/.128/.170

Interpretation: shortening memory improves the excessive 120–240 min persistence and reduces hypoglycemia, but also removes too much total variance.

## Memory × coupling compensation

Best tradeoffs from memory 90–150 and coupling .28–.44:

- memory 90, c=.40: mean 147.09, SD 49.88, TBR70 2.80, TBR54 .274, ACF .866/.621/.262/.241
- memory 90, c=.36: mean 147.64, SD 48.63, TBR70 2.26, TBR54 .188, ACF .860/.601/.231/.226
- memory 120, c=.32: mean 148.49, SD 49.77, TBR70 2.39, TBR54 .223, ACF .868/.621/.261/.249
- memory 135, c=.28: mean 148.70, SD 48.68, TBR70 2.03, TBR54 .171, ACF .864/.609/.240/.240
- memory 105, c=.32: mean 148.25, SD 48.49, TBR70 2.09, TBR54 .170, ACF .860/.601/.225/.227

## Decision
A single finite-memory basal-requirement state cannot simultaneously reproduce:
1. UOM marginal SD (~56),
2. UOM TBR,
3. UOM ACF30–120,
4. near-zero UOM ACF240.

Shortening memory fixes the short/intermediate-lag shape but collapses variance. Increasing coupling restores only part of the variance and pushes ACF/tails back upward; ACF240 remains strongly positive (~.23–.25) in the otherwise best conditions.

Therefore do **not** continue tuning memory and coupling as if they were sufficient. The residual variance and the persistent correlation must be represented by separate mechanisms.

Canonical interpretation:
> The model needs a separation between variance amplitude and persistence shape; one slow basal-requirement state is being asked to do both jobs.

Next diagnostic should test a two-component decomposition: a shorter mean-preserved basal-requirement state for physiologic persistence plus a mean-zero transient glucose/fast-disturbance component that supplies variance without creating long-lag persistence. This should be validation-only initially, not promoted to physiology until externally justified.
