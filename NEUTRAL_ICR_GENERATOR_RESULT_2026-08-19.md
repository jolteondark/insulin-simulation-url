# Neutral-ICR centered generator validation — 2026-08-19

## Question
Can the excessive hypoglycemia be solved by centering starter meal ICR on each simulated patient's isolated 240-min neutral ICR, while retaining modest log-normal treatment variability?

## Protocol
- N=120 generated T1DM patients, no generator gate
- 7 days, 1 warmup
- rapid scale 0.80
- fast scale 0.80
- finite memory 210 min, coupling 0.28
- setpoint shift +15 mg/dL
- meal gain 5 mg/dL/g at 70 kg, weight exponent 0.65
- zero-area meal-shape alpha 0.10
- neutral ICR derived from isolated 1U insulin and meal response at 240 min
- half-unit dose rounding
- sigma_log grid: current v2 ICR, 0, .05, .10, .15, .20 around neutral ICR

## UOM targets
mean 146.463; SD 56.225; TBR<70 2.057%; TBR<54 .276%; TIR 76.376%; TAR>180 21.567%; ACF 30/60/120/240=.863/.634/.247/-.012.

## Results
Current v2 ICR: median ICR 9.52 vs neutral 10.54 g/U; mean 154.25; SD 64.65; TBR70 7.49%; TBR54 3.41%; TIR 60.97%; TAR180 31.54%; any-check low 18.47%.

Neutral sigma 0: mean 183.14; SD 54.46; TBR70 .34%; TBR54 .02%; TIR 53.36%; TAR180 46.31%; any-check low 1.67%.

Neutral sigma .10: mean 184.02; SD 57.26; TBR70 .82%; TBR54 .11%; TIR 51.10%; TAR180 48.08%.

Neutral sigma .15: mean 184.76; SD 60.58; TBR70 1.39%; TBR54 .33%; TIR 49.44%; TAR180 49.17%.

Neutral sigma .20: mean 184.74; SD 64.06; TBR70 2.22%; TBR54 .78%; TIR 48.32%; TAR180 49.46%; any-check low 6.53%.

## Interpretation
The neutral-ICR hypothesis is only partly correct. Re-centering meal doses on the isolated 240-min neutral ICR removes most hypoglycemia, but produces severe hyperglycemia (~183–185 mg/dL mean). Therefore the current prandial doses are indeed more aggressive than isolated meal-neutral doses, but they are also compensating for a positive slow/basal glucose bias elsewhere in the model.

This explains the apparent paradox: prandial insulin can be locally excessive around meals while total-day mean remains high. The current architecture appears to use meal bolus partly to counter non-prandial hyperglycemic drive, which then creates late postprandial lows.

Prebreakfast also rises from ~148 to ~161 mg/dL under neutral ICR, supporting a non-prandial/slow-side bias rather than a pure meal-dose problem.

## Decision
Do NOT replace starter ICR with neutral ICR alone.
Do NOT conclude that CF/ICR joint dispersion is the sole cause.
Do NOT weaken bolus globally without fixing the slow/basal bias.

Next structural test: retain near-neutral prandial dosing (sigma ~.15–.20) and separately correct the slow/basal mean bias, comparing setpoint/slow requirement/basal activity adjustments while preserving temporal ACF and hypoglycemia targets.

Main remains untouched.