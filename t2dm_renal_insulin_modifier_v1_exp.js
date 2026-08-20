(function(){
'use strict';
// Conservative renal insulin-exposure modifier for V3 extension work.
// This is not a fitted glucose parameter. It encodes the clinically established
// direction that exogenous insulin clearance falls as kidney function declines.
// Evidence guardrail: normal/mild CKD remains exactly 1.0; advanced CKD is capped
// at +20% exposure pending dedicated renal-cohort validation.
function exposureMultiplier(patient){
  const e=Number(patient&&patient.egfr_ml_min_1_73m2);
  if(!Number.isFinite(e)||e>=60)return 1.00;
  if(e>=45)return 1.05;
  if(e>=30)return 1.10;
  if(e>=15)return 1.15;
  return 1.20;
}
window.T2DMRenalInsulinModifierV1Exp={
  version:'0.1-conservative-egfr-insulin-exposure-2026-08-20',
  exposureMultiplier,
  note:'Optional V3 renal physiology extension. No effect at eGFR >=60; capped at 1.20. Do not use as a treatment-policy input beyond observable eGFR dose-reduction rules.'
};
})();
