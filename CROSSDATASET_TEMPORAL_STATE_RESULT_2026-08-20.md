# Cross-dataset temporal-state result — 2026-08-20

## Question
Can the persistent basal-requirement state reproduce realistic glucose autocorrelation without overfitting the UOM 240-minute ACF?

## External temporal targets
- UOM median ACF: 30/60/120/240 min = 0.863 / 0.634 / 0.247 / -0.012
- HUPA median ACF: 0.923 / 0.779 / 0.491 / 0.132

The material disagreement at 240 min means that forcing ACF240 to exactly zero is not justified by the available external data.

## Findings
1. Removing the slow basal-requirement state collapses SD and makes ACF120/240 negative, confirming that the state carries necessary persistent variance.
2. A short zero-DC biphasic requirement state can erase ACF240, but also over-erases ACF120 and underproduces variance.
3. Adding a second ordinary finite-memory component partly restores ACF120 but simultaneously restores ACF240 and hypoglycemia. Triangular, Hann, and Gaussian tapering do not materially solve this tradeoff.
4. A single wider zero-DC biphasic state is simpler and performs better across datasets.

## Cross-dataset finalist
Single biphasic basal-requirement state:
- half-width w = 320 min
- coupling = 0.34
- mean-preserving multiplier exp(c*z - 0.5*c^2)
- existing small zero-area glucose transient: tau 90 min, amplitude 8 mg/dL
- v0.81 S_I + D_insulin generator and neutral-ICR architecture unchanged

N=120 result:
- mean 147.839 mg/dL
- SD 50.179 mg/dL
- TBR <70 2.211%
- TBR <54 0.206%
- TIR 75.775%
- TAR >180 22.013%
- ACF30 0.8592
- ACF60 0.6091
- ACF120 0.2364
- ACF240 0.0835

This closely reproduces UOM ACF30/60/120 while placing ACF240 between UOM (-0.012) and HUPA (+0.132), rather than fitting either dataset's 240-min estimate exactly.

Nearby parsimonious alternatives:
- w=330, c=0.32: mean 148.05, SD 49.67, TBR70 2.07, ACF 0.857/0.605/0.219/0.100
- w=350, c=0.32: mean 148.21, SD 50.50, TBR70 2.22, ACF 0.862/0.617/0.251/0.124

## Interpretation
The simplest current temporal architecture is one zero-DC biphasic basal-requirement state around 320–350 min, not a two-state or tapered-memory construction. This preserves the conceptual role of the state as transient variation in basal insulin requirement while avoiding an indefinite low-frequency drift.

Do not freeze the exact width/coupling yet. Confirm the finalists at N=300 and retain external-data uncertainty in ACF240.

Remaining mismatches should not be forced into this state:
- SD is ~50 vs UOM 56.2, but close to HUPA 51.6.
- unconditional four-check time-of-day pattern remains imperfect.
- four-check any-low remains above UOM in some candidates.
These are candidates for behavioral/context-layer or other variance-source validation rather than further distortion of the basal-requirement state.

Main branch remains untouched.
