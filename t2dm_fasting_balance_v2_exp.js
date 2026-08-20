(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULTS={start_min:1380,end_min:420,relative_basal_potency:.20};
function inWindow(t,start,end){return start<=end?(t>=start&&t<end):(t>=start||t<end)}
function endogenousParts(p,g){
 const e=p.endogenous_insulin||{};
 const threshold=Number(e.glucose_threshold_mg_dl??100),halfmax=Math.max(1,Number(e.halfmax_delta_mg_dl??70));
 const basal=Math.max(0,Number(e.basal_effect_u_equiv_per_min)||0),maxStim=Math.max(0,Number(e.max_effect_u_equiv_per_min)||0);
 const delta=Math.max(0,g-threshold),stim=maxStim*delta/(halfmax+delta);
 const derivative=g>threshold?maxStim*halfmax/Math.pow(halfmax+delta,2):0;
 return{total:basal+stim,derivative,threshold,halfmax,maxStim};
}
function makeAdjustment(baseModel,opts={}){
 if(!baseModel)throw new Error('base model required');
 const cfg={...DEFAULTS,...opts},gainPerUDay=60.29*clamp(Number(cfg.relative_basal_potency),0,2),restoreGain=Number(baseModel.SCALE?.restore_gain)||0.006;
 return function(ctx){
   if(!inWindow(ctx.t,cfg.start_min,cfg.end_min))return null;
   const eq=ctx.base_equilibrium_mg_dl,now=endogenousParts(ctx.patient,ctx.glucose_mg_dl),atEq=endogenousParts(ctx.patient,eq);
   let homeostaticDrive;
   // Match the legacy local restoring slope exactly at the patient's fasting setpoint, but retain the endogenous-insulin saturation shape away from that point.
   if(atEq.derivative>1e-8)homeostaticDrive=-restoreGain*(now.total-atEq.total)/atEq.derivative;
   else homeostaticDrive=-restoreGain*(ctx.glucose_mg_dl-eq);
   // Basal dose deviation keeps the already-frozen 0.20 potency and is not renormalized by the slope-matching step.
   const refBasal=Math.max(0,Number(ctx.reference_order_u?.basal_u)||0),actualBasal=Math.max(0,Number(ctx.effective_basal_u)||0);
   const basalDrive=-gainPerUDay*ctx.effective_insulin_sensitivity*(actualBasal-refBasal)/1440;
   return{restore_multiplier:0,drive_mg_dl_per_min:homeostaticDrive+basalDrive,components:{homeostatic_drive_mg_dl_per_min:homeostaticDrive,basal_drive_mg_dl_per_min:basalDrive,endo_u_eq_per_min:now.total,endo_eq_u_eq_per_min:atEq.total,endo_derivative_at_eq:atEq.derivative}};
 };
}
function statePatch(baseModel,opts={}){return{basal_delta_gain_per_day:0,fasting_adjustment_fn:makeAdjustment(baseModel,opts)}}
window.T2DMFastingBalanceV2Exp={version:'0.1-slope-matched-endo-feedback-2026-08-20',DEFAULTS,endogenousParts,makeAdjustment,statePatch};
})();
