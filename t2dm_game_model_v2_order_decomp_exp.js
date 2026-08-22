(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULT_MEALS={breakfast:50,lunch:70,dinner:60};
const SCALE={meal_gain:.025,bolus_gain:.28,basal_delta_gain:.30,restore_gain:.006};
const KERNEL={meal_tau_min:80,meal_duration_min:330,bolus_tau_min:90,bolus_duration_min:330};
const MEAL_RESPONSE_SCALE=.96;
const PRANDIAL_COVERAGE=.90;
function roundUnit(x){return Math.max(0,Math.round(Number(x)||0))}
function gamma1(dt,tau){return (dt/tau)*Math.exp(1-dt/tau)}
function kernelArea(tau,duration){let a=0;for(let dt=0;dt<duration;dt++)a+=gamma1(dt,tau);return a}
const MEAL_AREA=kernelArea(KERNEL.meal_tau_min,KERNEL.meal_duration_min);
const BOLUS_AREA=kernelArea(KERNEL.bolus_tau_min,KERNEL.bolus_duration_min);
const BALANCE_U_PER_G=(SCALE.meal_gain*MEAL_AREA)/(SCALE.bolus_gain*BOLUS_AREA);
function mealResponseMultiplier(p){return clamp(Math.exp(1.5*(0.428-p.beta_cell_reserve)+0.60*Math.log(0.965/p.si_relative)+0.30*Math.log(p.hepatic_ir/1.072)),0.40,2.20)*MEAL_RESPONSE_SCALE}
function maintenanceBasalReference(p){
 const ukg=clamp(.18+.42*(1-p.beta_cell_reserve)+.18*(1/p.si_relative-1),.08,.65);
 return roundUnit(.5*ukg*p.body_weight_kg);
}
function suggestOrder(p,meals=DEFAULT_MEALS){
 const mr=mealResponseMultiplier(p);
 const uPerG=PRANDIAL_COVERAGE*BALANCE_U_PER_G*mr/p.si_relative;
 return{
  breakfast_u:roundUnit(meals.breakfast*uPerG),
  lunch_u:roundUnit(meals.lunch*uPerG),
  dinner_u:roundUnit(meals.dinner*uPerG),
  basal_u:maintenanceBasalReference(p)
 };
}
function generatePatient(seed=1){
 if(!window.T2DMPatientPhenotypeV2Shanghai106Exp)throw new Error('T2DMPatientPhenotypeV2Shanghai106Exp must load first');
 const p=T2DMPatientPhenotypeV2Shanghai106Exp.sample(seed);
 return{patient:p,case:{case_id:'T2V2D-'+String(seed),phenotype:'T2DM',meal_plan_carb_g:{...DEFAULT_MEALS},model_version:'t2dm-v2-order-decomp-exp-2026-08-20'},state:null,history:[]};
}
function simulateDay(p,order,ctx={},seed=1,state=null){
 const n=1441,g=new Float64Array(n),meal={...DEFAULT_MEALS,...(ctx.meal_plan_carb_g||{})},intake={breakfast:1,lunch:1,dinner:1,...(ctx.intake_fraction||{})};
 const equilibrium=Number(p.dynamic_fasting_setpoint_mg_dl??p.fasting_setpoint_mg_dl); g[0]=Number(state?.glucose_mg_dl??equilibrium);
 const dose={breakfast_u:roundUnit(order.breakfast_u),lunch_u:roundUnit(order.lunch_u),dinner_u:roundUnit(order.dinner_u),basal_u:roundUnit(order.basal_u)};
 const reference=suggestOrder(p,meal);
 const mealEvents=[[480,meal.breakfast*intake.breakfast],[780,meal.lunch*intake.lunch],[1140,meal.dinner*intake.dinner]],bolus=[[465,dose.breakfast_u],[765,dose.lunch_u],[1125,dose.dinner_u]];
 const mr=mealResponseMultiplier(p); let mn=g[0],mx=g[0];
 for(let t=0;t<n-1;t++){
  let mealDrive=0;for(const [tm,c] of mealEvents){const dt=t-tm;if(dt>=0&&dt<KERNEL.meal_duration_min)mealDrive+=c*gamma1(dt,KERNEL.meal_tau_min)*SCALE.meal_gain*mr}
  let bolusDrive=0;for(const [tb,u] of bolus){const dt=t-tb;if(dt>=0&&dt<KERNEL.bolus_duration_min)bolusDrive+=u*gamma1(dt,KERNEL.bolus_tau_min)*SCALE.bolus_gain*p.si_relative}
  const basalDelta=(dose.basal_u-reference.basal_u)/1440*SCALE.basal_delta_gain*p.si_relative;
  const restore=-SCALE.restore_gain*(g[t]-equilibrium);
  g[t+1]=g[t]+mealDrive-bolusDrive-basalDelta+restore;mn=Math.min(mn,g[t+1]);mx=Math.max(mx,g[t+1]);
 }
 return{series:g,min:mn,max:mx,end:g[1440],bg:{pre_breakfast:g[420],pre_lunch:g[720],pre_dinner:g[1080],bedtime:g[1260]},order_u:dose,reference_order_u:reference,next_state:{glucose_mg_dl:g[1440]},equilibrium_mg_dl:equilibrium,meal_response_multiplier:mr,prandial_balance_u_per_g:BALANCE_U_PER_G,prandial_coverage:PRANDIAL_COVERAGE};
}
window.T2DMGameModelV2OrderDecompExp={version:'0.1-order-decomp-exp-2026-08-20',DEFAULT_MEALS,SCALE,KERNEL,PRANDIAL_COVERAGE,BALANCE_U_PER_G,generatePatient,suggestOrder,simulateDay,mealResponseMultiplier,maintenanceBasalReference};
})();