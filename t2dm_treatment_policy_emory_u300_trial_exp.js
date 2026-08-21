(function(){
'use strict';
const roundUnit=x=>Math.max(0,Math.round(Number(x)||0));
function copyOrder(o){return{breakfast_u:roundUnit(o.breakfast_u),lunch_u:roundUnit(o.lunch_u),dinner_u:roundUnit(o.dinner_u),basal_u:roundUnit(o.basal_u)}}
function splitTdd(tdd){const total=roundUnit(tdd),basal=roundUnit(total*.5),pr= Math.max(0,total-basal),each=roundUnit(pr/3);return{breakfast_u:each,lunch_u:each,dinner_u:each,basal_u:basal}}
function startingOrder(patient,ctx={}){
 const weight=Math.max(30,Number(patient.body_weight_kg)||70),age=Number(patient.age_years)||60,egfr=Number(patient.egfr_ml_min_1_73m2)||90,bg=Number(ctx.admission_bg_mg_dl??patient.observed_fasting_glucose_mg_dl??180);
 const home=Number(ctx.home_tdd_u);
 if(Number.isFinite(home)&&home>0){const fraction=bg>200?1:.8;return splitTdd(home*fraction)}
 let ukg=bg>200?.5:.4;if(age>=70||(egfr>0&&egfr<60))ukg=.3;return splitTdd(ukg*weight);
}
function premealSupplement(bg,scale='usual'){
 bg=Number(bg);if(!Number.isFinite(bg)||bg<141)return 0;
 const table={
  sensitive:[[180,2],[220,3],[260,4],[300,5],[350,6],[400,7],[Infinity,8]],
  usual:[[180,3],[220,4],[260,5],[300,6],[350,8],[400,10],[Infinity,12]],
  resistant:[[180,4],[220,6],[260,8],[300,10],[350,12],[400,14],[Infinity,16]]
 }[scale]||null;if(!table)throw new Error('unknown correction scale');for(const [hi,u] of table)if(bg<=hi)return u;return 0;
}
function bedtimeSupplement(bg,scale='usual'){
 bg=Number(bg);if(!Number.isFinite(bg)||bg<=220)return 0;
 const table={sensitive:[[260,1],[300,2],[350,3],[400,4],[Infinity,5]],usual:[[260,2],[300,3],[350,4],[400,5],[Infinity,6]],resistant:[[260,4],[300,5],[350,6],[400,7],[Infinity,8]]}[scale]||null;if(!table)throw new Error('unknown correction scale');for(const [hi,u] of table)if(bg<=hi)return u;return 0;
}
function scaleOrder(order,factor){const o=copyOrder(order);for(const k of ['breakfast_u','lunch_u','dinner_u','basal_u'])o[k]=roundUnit(o[k]*factor);return o}
function registered2019Titrate(order,bg){
 const o=copyOrder(order),vals=Object.values(bg||{}).map(Number).filter(Number.isFinite);
 if(vals.some(x=>x<40))return scaleOrder(o,.70); // protocol specifies 30–40% decrease; deterministic lower-bound operationalization
 if(vals.some(x=>x<70))return scaleOrder(o,.80);
 const f=Number(bg&&bg.pre_breakfast),d=Number(bg&&bg.pre_dinner);
 if(Number.isFinite(f)&&Number.isFinite(d)&&f>=70&&f<=99&&d>=70&&d<=99)return scaleOrder(o,.90);
 if(!(Number.isFinite(f)&&Number.isFinite(d)))return o;
 if(f<100||d<100)return o; // mixed low/high pair: protocol leaves clinician discretion; do not intensify in this deterministic implementation
 // Registered protocol uses AND for the 141–180 and 181–299 bands; only >=300 is explicitly fasting and/or pre-dinner.
 if(f>=300||d>=300)o.basal_u=roundUnit(o.basal_u*1.30);
 else if(f>=181&&f<=299&&d>=181&&d<=299)o.basal_u=roundUnit(o.basal_u*1.20);
 else if(f>=141&&f<=180&&d>=141&&d<=180)o.basal_u=roundUnit(o.basal_u*1.10);
 // Mixed bands (e.g. one 120 and one 220) are not explicitly assigned by the registered deterministic table; leave unchanged.
 return o;
}
function mealDose({meal,poc_glucose_mg_dl,planned_units,state}){
 const intake=Number(state&&state.intake_fraction&&state.intake_fraction[meal]);
 const poor=Number.isFinite(intake)&&intake<.85;
 const scale=poor?'sensitive':'usual';
 const scheduled=poor?0:roundUnit(planned_units);
 return scheduled+premealSupplement(poc_glucose_mg_dl,scale);
}
window.T2DMTreatmentPolicyEmoryU300TrialExp={
 version:'0.2-published-2019-protocol-and-logic-fix-exp-2026-08-21',
 startingOrder,premealSupplement,bedtimeSupplement,registered2019Titrate,mealDose,splitTdd,
 note:'Context-specific policy implementing the registered 2019 Glargine U300 Hospital Trial protocol: weight/admission-BG start; 50/50 basal-prandial split; usual premeal supplemental glulisine when eating; scheduled prandial held and sensitive correction used for poor intake/NPO; daily basal adjustment from fasting/predinner POC using the registered AND logic for 141–180 and 181–299 bands and fasting and/or for >=300; TDD reductions for POC hypoglycemia. Not a global T2DM policy and not fitted to Emory outcomes.'
};
})();
