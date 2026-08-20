(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const roundUnit=x=>Math.max(0,Math.round(Number(x)||0));

// Treatment-policy layer only. This does not change physiology or insulin PK/PD.
// Targets are deliberately conservative for a non-ICU inpatient teaching game.
const TARGET={low:100,high:180,severeLow:70,severeHigh:250};

function stepFromBg(bg){
  bg=Number(bg);
  if(!Number.isFinite(bg)) return 0;
  if(bg<TARGET.severeLow) return -2;
  if(bg<TARGET.low) return -1;
  if(bg>TARGET.severeHigh) return 2;
  if(bg>TARGET.high) return 1;
  return 0;
}

function titrateOrder(order,bg){
  const o={
    breakfast_u:roundUnit(order.breakfast_u),
    lunch_u:roundUnit(order.lunch_u),
    dinner_u:roundUnit(order.dinner_u),
    basal_u:roundUnit(order.basal_u)
  };
  // Standard causal mapping for 4-point ward glucose review:
  // pre-lunch -> breakfast bolus, pre-dinner -> lunch bolus,
  // bedtime -> dinner bolus, next fasting -> basal.
  o.breakfast_u=roundUnit(o.breakfast_u+stepFromBg(bg.pre_lunch));
  o.lunch_u=roundUnit(o.lunch_u+stepFromBg(bg.pre_dinner));
  o.dinner_u=roundUnit(o.dinner_u+stepFromBg(bg.bedtime));
  o.basal_u=roundUnit(o.basal_u+stepFromBg(bg.next_pre_breakfast??bg.pre_breakfast));
  return o;
}

function simulatePriorCare(p,days=7,ctx={},seed=1){
  if(!window.T2DMGameModelV2OrderDecompExp) throw new Error('T2DMGameModelV2OrderDecompExp must load first');
  const M=T2DMGameModelV2OrderDecompExp;
  let order=M.suggestOrder(p,ctx.meal_plan_carb_g||M.DEFAULT_MEALS);
  let state=null;
  const history=[];
  for(let d=0;d<Math.max(1,Math.round(days));d++){
    const sim=M.simulateDay(p,order,ctx,seed*100+d,state);
    const nextPreBreakfast=sim.end;
    history.push({day:d+1,order:{...order},bg:{...sim.bg,next_pre_breakfast:nextPreBreakfast},min:sim.min,max:sim.max});
    order=titrateOrder(order,{...sim.bg,next_pre_breakfast:nextPreBreakfast});
    state=sim.next_state;
  }
  return{order,history,state};
}

window.T2DMPreviousDoctorPolicyV2Exp={
  version:'0.1-integer-4point-titration-exp-2026-08-20',
  TARGET,stepFromBg,titrateOrder,simulatePriorCare
};
})();
