# UOM fat/protein vs meal-aligned delay analysis

Purpose: test whether meal composition explains the clean-meal pattern, especially low +60 min and high +240 min after dinner.

Data source: normalized T1D-UOM nutrition / bolus / CGM.

Strict clean meal reconstruction used for this analysis:
- carbohydrate meal >=10 g
- no other carb-positive nutrition event >5 g from -60 to +240 min
- exactly one meaningful bolus >=1 U from -30 to +240 min
- that bolus must be within +/-30 min of meal
- CGM available near meal, +60, +120, +180 and +240 min

844 meals met the clean criteria; 754 had both fat and protein recorded. Restricting to Breakfast/Lunch/Dinner gave n=714 composition-complete meals.

Main adjusted analysis used carbohydrate amount, meal type and subject effects.

Key findings (per +10 g fat):
- +60 min delta glucose: about -3.1 mg/dL (p=0.026)
- (+180 - +60) delta: about +5.1 mg/dL (p=0.0037)
- (+240 - +60) delta: about +3.8 mg/dL (p=0.065; directionally positive but not conventionally significant)
- absolute +240 delta: no clear independent fat effect

Protein did not show a consistent independent relation to delayed response in the pooled adjusted analysis.

Simple fat quartiles were directionally compatible with early suppression / later redistribution but were confounded by meal size and subject composition.

Meal-specific results were heterogeneous:
- lunch showed a clear fat-associated shift from early to later glucose response
- dinner did not show a stable positive fat effect on +240; in some models higher fat was associated with lower late delta, so fat/protein alone cannot explain the dinner +240 pattern

Interpretation:
1. Fat content is supported as a real modifier of early-vs-mid postprandial timing: higher fat tends to blunt +60 min and shift glucose exposure toward ~180 min.
2. The evidence is weaker for a specific +240 min tail effect.
3. Protein is not currently supported as a strong independent timing parameter from this dataset.
4. Therefore a modest fat-dependent gastric/appearance delay is physiologically and empirically defensible, but it should not be used as the sole mechanism to force the dinner tail to fit.
5. Keep meal-size early saturation as the main structural modifier; fat can be a secondary modifier if later validation confirms benefit.
6. Do not create separate breakfast/lunch/dinner kernels solely from these data yet.

Main branch remains untouched.
