(function(){
'use strict';
// Baldwin et al., Diabetes Care 2012;35:1970-1974, DOI 10.2337/dc12-0578.
// External-validation treatment context only. No glycemic outcome from the trial sets model physiology.
// The published Supplementary Data is treated as the protocol source of truth when it is more detailed
// than the abbreviated methods paragraph in the main article.
const roundUnit=x=>Math.max(0,Math.round(Number(x)||0));
function copyOrder(o){return{breakfast_u:roundUnit(o.breakfast_u),lunch_u:roundUnit(o.lunch_u),dinner_u:roundUnit(o.dinner_u),basal_u:roundUnit(o.basal_u)}}
function startingOrder(patient,unitsPerKg=.5){
  const w=Math.max(30,Number(patient&&patient.body_weight_kg)||70),ukg=Number(unitsPerKg);
  if(!(ukg>0))throw new Error('unitsPerKg must be >0');
  // Protocol: 50% glargine; remaining 50% as three equal glulisine meal doses.
  // The simulator's ward-order layer is integer-unit, so each component is rounded independently.
  const basal=roundUnit(.5*ukg*w),meal=roundUnit((.5*ukg*w)/3);
  return{breakfast_u:meal,lunch_u:meal,dinner_u:meal,basal_u:basal};
}
function scheduledTdd(order){const o=copyOrder(order);return o.basal_u+o.breakfast_u+o.lunch_u+o.dinner_u}
function correctionBand(tdd){tdd=Number(tdd)||0;return tdd<40?'low':tdd<=80?'medium':'high'}
function correctionDose(bg,tdd,{bedtime=false}={}){
  bg=Number(bg);if(!Number.isFinite(bg))return 0;
  // Supplementary protocol: meal correction begins at 120 mg/dL; bedtime correction only if >170.
  if(bg<120||(bedtime&&bg<=170))return 0;
  const band=correctionBand(tdd);
  let row;
  if(bg<=170)row={low:1,medium:1,high:3};
  else if(bg<=220)row={low:2,medium:3,high:5};
  else if(bg<=270)row={low:3,medium:5,high:7};
  else if(bg<=320)row={low:4,medium:7,high:9};
  else row={low:5,medium:9,high:11};
  const dose=row[band];
  return bedtime?.5*dose:dose;
}
function titrateProportionally(order,bg){
  const o=copyOrder(order),f=Number(bg&&bg.pre_breakfast),vals=Object.values(bg||{}).map(Number).filter(Number.isFinite);
  if(!Number.isFinite(f))return o;
  const anyHypo=vals.some(x=>x<70);
  let factor=1;
  if(f<100)factor=.80;
  else if(!anyHypo&&f>180)factor=1.20;
  else if(!anyHypo&&f>=140)factor=1.10;
  // Supplementary protocol says increases require absence of hypoglycemia the previous day.
  // When glargine changes, mealtime glulisine moves proportionately in the same direction.
  if(factor===1)return o;
  return{breakfast_u:roundUnit(o.breakfast_u*factor),lunch_u:roundUnit(o.lunch_u*factor),dinner_u:roundUnit(o.dinner_u*factor),basal_u:roundUnit(o.basal_u*factor)};
}
function mealDose({poc_glucose_mg_dl,planned_units,order_u}){
  const tdd=scheduledTdd(order_u||{}),planned=roundUnit(planned_units);
  return planned+correctionDose(poc_glucose_mg_dl,tdd,{bedtime:false});
}
function bedtimeDose({glucose_mg_dl,order_u}){
  // Dynamic engine currently rounds correction injections to integer units; preserve the protocol's
  // exact half-scale here and let the external audit report the integer-order implementation constraint.
  return correctionDose(glucose_mg_dl,scheduledTdd(order_u||{}),{bedtime:true});
}
window.T2DMTreatmentPolicyBaldwinRenalRctExp={
  version:'0.1-baldwin-renal-rct-protocol-exp-2026-08-22',
  startingOrder,scheduledTdd,correctionBand,correctionDose,titrateProportionally,mealDose,bedtimeDose,copyOrder,
  note:'External-validation policy reconstructed from Baldwin 2012 main article + Supplementary Data. Start 0.50 or 0.25 U/kg/day, 50/50 basal-prandial, glulisine divided across three meals and administered after confirming meal intake; correction scale depends on scheduled TDD, with 50% scale at bedtime only when BG>170; fasting-driven 20% decrease / 10-20% increase with proportional prandial change. No trial outcome calibrates physiology.'
};
})();
