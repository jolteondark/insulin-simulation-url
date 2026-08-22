#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp;
const N=5000,gp=PK.get('glulisine'),map={basal_u:'pre_breakfast',breakfast_u:'pre_lunch',lunch_u:'pre_dinner',dinner_u:'bedtime'};
function persistentTitrator(order,bg){const next=TP.componentTitrate(order,bg),vals=Object.values(bg).map(Number).filter(Number.isFinite),nHigh=vals.filter(x=>x>=180).length;for(const [comp,key] of Object.entries(map)){const cur=Number(order[comp])||0,nxt=Number(next[comp])||0,signal=Number(bg[key]);if(nxt>cur&&!(Number.isFinite(signal)&&signal>=180&&nHigh>=2))next[comp]=cur;}return next}
function mealMatchedPatch({order,state}){const intake=state.intake_fraction||{},mealShift=state.meal_shift_min||{},bolusShift={...(state.bolus_shift_min||{})},bolusFraction={...(state.bolus_fraction||{})};for(const meal of ['breakfast','lunch','dinner']){const f=Number(intake[meal]);if(!Number.isFinite(f)||f>=.85)continue;const key=meal+'_u',ordered=Math.max(0,Math.round(Number(order[key])||0)),given=Math.max(0,Math.round(ordered*Math.max(0,Math.min(1,f))));bolusFraction[meal]=ordered>0?given/ordered:0;const ms=Number(mealShift[meal])||0;bolusShift[meal]=Math.max(Number(bolusShift[meal])||0,15+ms);}return{bolus_fraction:bolusFraction,bolus_shift_min:bolusShift};}
function pocVals(bg){return Object.values(bg||{}).map(Number).filter(Number.isFinite)}
const rows=[];let patients20=0;
for(let i=1;i<=N;i++){
 const p=P.sample(i,{preset:'us_obese_inpatient_sensitivity'}),adm=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:adm}),tr=T.choose(i);
 const cfg={days:8,titrate:true,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:persistentTitrator,state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,i),...B.statePatch(M,.20),bedtime_correction_fn:({glucose_mg_dl})=>TP.emoryBedtimeCorrection(glucose_mg_dl),...mealMatchedPatch(ctx)})};
 const c=C.simulateCourse(M,D,p,o,cfg,i);let any20=false;
 for(let ri=1;ri<c.records.length;ri++){
   const r=c.records[ri],prev=c.records[ri-1],prev2=ri>1?c.records[ri-2]:null;
   const day20=r.series.some(x=>x<20);if(day20)any20=true;
   const priorVals=pocVals(prev.bg),priorMin=priorVals.length?Math.min(...priorVals):NaN;
   const preB=Number(r.bg.pre_breakfast),preL=Number(r.bg.pre_lunch),prevPreD=Number(prev.bg.pre_dinner),prev2PreD=Number(prev2?.bg?.pre_dinner);
   rows.push({event:day20,prior_poc_lt70:Number.isFinite(priorMin)&&priorMin<70,prior_poc_lt100:Number.isFinite(priorMin)&&priorMin<100,morning_lt100:(Number.isFinite(preB)&&preB<100)||(Number.isFinite(preL)&&preL<100),morning_lt140:(Number.isFinite(preB)&&preB<140)||(Number.isFinite(preL)&&preL<140),prev_preD_le180:Number.isFinite(prevPreD)&&prevPreD<=180,preD_falling:Number.isFinite(prevPreD)&&Number.isFinite(prev2PreD)&&prevPreD<prev2PreD});
 }
 if(any20)patients20++;
}
const keys=['prior_poc_lt70','prior_poc_lt100','morning_lt100','morning_lt140','prev_preD_le180','preD_falling'];
const eventRows=rows.filter(r=>r.event),controlRows=rows.filter(r=>!r.event);
function prevalence(arr,k){return arr.length?arr.filter(r=>r[k]).length/arr.length:0}
const signals={};for(const k of keys){const e=prevalence(eventRows,k),c=prevalence(controlRows,k);signals[k]={event_pct:100*e,non_event_pct:100*c,risk_ratio:c>0?e/c:null};}
const out={purpose:'POC-only precursor specificity audit after combined policy. Hidden minute-series glucose is excluded from every precursor.',n_patients:N,patient_below20_pct:100*patients20/N,event_days:eventRows.length,non_event_days:controlRows.length,signals};
const dir='analysis/combined_policy_poc_precursor_specificity';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Combined-policy POC-only precursor specificity','','Correction of the prior precursor audit: prior-day low signals use only the four recorded POC values, never hidden minute-series glucose. Thresholds are pre-existing clinical/model boundaries, not selected from outcomes.','','Patients with any <20: '+out.patient_below20_pct.toFixed(2)+'%','Event patient-days: '+eventRows.length,'Non-event patient-days: '+controlRows.length,'','| signal | event days | non-event days | prevalence ratio |','|---|---:|---:|---:|'];for(const k of keys){const s=signals[k];md.push(`| ${k} | ${s.event_pct.toFixed(1)}% | ${s.non_event_pct.toFixed(1)}% | ${s.risk_ratio===null?'NA':s.risk_ratio.toFixed(2)} |`);}md.push('','Guardrails:','- No hidden CGM/minute-series glucose is used as a precursor.','- Do not tune 70, 100, 140, or 180 mg/dL to these outcomes.','- Use this audit to judge whether an observable same-day/next-day safety override is structurally justified.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
