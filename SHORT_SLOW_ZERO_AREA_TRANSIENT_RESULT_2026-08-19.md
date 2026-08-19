# Short slow + zero-area transient result — 2026-08-19

## Question
Can a short basal-requirement state plus a mean-zero / approximately zero-area transient disturbance restore the missing glucose SD without reintroducing long-lag autocorrelation?

## Fixed physiology
- finite-memory slow state: memory 90 min
- basal-requirement coupling: 0.36
- Jensen-centered multiplier: exp(c*z - 0.5*c^2)
- setpoint shift: -5 mg/dL
- neutral ICR, sigma 0
- rapid scale 0.80
- no meal saturation

## Transient construction
A stationary AR(1) latent signal x_t was generated with tau 15–90 min, then glucose received

`transient_t = amp * (x_t - x_{t-1})`

This telescopes over long windows, so the cumulative integral is approximately an endpoint difference rather than a drift. It is therefore a practical zero-area / high-pass disturbance.

Grid:
- tau: 15, 30, 45, 60, 90 min
- amp: 0, 4, 6, 8, 10, 12 mg/dL
- N=120, 7 days, 1 warmup day

## Baseline short-slow state
amp=0:
- mean 147.645
- SD 48.627
- TBR<70 2.257%
- TBR<54 0.188%
- TIR 75.928%
- ACF 30/60/120/240 = 0.860 / 0.601 / 0.231 / 0.226

UOM targets:
- mean 146.463
- SD 56.225
- TBR<70 2.057%
- TBR<54 0.276%
- TIR 76.376%
- ACF = 0.863 / 0.634 / 0.247 / -0.012

## Best scored zero-area condition
Tau 90 min, amp 8:
- mean 147.860
- SD 49.071
- TBR<70 2.360%
- TBR<54 0.288%
- TIR 75.500%
- ACF = 0.855 / 0.599 / 0.223 / 0.214

Other representative condition, tau 45 / amp 6:
- mean 147.792
- SD 48.874
- TBR<70 2.308%
- TBR<54 0.253%
- TIR 75.711%
- ACF = 0.852 / 0.592 / 0.211 / 0.206

## Interpretation
The zero-area transient is structurally safe: it does not create a mean drift and it does not markedly worsen hypoglycemia. However, it adds far too little variance. Even moderate amplitudes increase overall SD by <1 mg/dL from the 48.6 baseline, while also tending to lower ACF30–120.

Therefore:

> A pure high-pass / zero-integral transient cannot supply the missing ~7.6 mg/dL of SD by itself.

and

> The remaining variance must live on a slower scale than minute-to-minute transient noise, but should not generate the observed excessive 240-min persistence.

This points toward a **band-limited disturbance**: variance concentrated around tens of minutes to ~2 h, with explicitly negative/compensating lobes or event-like pulses, rather than either a single persistent slow state or a pure first-difference noise term.

## Next structural candidate
Use a mean-zero event/pulse process with finite support, e.g. positive or negative disturbances whose kernel has a positive lobe followed by a compensating negative lobe, total integral zero, support roughly 2–4 h. This can produce appreciable excursions and SD while forcing covariance to decay/cross zero near 240 min.

Do not change meal saturation, rapid tail, or counterregulation for this purpose.
