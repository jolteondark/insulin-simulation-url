(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const roundUnit=x=>Math.max(0,Math.round(Number(x)||0));
function splitTdd(tdd){
  const total=Math.max(0,Number(tdd)||0),basal=roundUnit(total*.5),prandial=Math.max(0,total-basal),each=roundUnit(prandial/3);
  return{breakfast_u:each,lunch_u:each,dinner_u:each,basal_u:basal};
}
function startingOrder(patient,ctx={}){
  const weight=Math.max(30,Number(patient.body_weight_kg)||70),age=Number(patient.age_years)||60,egfr=Number(patient.egfr_ml_min_1_73m2)||90;
  const admissionBg=Number(ctx.admission_bg_mg_dl??patient.observed_fasting_glucose_mg_dl??180);
  if(Number.isFinite(Number(ctx.home_tdd_u))&&Number(ctx.home_tdd_u)>0)return splitTdd(.80*Number(ctx.home_tdd_u));
  let ukg=admissionBg>200?.50:.40;
  if(age>70||(egfr>0&&egfr<=60))ukg=.30;
  return splitTdd(roundUnit(ukg*weight));
}
function proportionalTitrate(order,summary={}){
  const vals=['pre_breakfast','pre_lunch','pre_dinner','bedtime'].map(k=>Number(summary[k])).filter(Number.isFinite);
  if(!vals.length)return{...order};
  const current=Number(order.breakfast_u||0)+Number(order.lunch_u||0)+Number(order.dinner_u||0)+Number(order.basal_u||0);
  if(vals.some(x=>x<70))return splitTdd(roundUnit(current*.80));
  const m=vals.reduce((a,b)=>a+b,0)/vals.length;
  let factor=1;
  if(m>240)factor=1.30;else if(m>180)factor=1.20;else if(m>140)factor=1.10;
  return splitTdd(roundUnit(current*factor));
}
function physiologyBlindCheck(a,b,ctx={}){
  return JSON.stringify(startingOrder(a,ctx))===JSON.stringify(startingOrder(b,ctx));
}
window.T2DMTreatmentPolicyWeightBgExp={
  version:'0.2-renal-threshold-fix-2026-08-20',
  startingOrder,proportionalTitrate,splitTdd,physiologyBlindCheck,
  note:'Experimental treatment-policy layer. Uses observable weight/age/eGFR/admission BG or home TDD only; never hidden SI, beta-cell reserve, or hepatic IR. eGFR <=60 receives the conservative 0.30 U/kg starting rule, including eGFR <30.'
};
})();
