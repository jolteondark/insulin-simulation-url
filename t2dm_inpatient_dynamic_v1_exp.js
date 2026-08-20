(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function gamma1(dt,tau){return (dt/tau)*Math.exp(1-dt/tau)}
function simulateDay(baseModel,p,order,state={},seed=1,prevState=null){
 if(!baseModel)throw new Error('base model required');
 const n=1441,g=new Float64Array(n),S=baseModel.SCALE,K=baseModel.KERNEL;
 const mealPlan={...baseModel.DEFAULT_MEALS,...(state.meal_plan_carb_g||{})};
 const intake={breakfast:1,lunch:1,dinner:1,...(state.intake_fraction||{})};
 const mealShift={breakfast:0,lunch:0,dinner:0,...(state.meal_shift_min||{})};
 const bolusShift={breakfast:0,lunch:0,dinner:0,...(state.bolus_shift_min||{})};
 const bolusFrac={breakfast:1,lunch:1,dinner:1,...(state.bolus_fraction||{})};
 const dose={breakfast_u:Math.max(0,Math.round(order.breakfast_u||0)),lunch_u:Math.max(0,Math.round(order.lunch_u||0)),dinner_u:Math.max(0,Math.round(order.dinner_u||0)),basal_u:Math.max(0,Math.round(order.basal_u||0))};
 const ref=baseModel.suggestOrder(p,mealPlan);
 const meals=[[480+mealShift.breakfast,mealPlan.breakfast*intake.breakfast],[780+mealShift.lunch,mealPlan.lunch*intake.lunch],[1140+mealShift.dinner,mealPlan.dinner*intake.dinner]];
 const bolus=[[465+bolusShift.breakfast,dose.breakfast_u*clamp(bolusFrac.breakfast,0,1.5)],[765+bolusShift.lunch,dose.lunch_u*clamp(bolusFrac.lunch,0,1.5)],[1125+bolusShift.dinner,dose.dinner_u*clamp(bolusFrac.dinner,0,1.5)]];
 const baseEq=Number(p.dynamic_fasting_setpoint_mg_dl??p.fasting_setpoint_mg_dl);
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
   const mr=baseMr*(1+0.35*stress+0.20*steroid);
   const eq=clamp(baseEq+45*stress+20*steroid,55,360);
   let mealDrive=0;for(const [tm,c] of meals){const dt=t-tm;if(dt>=0&&dt<K.meal_duration_min)mealDrive+=c*gamma1(dt,K.meal_tau_min)*S.meal_gain*mr}
   let bolusDrive=0;for(const [tb,u] of bolus){const dt=t-tb;if(dt>=0&&dt<K.bolus_duration_min)bolusDrive+=u*gamma1(dt,K.bolus_tau_min)*S.bolus_gain*si}
   const basalDelta=(dose.basal_u-ref.basal_u)/1440*S.basal_delta_gain*si;
   const restore=-S.restore_gain*(g[t]-eq);
   g[t+1]=g[t]+mealDrive-bolusDrive-basalDelta+restore;mn=Math.min(mn,g[t+1]);mx=Math.max(mx,g[t+1]);
 }
 return{series:g,min:mn,max:mx,end:g[1440],order_u:dose,next_state:{glucose_mg_dl:g[1440]},inpatient_dynamic_state:state};
}
window.T2DMInpatientDynamicV1Exp={version:'0.3-admission-state-and-treatment-environment-2026-08-20',simulateDay};
})();
