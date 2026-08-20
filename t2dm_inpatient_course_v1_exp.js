(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function roundUnit(x){return Math.max(0,Math.round(Number(x)||0))}
function copyOrder(o){return{breakfast_u:roundUnit(o.breakfast_u),lunch_u:roundUnit(o.lunch_u),dinner_u:roundUnit(o.dinner_u),basal_u:roundUnit(o.basal_u)}}
function fourPoint(series){return{pre_breakfast:series[420],pre_lunch:series[720],pre_dinner:series[1080],bedtime:series[1260]}}
function adjustOne(u,bg){
 if(!Number.isFinite(bg))return u;
 if(bg<70)return roundUnit(u-2);
 if(bg<100)return roundUnit(u-1);
 if(bg>250)return roundUnit(u+2);
 if(bg>180)return roundUnit(u+1);
 return roundUnit(u);
}
function titrateOrder(order,bg){
 const o=copyOrder(order);
 // Bedtime basal is adjusted from next-morning fasting; meal doses from the
 // following premeal glucose. Integer-only by ward design.
 o.basal_u=adjustOne(o.basal_u,bg.pre_breakfast);
 o.breakfast_u=adjustOne(o.breakfast_u,bg.pre_lunch);
 o.lunch_u=adjustOne(o.lunch_u,bg.pre_dinner);
 o.dinner_u=adjustOne(o.dinner_u,bg.bedtime);
 return o;
}
function buildDayState(r,day,cfg,course){
 const stress0=clamp(Number(cfg.initial_stress_severity)||0,0,1);
 const stressDecay=clamp(Number(cfg.stress_daily_decay??0.16),0,1);
 const stress=clamp(stress0-day*stressDecay,0,1);
 const state={stress_severity:stress};
 if(day===0)state.admission_glucose_offset_mg_dl=Number(cfg.admission_glucose_offset_mg_dl)||0;
 if(cfg.steroid){state.steroid=true;state.steroid_severity=clamp(Number(cfg.steroid_severity??0.6),0,1)}
 // Procedure/NPO is an environment event, not a patient parameter.
 if(cfg.allow_npo&&day>0&&day<course.days-1&&r()<Number(cfg.npo_day_probability??0.08)){
   const meal=['breakfast','lunch','dinner'][Math.floor(r()*3)];
   state.intake_fraction={[meal]:0};state.bolus_fraction={[meal]:0};
   course.events.push({day:day+1,type:'NPO',meal});
 }else if(cfg.allow_meal_mismatch){
   const intake={},mealShift={},bolusShift={},bolusFrac={};
   for(const meal of ['breakfast','lunch','dinner']){
     const miss=r()<Number(cfg.partial_meal_probability??0.16);
     intake[meal]=miss?0.45+0.35*r():0.85+0.15*r();
     mealShift[meal]=Math.round((r()*2-1)*Number(cfg.meal_shift_max_min??25));
     bolusShift[meal]=Math.round(r()*Number(cfg.bolus_delay_max_min??25));
     bolusFrac[meal]=r()<Number(cfg.underbolus_probability??0.08)?0.65+0.2*r():1;
   }
   state.intake_fraction=intake;state.meal_shift_min=mealShift;state.bolus_shift_min=bolusShift;state.bolus_fraction=bolusFrac;
 }
 return state;
}
function simulateCourse(baseModel,dynamicModel,p,initialOrder,config={},seed=1){
 if(!baseModel||!dynamicModel)throw new Error('baseModel and dynamicModel required');
 const days=Math.max(1,Math.round(config.days||5)),r=rng('course:'+seed);
 const course={days,events:[],records:[]};let order=copyOrder(initialOrder),prevState=null;
 for(let d=0;d<days;d++){
   const state=buildDayState(r,d,config,course);
   const sim=dynamicModel.simulateDay(baseModel,p,order,state,seed*100+d,prevState);
   const bg=fourPoint(sim.series);
   course.records.push({day:d+1,state,order:copyOrder(order),bg,end_glucose:sim.end,series:sim.series});
   prevState=sim.next_state;
   if(config.titrate!==false)order=titrateOrder(order,bg);
 }
 course.final_order=copyOrder(order);return course;
}
window.T2DMInpatientCourseV1Exp={version:'0.1-multiday-state-carryover-2026-08-20',simulateCourse,titrateOrder};
})();
