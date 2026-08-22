(function(){
'use strict';
function makeFastCarbRescue(thresholdMgDl=54,carbsG=15,cooldownMin=15,label='fast_carb_rescue'){
  const threshold=Number(thresholdMgDl),grams=Math.max(0,Number(carbsG)||0),cooldown=Math.max(1,Math.round(Number(cooldownMin)||15));
  return function({glucose_mg_dl}){
    const g=Number(glucose_mg_dl);
    if(!Number.isFinite(g)||g>=threshold)return 0;
    return{carbs_g:grams,cooldown_min:cooldown,label};
  };
}
function severe54_15g(){return makeFastCarbRescue(54,15,15,'level2_15g_fast_carb')}
function alert70_15g(){return makeFastCarbRescue(70,15,15,'alert_15g_fast_carb')}
window.T2DMHypoglycemiaRescuePolicyExp={
  version:'0.1-fast-carb-rescue-policy-exp-2026-08-20',
  makeFastCarbRescue,severe54_15g,alert70_15g,
  note:'Experimental treatment-policy layer, not physiology. Default candidate treats level-2 hypoglycemia (<54 mg/dL) with 15 g fast carbohydrate and permits reassessment/repeat after 15 min. The <70 mg/dL arm is management-sensitivity only. Neither threshold nor carbohydrate amount is calibrated to Emory outcomes.'
};
})();
