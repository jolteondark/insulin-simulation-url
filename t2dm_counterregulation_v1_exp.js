(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Experimental low-glucose physiology replacement.
// Human clamp literature reports lower sympathoadrenal activation thresholds during sleep
// (approximately 3.3 mmol/L awake vs 2.7 mmol/L asleep). We round those to 60 and 50 mg/dL.
// No Emory outcome is used to choose these thresholds or the gain.
const AWAKE_THRESHOLD_MG_DL=60;
const SLEEP_THRESHOLD_MG_DL=50;
const LOW_SIDE_SWITCH_MG_DL=80;
function isSleepMinute(t){return t>=1320||t<360}
function adjustment(baseModel,opts={}){
  const reserve=clamp(Number(opts.reserve??1),0,1.5);
  return function({t,glucose_mg_dl}){
    const g=Number(glucose_mg_dl),threshold=isSleepMinute(t)?SLEEP_THRESHOLD_MG_DL:AWAKE_THRESHOLD_MG_DL;
    if(!Number.isFinite(g)||g>=LOW_SIDE_SWITCH_MG_DL)return{restore_multiplier:1,drive_mg_dl_per_min:0};
    // Below 80 mg/dL, remove the generic setpoint tether and replace it with explicit
    // threshold-triggered counterregulation. The slope reuses the already-frozen restore_gain.
    const drive=baseModel.SCALE.restore_gain*reserve*Math.max(0,threshold-g);
    return{restore_multiplier:0,drive_mg_dl_per_min:drive};
  };
}
function statePatch(baseModel,opts={}){return{fasting_adjustment_fn:adjustment(baseModel,opts),counterregulation_model:'thresholded-v1',counterregulatory_reserve:clamp(Number(opts.reserve??1),0,1.5)};}
window.T2DMCounterregulationV1Exp={
 version:'0.1-thresholded-low-side-counterregulation-exp-2026-08-20',
 AWAKE_THRESHOLD_MG_DL,SLEEP_THRESHOLD_MG_DL,LOW_SIDE_SWITCH_MG_DL,isSleepMinute,adjustment,statePatch,
 note:'Experimental only. Replaces generic low-side equilibrium restore below 80 mg/dL with threshold-triggered counterregulation. Thresholds are literature-derived; gain reuses frozen restore_gain. Not calibrated to Emory.'
};
})();
