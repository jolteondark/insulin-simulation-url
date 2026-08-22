(function(){
// Validation-only helper for v2/state-space-minimal.
// Purpose: decouple carbohydrate glucose appearance gain from treatment ICR.
// This file does not replace engine_v2.js and is not loaded by production pages.

function clamp(x,a,b){return Math.max(a,Math.min(b,x));}

/**
 * Resolve carbohydrate glucose appearance gain in mg/dL per gram of carbohydrate.
 * If an explicit patient value exists, use it. Otherwise fall back to a provisional
 * weight-scaled validation prior that is deliberately independent of ICR/CF.
 *
 * This is a validation parameter, not yet a production-calibrated physiology model.
 */
function mealGlucoseGainMgDlPerG(p){
  if(Number.isFinite(Number(p.carb_glucose_gain_mg_dl_per_g))) {
    return clamp(Number(p.carb_glucose_gain_mg_dl_per_g), 0.2, 8.0);
  }
  const wt = clamp(Number(p.body_weight_kg)||70, 40, 130);
  // Provisional prior: lower distribution-volume effect with larger body size.
  // 70 kg -> 2.0 mg/dL/g before absorption dynamics and restoration.
  return clamp(2.0 * Math.pow(70/wt, 0.65), 0.9, 3.8);
}

/**
 * Legacy coupled gain for direct A/B validation only.
 */
function legacyCoupledMealGain(p, insulinGain){
  return Number(insulinGain) / Math.max(Number(p.icr_g_u)||1, 1e-6);
}

/**
 * Return the per-minute fast meal flux term.
 * mealActivity is normalized carbohydrate appearance in grams/min equivalent.
 * fastScale is the state-space fast variance multiplier.
 */
function decoupledMealFlux(p, mealActivity, fastScale){
  return Number(fastScale) * mealGlucoseGainMgDlPerG(p) * Number(mealActivity);
}

window.MealGainValidationV2 = {
  version: '0.1-validation-only-icr-decoupled',
  mealGlucoseGainMgDlPerG,
  legacyCoupledMealGain,
  decoupledMealFlux
};
})();
