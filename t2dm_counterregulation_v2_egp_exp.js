(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const AWAKE_THRESHOLD_MG_DL=60;
const SLEEP_THRESHOLD_MG_DL=50;
const LOW_SIDE_SWITCH_MG_DL=80;
// Davis & Shamoon 1991: glucose-production increment during 3.0 mmol/L hypoglycemia
// = 12.88 umol/kg/min. Glucose MW 180 mg/mmol => 2.3184 mg/kg/min.
const HEALTHY_COUNTERREG_EGP_INCREMENT_MG_KG_MIN=12.88*0.18;
// Standard one-pool human glucose distribution-space approximation.
const GLUCOSE_DISTRIBUTION_VOLUME_L_KG=0.20;
// Same study: antecedent/recurrent hypoglycemia reduced Ra response by 32%.
const ANTECEDENT_HYPO_RESERVE=0.68;
function isSleepMinute(t){return t>=1320||t<360}
function maxDriveMgDlMin(egpIncrementMgKgMin=HEALTHY_COUNTERREG_EGP_INCREMENT_MG_KG_MIN,vgLKg=GLUCOSE_DISTRIBUTION_VOLUME_L_KG){
  const egp=Math.max(0,Number(egpIncrementMgKgMin)||0),vg=Math.max(.05,Number(vgLKg)||GLUCOSE_DISTRIBUTION_VOLUME_L_KG);
  // (mg/kg/min) / (L/kg * 10 dL/L) = mg/dL/min. Body weight cancels.
  return egp/(vg*10);
}
function activation(depthMgDl,widthMgDl){
  const d=Math.max(0,Number(depthMgDl)||0),w=Math.max(1,Number(widthMgDl)||10);
  return 1-Math.exp(-d/w);
}
function adjustment(baseModel,opts={}){
  const reserve=clamp(Number(opts.reserve??1),0,1.5);
  const width=Math.max(1,Number(opts.activation_width_mg_dl)||10);
  const egpIncrement=Math.max(0,Number(opts.egp_increment_mg_kg_min??HEALTHY_COUNTERREG_EGP_INCREMENT_MG_KG_MIN));
  const vg=Math.max(.05,Number(opts.glucose_distribution_volume_l_kg??GLUCOSE_DISTRIBUTION_VOLUME_L_KG));
  const maxDrive=maxDriveMgDlMin(egpIncrement,vg)*reserve;
  return function({t,glucose_mg_dl}){
    const g=Number(glucose_mg_dl),threshold=isSleepMinute(t)?SLEEP_THRESHOLD_MG_DL:AWAKE_THRESHOLD_MG_DL;
    if(!Number.isFinite(g)||g>=LOW_SIDE_SWITCH_MG_DL)return{restore_multiplier:1,drive_mg_dl_per_min:0};
    if(g>=threshold)return{restore_multiplier:0,drive_mg_dl_per_min:0};
    const depth=threshold-g;
    return{restore_multiplier:0,drive_mg_dl_per_min:maxDrive*activation(depth,width)};
  };
}
function statePatch(baseModel,opts={}){
  const reserve=clamp(Number(opts.reserve??1),0,1.5),width=Math.max(1,Number(opts.activation_width_mg_dl)||10);
  const egpIncrement=Math.max(0,Number(opts.egp_increment_mg_kg_min??HEALTHY_COUNTERREG_EGP_INCREMENT_MG_KG_MIN));
  const vg=Math.max(.05,Number(opts.glucose_distribution_volume_l_kg??GLUCOSE_DISTRIBUTION_VOLUME_L_KG));
  return{fasting_adjustment_fn:adjustment(baseModel,{...opts,reserve,activation_width_mg_dl:width,egp_increment_mg_kg_min:egpIncrement,glucose_distribution_volume_l_kg:vg}),counterregulation_model:'thresholded-egp-v2',counterregulatory_reserve:reserve,counterregulatory_activation_width_mg_dl:width,counterregulatory_egp_increment_mg_kg_min:egpIncrement,counterregulatory_glucose_distribution_volume_l_kg:vg,counterregulatory_max_drive_mg_dl_min:maxDriveMgDlMin(egpIncrement,vg)*reserve};
}
window.T2DMCounterregulationV2EgpExp={
 version:'0.1-physiology-grounded-saturating-egp-exp-2026-08-20',
 AWAKE_THRESHOLD_MG_DL,SLEEP_THRESHOLD_MG_DL,LOW_SIDE_SWITCH_MG_DL,
 HEALTHY_COUNTERREG_EGP_INCREMENT_MG_KG_MIN,GLUCOSE_DISTRIBUTION_VOLUME_L_KG,ANTECEDENT_HYPO_RESERVE,
 isSleepMinute,maxDriveMgDlMin,activation,adjustment,statePatch,
 note:'Experimental structural physiology. Below 80 mg/dL the generic setpoint tether is removed. Counterregulation begins below literature-derived awake/sleep thresholds and saturates toward an independently measured glucose-production increment. Max drive is derived dimensionally from EGP increment and glucose distribution volume; no Emory outcome is used. Activation width remains structural sensitivity only.'
};
})();
