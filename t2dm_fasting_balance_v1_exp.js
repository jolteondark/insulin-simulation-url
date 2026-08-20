(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULTS={start_min:1380,end_min:420,relative_basal_potency:.20};
function inWindow(t,start,end){return start<=end?(t>=start&&t<end):(t>=start||t<end)}
function endogenousUeqPerMin(p,g){
 const e=p.endogenous_insulin||{};
 const threshold=Number(e.glucose_threshold_mg_dl??100),halfmax=Math.max(1,Number(e.halfmax_delta_mg_dl??70));
 const basal=Math.max(0,Number(e.basal_effect_u_equiv_per_min)||0),maxStim=Math.max(0,Number(e.max_effect_u_equiv_per_min)||0);
 const delta=Math.max(0,g-threshold),stim=maxStim*delta/(halfmax+delta);
 return basal+stim;
}
function makeAdjustment(baseModel,opts={}){
 if(!baseModel)throw new Error('base model required');
 const cfg={...DEFAULTS,...opts};
 const gainPerUDay=60.29*clamp(Number(cfg.relative_basal_potency),0,2); // frozen 1.0 unit-consistent audit gain; 0.20=>12.058
 return function(ctx){
   if(!inWindow(ctx.t,cfg.start_min,cfg.end_min))return null;
   const p=ctx.patient,eq=ctx.base_equilibrium_mg_dl,refBasal=Math.max(0,Number(ctx.reference_order_u?.basal_u)||0),actualBasal=Math.max(0,Number(ctx.effective_basal_u)||0);
   const endoEq=endogenousUeqPerMin(p,eq),endoNow=endogenousUeqPerMin(p,ctx.glucose_mg_dl);
   // HGP is expressed in insulin-equivalent U/min and anchored so that each patient's frozen fasting setpoint is balanced under the pre-existing physiology reference basal dose.
   const hgpUeqPerMin=refBasal/1440+endoEq;
   const netUeqPerMin=hgpUeqPerMin-actualBasal/1440-endoNow;
   const drive=gainPerUDay*ctx.effective_insulin_sensitivity*netUeqPerMin;
   return{restore_multiplier:0,drive_mg_dl_per_min:drive,components:{hgp_u_eq_per_min:hgpUeqPerMin,endogenous_u_eq_per_min:endoNow,basal_u_per_min:actualBasal/1440}};
 };
}
function statePatch(baseModel,opts={}){return{basal_delta_gain_per_day:0,fasting_adjustment_fn:makeAdjustment(baseModel,opts)}}
window.T2DMFastingBalanceV1Exp={version:'0.1-anchored-hgp-endo-basal-balance-2026-08-20',DEFAULTS,endogenousUeqPerMin,makeAdjustment,statePatch};
})();
