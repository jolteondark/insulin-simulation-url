(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULT_MEALS={breakfast:50,lunch:70,dinner:60};
const PROVISIONAL_SCALE={meal_gain:.030,bolus_gain:.22,basal_gain:.30,endogenous_gain:.30,restore_gain:.006};
const MEAL_RESPONSE_SCALE=0.96;
function roundUnit(x){return Math.max(0,Math.round(Number(x)||0))}
function generatePatient(seed=1){
 if(!window.T2DMPatientPhenotypeV0)throw new Error('T2DMPatientPhenotypeV0 must load first');
 const p=T2DMPatientPhenotypeV0.sample(seed);
 return{patient:p,case:{case_id:'T2-'+String(seed),phenotype:'T2DM',meal_plan_carb_g:{...DEFAULT_MEALS},model_version:'t2dm-v0-variance-exp-2026-08-20'},state:null,history:[]};
}
function suggestOrder(p,meals=DEFAULT_MEALS){
 const ukg=clamp(.18+.42*(1-p.beta_cell_reserve)+.18*(1/p.si_relative-1),.08,.65);
 const tdd=ukg*p.body_weight_kg,basal=.5*tdd,nut=.5*tdd,total=meals.breakfast+meals.lunch+meals.dinner;
 return{breakfast_u:roundUnit(nut*meals.breakfast/total),lunch_u:roundUnit(nut*meals.lunch/total),dinner_u:roundUnit(nut*meals.dinner/total),basal_u:roundUnit(basal)};
}
function betaInsulinUeqPerMin(p,g){
 const e=p.endogenous_insulin,d=Math.max(0,g-e.glucose_threshold_mg_dl),stim=d/(e.halfmax_delta_mg_dl+d||1);
 return e.basal_effect_u_equiv_per_min+e.max_effect_u_equiv_per_min*stim;
}
function mealResponseMultiplier(p){
 return clamp(Math.exp(
   1.5*(0.428-p.beta_cell_reserve)
   +0.60*Math.log(0.965/p.si_relative)
   +0.30*Math.log(p.hepatic_ir/1.072)
 ),0.40,2.20)*MEAL_RESPONSE_SCALE;
}
function simulateDay(p,order,ctx={},seed=1,state=null){
 const n=1441,g=new Float64Array(n),meal={...DEFAULT_MEALS,...(ctx.meal_plan_carb_g||{})},intake={breakfast:1,lunch:1,dinner:1,...(ctx.intake_fraction||{})};
 g[0]=Number(state?.glucose_mg_dl??p.fasting_setpoint_mg_dl);
 const dose={breakfast_u:roundUnit(order.breakfast_u),lunch_u:roundUnit(order.lunch_u),dinner_u:roundUnit(order.dinner_u),basal_u:roundUnit(order.basal_u)};
 const mealEvents=[[480,meal.breakfast*intake.breakfast],[780,meal.lunch*intake.lunch],[1140,meal.dinner*intake.dinner]],bolus=[[465,dose.breakfast_u],[765,dose.lunch_u],[1125,dose.dinner_u]];
 const mealResponse=mealResponseMultiplier(p);
 let mn=g[0],mx=g[0];
 for(let t=0;t<n-1;t++){
   let mealDrive=0;for(const [tm,c] of mealEvents){const dt=t-tm;if(dt>=0&&dt<240)mealDrive+=c*(dt/55)*Math.exp(1-dt/55)*PROVISIONAL_SCALE.meal_gain*mealResponse;}
   let bolusDrive=0;for(const [tb,u] of bolus){const dt=t-tb;if(dt>=0&&dt<300)bolusDrive+=u*(dt/70)*Math.exp(1-dt/70)*PROVISIONAL_SCALE.bolus_gain*p.si_relative;}
   const basalDrive=dose.basal_u/1440*PROVISIONAL_SCALE.basal_gain*p.si_relative;
   const endo=betaInsulinUeqPerMin(p,g[t])*PROVISIONAL_SCALE.endogenous_gain*p.si_relative;
   const hepatic=.016*(p.hepatic_ir-1)+.008*(1-p.beta_cell_reserve);
   const restore=-PROVISIONAL_SCALE.restore_gain*(g[t]-p.fasting_setpoint_mg_dl);
   g[t+1]=g[t]+mealDrive-bolusDrive-basalDrive-endo+hepatic+restore;
   mn=Math.min(mn,g[t+1]);mx=Math.max(mx,g[t+1]);
 }
 const bg={pre_breakfast:g[420],pre_lunch:g[720],pre_dinner:g[1080],bedtime:g[1260]};
 return{bg,min:mn,max:mx,end:g[1440],series:g,order_u:dose,actual_meal_carb_g:{breakfast:meal.breakfast*intake.breakfast,lunch:meal.lunch*intake.lunch,dinner:meal.dinner*intake.dinner},next_state:{glucose_mg_dl:g[1440]},meal_response_multiplier:mealResponse};
}
function playDay(game,order,ctx={},seed=1){const r=simulateDay(game.patient,order,ctx,seed,game.state);game.state=r.next_state;game.history.push({day:game.history.length+1,order_u:r.order_u,meal_carb_g:r.actual_meal_carb_g,bg:r.bg,min:r.min,max:r.max});game.case.previous_order_u=r.order_u;game.case.previous_day_4point_bg_mg_dl=r.bg;return r;}
window.T2DMGameModelV0VarianceExp={version:'0.1-variance-exp-2026-08-20',PROVISIONAL_SCALE,MEAL_RESPONSE_SCALE,generatePatient,suggestOrder,simulateDay,playDay,betaInsulinUeqPerMin,mealResponseMultiplier,roundUnit};
})();