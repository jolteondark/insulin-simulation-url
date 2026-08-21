(function(){
'use strict';
const roundUnit=x=>Math.max(0,Math.round(Number(x)||0));
function copyOrder(o){return{breakfast_u:roundUnit(o.breakfast_u),lunch_u:roundUnit(o.lunch_u),dinner_u:roundUnit(o.dinner_u),basal_u:roundUnit(o.basal_u)}}
function splitTdd(tdd){const total=roundUnit(tdd),basal=roundUnit(total*.5),pr=Math.max(0,total-basal),base=Math.floor(pr/3),rem=pr-base*3;return{breakfast_u:base+(rem>0?1:0),lunch_u:base+(rem>1?1:0),dinner_u:base,basal_u:basal}}
function startingOrder(patient,ctx={},opts={}){
 const weight=Math.max(30,Number(patient&&patient.body_weight_kg)||70),age=Number(patient&&patient.age_years)||60,egfr=Number(patient&&patient.egfr_ml_min_1_73m2)||90,bg=Number(ctx.admission_bg_mg_dl??patient.observed_fasting_glucose_mg_dl??180);
 let ukg=bg>200?.5:.4;
 const renalMode=String(opts.renal_mode||'age_only');
 if(age>=70||(renalMode==='age_or_egfr60'&&egfr>0&&egfr<60))ukg=.3;
 return splitTdd(ukg*weight);
}
function supplement(bg,scale='usual'){
 bg=Number(bg);if(!Number.isFinite(bg)||bg<141)return 0;
 const table={
  sensitive:[[180,2],[220,4],[260,6],[300,8],[350,10],[400,12],[Infinity,14]],
  usual:[[180,4],[220,6],[260,8],[300,10],[350,12],[400,14],[Infinity,16]],
  resistant:[[180,6],[220,8],[260,10],[300,12],[350,14],[400,16],[Infinity,18]]
 }[scale];if(!table)throw new Error('unknown correction scale '+scale);for(const [hi,u] of table)if(bg<=hi)return u;return 0;
}
function bedtimeSupplement(bg,scale='usual'){return roundUnit(.5*supplement(bg,scale));}
function titrateBasal(order,bg){
 const o=copyOrder(order),vals=Object.values(bg||{}).map(Number).filter(Number.isFinite);
 if(vals.some(x=>x<70)){o.basal_u=roundUnit(o.basal_u*.80);return o}
 const f=Number(bg&&bg.pre_breakfast);if(!Number.isFinite(f))return o;
 if(f>180)o.basal_u=roundUnit(o.basal_u*1.20);
 else if(f>=140)o.basal_u=roundUnit(o.basal_u*1.10);
 return o;
}
function mealDose({poc_glucose_mg_dl,planned_units,intake_fraction=1,meal_match=false}){
 const f=Math.max(0,Math.min(1,Number.isFinite(Number(intake_fraction))?Number(intake_fraction):1));
 const planned=roundUnit(planned_units);
 const scheduled=meal_match&&f<.85?roundUnit(planned*f):planned;
 return scheduled+supplement(poc_glucose_mg_dl,'usual');
}
window.T2DMTreatmentPolicyBogotaRabbitExp={
 version:'0.2-rabbit-bedtime-half-scale-fix-2026-08-21',
 startingOrder,supplement,bedtimeSupplement,titrateBasal,mealDose,splitTdd,copyOrder,
 note:'Context-specific Bogotá/RABBIT external-validation policy. Start 0.4 U/kg for admission BG 140-200 and 0.5 U/kg for >200, with 0.3 U/kg for age >=70 in the primary mapping; eGFR<60 is an explicitly labeled renal-proxy sensitivity because serum creatinine is unavailable. TDD is split 50/50 basal-prandial and prandial is divided across three meals. RABBIT usual premeal supplemental scale 4/6/8/10/12/14/16 U is used; bedtime correction is one-half of the corresponding supplemental scale per the RABBIT 2 protocol. Bogotá-explicit basal titration is +10% for fasting 140-180 and +20% for >180; observed POC hypoglycemia <70 triggers a 20% basal reduction. No outcome from Bogotá defines a parameter.'
};
})();
