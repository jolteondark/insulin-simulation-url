# Basal dose-deviation potency audit

This is a unit-consistency mechanism audit, not outcome calibration. The maintenance basal requirement remains implicit in the frozen fasting equilibrium; only deviations from the reference basal dose are challenged. Unit-consistent gain is derived from the simulator prandial 1-U integrated effect.

Derived unit-consistent daily gain: 60.29 mg/dL-equivalent per U at SI=1.

| mode | basal multiplier | mean glucose | TBR <54 | patients nocturnal <54 |
|---|---:|---:|---:|---:|
| legacy | 0.8 | 229.9 | 0.52% | 0.5% |
| legacy | 1.0 | 229.9 | 0.52% | 0.5% |
| legacy | 1.2 | 229.8 | 0.52% | 0.5% |
| unit_consistent | 0.8 | 257.0 | 0.43% | 0.3% |
| unit_consistent | 1.0 | 244.6 | 0.93% | 1.0% |
| unit_consistent | 1.2 | 232.3 | 1.80% | 3.8% |

## Checks
- PASS — legacy basal response is pathologically weak
- PASS — unit-consistent basal response is materially stronger
- PASS — unit-consistent response is >5x legacy
- PASS — higher basal raises nocturnal <54 incidence

## Guardrails
- Do not fit the derived gain to Emory glucose metrics.
- Existing simulations remain unchanged unless the optional basal_delta_gain_per_day hook is enabled.
- This audit does not establish the final U100/U300 time profile; it only tests missing per-unit potency of basal-dose deviations.
