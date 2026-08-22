(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function gamma1(dt,tau){return (dt/tau)*Math.exp(1-dt/tau)}
function kernelArea(tau,duration){let a=0;for(let dt=0;dt<duration;dt++)a+=gamma1(dt,tau);return a}
function simulateDay(baseModel,p,order,state={},seed=1,prevState=null){
 if(!baseModel)throw new Error('base model required');
 const n=1441,g=new Float64Array(n),S=baseModel.SCALE,K=baseModel.KERNEL;
 const mealPlan={...baseModel.DEFAULT_MEALS,...(state.meal_plan_carb_g||{})};
 const intake={breakfast:1,lunch:1,dinner:1,...(state.intake_fraction||{})};
 const mealShift={breakfast:0,lunch:0,dinner:0,...(state.meal_shift_min||{})};
 const bolusShift={breakfast:0,lunch:0,dinner:0,...(state.bolus_shift_min||{})};
 const bolusFrac={breakfast:1,lunch:1,dinner:1,...(state.bolus_fraction||{})};
 const pocCfg={breakfast:420,lunch:720,dinner:1080,...(state.prandial_poc_min||{})};
 const prandialPocMin={breakfast:Math.max(0,Math.min(1439,Math.round(Number(pocCfg.breakfast)))),lunch:Math.max(0,Math.min(1439,Math.round(Number(pocCfg.lunch)))),dinner:Math.max(0,Math.min(1439,Math.round(Number(pocCfg.dinner))))};
 const dose={breakfast_u:Math.max(0,Math.round(order.breakfast_u||0)),lunch_u:Math.max(0,Math.round(order.lunch_u||0)),dinner_u:Math.max(0,Math.round(order.dinner_u||0)),basal_u:Math.max(0,Math.round(order.basal_u||0))};
 const ref=baseModel.suggestOrder(p,mealPlan);
 const effectiveBasalU=Number.isFinite(Number(state.effective_basal_u))?Math.max(0,Number(state.effective_basal_u)):dose.basal_u;
 const insulinExposureMultiplier=clamp(Number(state.insulin_exposure_multiplier)||1,0.70,1.35);
 const basalDeltaGainPerDay=Number.isFinite(Number(state.basal_delta_gain_per_day))?Math.max(0,Number(state.basal_delta_gain_per_day)):S.basal_delta_gain;
 const fastingAdjustmentFn=typeof state.fasting_adjustment_fn==='function'?state.fasting_adjustment_fn:null;
 const bedtimeCorrectionFn=typeof state.bedtime_correction_fn==='function'?state.bedtime_correction_fn:null;
 const scheduledCorrectionFn=typeof state.scheduled_correction_fn==='function'?state.scheduled_correction_fn:null;
 const scheduledCorrectionMinutes=new Set(Array.isArray(state.scheduled_correction_minutes)?state.scheduled_correction_minutes.map(x=>Math.max(0,Math.min(1439,Math.round(Number(x))))).filter(Number.isFinite):[]);
 const basalProfileFn=typeof state.basal_profile_fn==='function'?state.basal_profile_fn:null;
 const hypoglycemiaRescueFn=typeof state.hypoglycemia_rescue_fn==='function'?state.hypoglycemia_rescue_fn:null;
 const prandialSafetyAdjustmentFn=typeof state.prandial_safety_adjustment_fn==='function'?state.prandial_safety_adjustment_fn:null;
 const prandialMassActionLowSide=state.prandial_mass_action_low_side===true;
 const bedtimeCorrectionMin=Math.max(0,Math.min(1439,Math.round(Number(state.bedtime_correction_min??1260))));
 const bolusTau=Math.max(20,Number(state.bolus_tau_min)||K.bolus_tau_min);
 const bolusDuration=Math.max(60,Math.round(Number(state.bolus_duration_min)||K.bolus_duration_min));
 const bolusAreaNorm=kernelArea(K.bolus_tau_min,K.bolus_duration_min)/kernelArea(bolusTau,bolusDuration);
 const rescueTau=Math.max(5,Number(state.rescue_tau_min)||20);
 const rescueDuration=Math.max(30,Math.round(Number(state.rescue_duration_min)||120));
 const rescueAreaNorm=kernelArea(K.meal_tau_min,K.meal_duration_min)/kernelArea(rescueTau,rescueDuration);
 const meals=[[480+mealShift.breakfast,mealPlan.breakfast*intake.breakfast],[780+mealShift.lunch,mealPlan.lunch*intake.lunch],[1140+mealShift.dinner,mealPlan.dinner*intake.dinner]];
 const bolus=[[465+bolusShift.breakfast,dose.breakfast_u*clamp(bolusFrac.breakfast,0,1.5)],[765+bolusShift.lunch,dose.lunch_u*clamp(bolusFrac.lunch,0,1.5)],[1125+bolusShift.dinner,dose.dinner_u*clamp(bolusFrac.dinner,0,1.5)]];
 const mealBolusMeta=[{meal:'breakfast',poc_min:prandialPocMin.breakfast,index:0,adjusted:false},{meal:'lunch',poc_min:prandialPocMin.lunch,index:1,adjusted:false},{meal:'dinner',poc_min:prandialPocMin.dinner,index:2,adjusted:false}];
 const observedPoc={},prandialSafetyAdjustments=[];
 const bedtimeCorrections=[],scheduledCorrections=[],hypoglycemiaRescues=[],rescueCarbEvents=[];
 let nextRescueAllowedMin=-1;
 const baseEq=Number(p.dynamic_fasting_setpoint_mg_dl??p.fasting_setpoint_mg_dl);
 const prandialMassActionReference=Number.isFinite(Number(state.prandial_mass_action_reference_mg_dl))?Math.max(1,Number(state.prandial_mass_action_reference_mg_dl)):baseEq;
 const admissionOffset=Number(state.admission_glucose_offset_mg_dl)||0;
 const initialFromState=clamp(baseEq+admissionOffset,40,500);
 g[0]=Number(prevState?.glucose_mg_dl??initialFromState);
 const baseMr=baseModel.mealResponseMultiplier(p);
 function stressAt(t){
   if(Array.isArray(state.stress_blocks)){
     let s=0;for(const b of state.stress_blocks){if(t>=b.start_min&&t<b.end_min)s=Math.max(s,Number(b.severity)||0)}return clamp(s,0,1);
   }
   return clamp(Number(state.stress_severity)||0,0,1);
 }
 function steroidAt(t){
   const sev=clamp(Number(state.steroid_severity)||0,0,1);if(!state.steroid||sev<=0)return 0;
   const peak=state.steroid_peak_min??960, width=state.steroid_width_min??300;
   const z=(t-peak)/width;return sev*Math.exp(-0.5*z*z);
 }
 let mn=g[0],mx=g[0];
 for(let t=0;t<n-1;t++){
   const stress=stressAt(t), steroid=steroidAt(t);
   const si=clamp(p.si_relative*(1-0.35*stress)*(1-0.25*steroid),0.20,1.45);
   const effectiveInsulinSensitivity=si*insulinExposureMultiplier;
   const mr=baseMr*(1+0.35*stress+0.20*steroid);
   const eq=clamp(baseEq+45*stress+20*steroid,55,360);
   for(const meta of mealBolusMeta)if(t===meta.poc_min)observedPoc[meta.meal]=g[t];
   if(prandialSafetyAdjustmentFn){
     for(const meta of mealBolusMeta){
       const b=bolus[meta.index];
       if(meta.adjusted||t!==Math.round(b[0]))continue;
       meta.adjusted=true;
       const poc=Number(observedPoc[meta.meal]);
       if(!Number.isFinite(poc))continue;
       const planned=Math.max(0,Math.round(Number(b[1])||0));
       const raw=prandialSafetyAdjustmentFn({meal:meta.meal,t,poc_min:meta.poc_min,poc_glucose_mg_dl:poc,planned_units:planned,patient:p,order_u:dose,state});
       const given=Math.max(0,Math.round(Number(raw)));
       if(Number.isFinite(given)){
         b[1]=given;
         if(given!==planned)prandialSafetyAdjustments.push({meal:meta.meal,poc_min:meta.poc_min,poc_glucose_mg_dl:poc,bolus_min:t,planned_units:planned,given_units:given});
       }
     }
   }
   if(scheduledCorrectionFn&&scheduledCorrectionMinutes.has(t)){
     const raw=scheduledCorrectionFn({t,glucose_mg_dl:g[t],patient:p,order_u:dose,si_relative:si,effective_insulin_sensitivity:effectiveInsulinSensitivity,state,prior_corrections:scheduledCorrections.slice()});
     let u=0,label='scheduled_correction';
     if(Number.isFinite(Number(raw)))u=Math.max(0,Math.round(Number(raw)));
     else if(raw&&typeof raw==='object'){
       u=Math.max(0,Math.round(Number(raw.units)||0));
       if(raw.label)label=String(raw.label);
     }
     if(u>0){bolus.push([t,u]);scheduledCorrections.push({minute:t,glucose_mg_dl:g[t],units:u,label});}
   }
   if(bedtimeCorrectionFn&&t===bedtimeCorrectionMin){
     const raw=bedtimeCorrectionFn({t,glucose_mg_dl:g[t],patient:p,order_u:dose,si_relative:si,effective_insulin_sensitivity:effectiveInsulinSensitivity,state});
     const u=Math.max(0,Math.round(Number(raw)||0));
     if(u>0){bolus.push([t,u]);bedtimeCorrections.push({minute:t,glucose_mg_dl:g[t],units:u});}
   }
   if(hypoglycemiaRescueFn&&t>=nextRescueAllowedMin){
     const raw=hypoglycemiaRescueFn({t,glucose_mg_dl:g[t],patient:p,order_u:dose,si_relative:si,effective_insulin_sensitivity:effectiveInsulinSensitivity,state,prior_rescues:hypoglycemiaRescues.slice()});
     let carbs=0,cooldown=15,label='fast_carbohydrate';
     if(Number.isFinite(Number(raw)))carbs=Math.max(0,Number(raw));
     else if(raw&&typeof raw==='object'){
       carbs=Math.max(0,Number(raw.carbs_g)||0);
       cooldown=Math.max(1,Math.round(Number(raw.cooldown_min)||15));
       if(raw.label)label=String(raw.label);
     }
     if(carbs>0){rescueCarbEvents.push([t,carbs]);hypoglycemiaRescues.push({minute:t,glucose_mg_dl:g[t],carbs_g:carbs,label});nextRescueAllowedMin=t+cooldown;}
   }
   let mealDrive=0;for(const [tm,c] of meals){const dt=t-tm;if(dt>=0&&dt<K.meal_duration_min)mealDrive+=c*gamma1(dt,K.meal_tau_min)*S.meal_gain*mr}
   for(const [tm,c] of rescueCarbEvents){const dt=t-tm;if(dt>=0&&dt<rescueDuration)mealDrive+=c*gamma1(dt,rescueTau)*rescueAreaNorm*S.meal_gain*mr}
   const prandialMassAction=prandialMassActionLowSide?clamp(g[t]/prandialMassActionReference,0,1):1;
   let bolusDrive=0;for(const [tb,u] of bolus){const dt=t-tb;if(dt>=0&&dt<bolusDuration)bolusDrive+=u*gamma1(dt,bolusTau)*bolusAreaNorm*S.bolus_gain*effectiveInsulinSensitivity*prandialMassAction}
   const basalDelta=(effectiveBasalU-ref.basal_u)/1440*basalDeltaGainPerDay*effectiveInsulinSensitivity;
   let basalProfileDrive=0;
   if(basalProfileFn){
     const mult=clamp(Number(basalProfileFn({t,patient:p,order_u:dose,effective_basal_u:effectiveBasalU,reference_basal_u:ref.basal_u}))||1,0.5,1.5);
     basalProfileDrive=(effectiveBasalU/1440)*basalDeltaGainPerDay*effectiveInsulinSensitivity*(mult-1);
   }
   let restore=-S.restore_gain*(g[t]-eq),fastingDrive=0;
   if(fastingAdjustmentFn){
     const adj=fastingAdjustmentFn({t,glucose_mg_dl:g[t],patient:p,order_u:dose,reference_order_u:ref,effective_basal_u:effectiveBasalU,si_relative:si,effective_insulin_sensitivity:effectiveInsulinSensitivity,base_equilibrium_mg_dl:baseEq,equilibrium_mg_dl:eq,stress_severity:stress,steroid_severity:steroid,basal_delta_gain_per_day:basalDeltaGainPerDay});
     if(adj&&typeof adj==='object'){
       if(Number.isFinite(Number(adj.restore_multiplier)))restore*=clamp(Number(adj.restore_multiplier),0,2);
       if(Number.isFinite(Number(adj.drive_mg_dl_per_min)))fastingDrive+=Number(adj.drive_mg_dl_per_min);
     }
   }
   g[t+1]=g[t]+mealDrive-bolusDrive-basalDelta-basalProfileDrive+restore+fastingDrive;mn=Math.min(mn,g[t+1]);mx=Math.max(mx,g[t+1]);
 }
 return{series:g,min:mn,max:mx,end:g[1440],order_u:dose,effective_basal_u:effectiveBasalU,insulin_exposure_multiplier:insulinExposureMultiplier,basal_delta_gain_per_day:basalDeltaGainPerDay,prandial_mass_action_low_side:prandialMassActionLowSide,prandial_mass_action_reference_mg_dl:prandialMassActionReference,bedtime_corrections:bedtimeCorrections,scheduled_corrections:scheduledCorrections,prandial_safety_adjustments:prandialSafetyAdjustments,hypoglycemia_rescues:hypoglycemiaRescues,rescue_kernel:{tau_min:rescueTau,duration_min:rescueDuration,area_norm:rescueAreaNorm},bolus_kernel:{tau_min:bolusTau,duration_min:bolusDuration,area_norm:bolusAreaNorm},next_state:{glucose_mg_dl:g[1440]},inpatient_dynamic_state:state};
}
window.T2DMInpatientDynamicV1ScheduledCorrectionExp={version:'0.2-optional-poc-timing-and-scheduled-correction-exp-2026-08-22',simulateDay};
})();
