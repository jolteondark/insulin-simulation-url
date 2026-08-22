#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp;
const gp=PK.get('glulisine'),N=2200;
const map={basal_u:'pre_breakfast',breakfast_u:'pre_lunch',lunch_u:'pre_dinner',dinner_u:'bedtime'};
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function persistentTitrator(order,bg){const next=TP.componentTitrate(order,bg),vals=Object.values(bg).map(Number).filter(Number.isFinite),nHigh=vals.filter(x=>x>=180).length;for(const [comp,key] of Object.entries(map)){const cur=Number(order[comp])||0,nxt=Number(next[comp])||0,signal=Number(bg[key]);if(nxt>cur&&!(Number.isFinite(signal)&&signal>=180&&nHigh>=2))next[comp]=cur;}return next}
function mealMatchedPatch({order,state}){
 const intake=state.intake_fraction||{}, mealShift=state.meal_shift_min||{}, bolusShift={...(state.bolus_shift_min||{})}, bolusFraction={...(state.bolus_fraction||{})};
 for(const meal of ['breakfast','lunch','dinner']){
   const f=Number(intake[meal]);
   if(!Number.isFinite(f)||f>=0.85)continue;
   const key=meal+'_u',ordered=Math.max(0,Math.round(Number(order[key])||0));
   const given=Math.max(0,Math.round(ordered*Math.max(0,Math.min(1,f))));
   bolusFraction[meal]=ordered>0?given/ordered:0;
   const ms=Number(mealShift[meal])||0;
   bolusShift[meal]=Math.max(Number(bolusShift[meal])||0,15+ms);
 }
 return{bolus_fraction:bolusFraction,bolus_shift_min:bolusShift};
}
function run(policy,mealMatched){let p20=0,p54=0;const patientMeans=[];for(let i=1;i<=N;i++){
 const p=P.sample(i,{preset:'us_obese_inpatient_sensitivity'}),adm=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:adm}),tr=T.choose(i);
 const cfg={days:8,titrate:true,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:policy==='persistent'?persistentTitrator:((ord,bg)=>TP.componentTitrate(ord,bg)),state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,i),...B.statePatch(M,.20),bedtime_correction_fn:({glucose_mg_dl})=>TP.emoryBedtimeCorrection(glucose_mg_dl),...(mealMatched?mealMatchedPatch(ctx):{})})};
 const c=C.simulateCourse(M,D,p,o,cfg,i);let a20=false,a54=false,xs=[];for(const r of c.records){for(let t=0;t<1440;t+=15){const x=r.series[t];xs.push(x);if(x<20)a20=true;if(x<54)a54=true}}if(a20)p20++;if(a54)p54++;patientMeans.push(mean(xs));
 }
 return{policy,meal_matched:mealMatched,below20_pct:100*p20/N,any54_pct:100*p54/N,mean_bg:mean(patientMeans)};
}
const rows=[run('current',false),run('persistent',false),run('current',true),run('persistent',true)];
const out={purpose:'Diagnostic observable nutrition-policy audit; no outcome calibration',n_per_arm:N,rule:'On generated partial-intake meals only (intake_fraction <0.85, the pre-existing generator boundary), administer rapid-acting prandial insulin after the meal and reduce the administered dose to the nearest integer unit proportional to observed intake. Adequate-intake meals are unchanged.',rows};
const dir='analysis/meal_matched_postmeal_policy';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Meal-matched postmeal prandial policy diagnostic','','Observable nutrition-policy diagnostic only. Partial-intake boundary is inherited from the frozen generator, not chosen from outcomes. Administered prandial units are rounded to integers.','','| policy | meal-matched postmeal | <20 patients | any <54 | mean BG |','|---|---|---:|---:|---:|'];for(const r of rows)md.push(`| ${r.policy} | ${r.meal_matched?'yes':'no'} | ${r.below20_pct.toFixed(1)}% | ${r.any54_pct.toFixed(1)}% | ${r.mean_bg.toFixed(1)} |`);md.push('','Guardrails:','- Do not tune the 0.85 threshold; it is the existing generator boundary between partial and adequate intake.','- No hidden CGM or latent physiology is used.','- Do not remove bolus delay globally; prior ablation showed it is protective.','- This is diagnostic only. A candidate must still pass Shanghai preservation and full external revalidation.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
