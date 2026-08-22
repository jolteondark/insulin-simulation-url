# Regular-insulin kernel local screen (approximate reimplementation)

Target after excluding the single glulisine basal-bolus session (Shanghai regular-insulin basal-bolus, n=6): pooled mean 154.2 mg/dL, SD 56.7, TBR 1.92%, TIR 68.29%, TAR 29.79%; pre-breakfast/lunch/dinner 140.5/138.7/160.9 mg/dL; patient-mean breakfast delta120 39.6 mg/dL.

A local reimplementation of the experimental physiology screened meal tau 50-80 min, meal duration 180-300 min, regular-insulin tau 110-150 min, insulin duration 420-600 min, and prandial coverage 0.85-0.95. Kernel areas were renormalized so changing duration/tau did not simply change total insulin-vs-meal action.

Representative best directional fits still left pre-lunch glucose too high (~157-165 mg/dL versus observed 138.7), even when delta120 was brought near the observed ~39.6 mg/dL. Example: meal tau 60/duration 300, regular tau 110/duration 540, coverage .90 gave approximately mean 157.6, SD 50.1, TBR 1.63%, TIR 71.5%, TAR 26.9%, pre B/L/D 146/164/147, delta120 38.8.

Decision: do not tune the regular kernel further yet. The next blocking issue is treatment-input interpretation. The earlier breakfast insulin parser summed all subcutaneous insulin recorded around breakfast and may mix basal insulin with regular prandial insulin. Audit drug-name-resolved morning injections before comparing observed units with model prandial units or changing the treatment policy.

This is an exploratory local screen, not a frozen calibration result.
