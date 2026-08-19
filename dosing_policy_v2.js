(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const roundHalf=x=>Math.round(Number(x)*2)/2;
function getMealICR(p){
  if(p.icr_g_u_by_meal)return p.icr_g_u_by_meal;
  if(window.ClinicalModifiersV2){
    const tdd=Number(p.v2_tdd_u_day??p.tdd_u_day);
    return ClinicalModifiersV2.mealICRFromTDD(tdd);
  }
  return{breakfast:p.icr_g_u,lunch:p.icr_g_u,dinner:p.icr_g_u};
}
function starterOrder(p,mealPlan={breakfast:50,lunch:70,dinner:60}){
  const icr=getMealICR(p),basal=Number(p.v2_basal_u_day??p.basal_u_day);
  return{
    breakfast_u:roundHalf(Number(mealPlan.breakfast)/clamp(icr.breakfast,2.5,35)),
    lunch_u:roundHalf(Number(mealPlan.lunch)/clamp(icr.lunch,2.5,35)),
    dinner_u:roundHalf(Number(mealPlan.dinner)/clamp(icr.dinner,2.5,35)),
    basal_u:roundHalf(basal),
    icr_used:{...icr}
  };
}
window.DosingPolicyV2={getMealICR,starterOrder,version:'0.1-meal-specific-icr'};
})();
