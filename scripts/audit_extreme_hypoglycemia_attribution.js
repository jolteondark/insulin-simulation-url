#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js','t2dm_counterregulation_v2_egp_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,CR=T2DMCounterregulationV2EgpExp;
const N=1600,ARMS=[{name:'legacy',patch:()=>({})},{name:'v2_width5_healthy',patch:()=>CR.statePatch(M,{reserve:1,activation_width_mg_dl:5})},{name:'v2_width10_healthy',patch:()=>CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})}];
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function pct(n,d){return d?100*n/d:0}
function hourBucket(t){return String(Math.floor(t/60)).padStart(2,'0')+':00'}
function inc(o,k){o[k]=(o[k]||0)+1}
function runArm(a){
 const gp=PK.get('glulisine'),events=[],patients=[];
 for(let i=1;i<=N;i++){
  const p=P.sample(i,{preset:'us_obese_inpatient_sensitivity'}),adm=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:adm}),tr=T.choose(i);
  const cfg={days:8,titrate:true,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:(ord,bg)=>TP.componentTitrate(ord,bg),state_modifier_fn:({day})=>({...T.statePatch(tr,day,i),...B.statePatch(M,.20),...a.patch(p),bedtime_correction_fn:({glucose_mg_dl})=>TP.emoryBedtimeCorrection(glucose_mg_dl)})};
  const c=C.simulateCourse(M,D,p,o,cfg,i);let first=null,min=Infinity;
  for(const r of c.records){
   for(let t=0;t<1440;t++){
    const x=r.series[t];if(x<min)min=x;
    if(x<20&&!first){
     const st=r.state||{},intake=st.intake_fraction||{},bolusShift=st.bolus_shift_min||{},bolusFrac=st.bolus_fraction||{};
     const tdd=r.order.breakfast_u+r.order.lunch_u+r.order.dinner_u+r.order.basal_u;
     first={patient:i,day:r.day,minute:t,hour:hourBucket(t),glucose:x,archetype:p.patient_archetype,age:p.age_years,bmi:p.bmi_kg_m2,egfr:p.egfr_ml_min_1_73m2,duration:p.duration_years,si:p.si_relative,order:r.order,tdd,tdd_per_kg:tdd/p.body_weight_kg,basal_per_kg:r.order.basal_u/p.body_weight_kg,npo:Object.values(intake).some(v=>v===0),partial_meal:Object.values(intake).some(v=>v>0&&v<.8),underbolus:Object.values(bolusFrac).some(v=>v<.9),delayed_bolus:Object.values(bolusShift).some(v=>v>=15),bedtime_correction:(r.bedtime_corrections||[]).length>0,stress:Number(st.stress_severity)||0};
    }
   }
  }
  if(first)events.push(first);patients.push({patient:i,archetype:p.patient_archetype,min,had_below20:!!first});
 }
 const byHour={},byDay={},byArch={};for(const e of events){inc(byHour,e.hour);inc(byDay,String(e.day));inc(byArch,e.archetype)}const n=events.length;
 return{name:a.name,n_patients:N,n_below20:n,below20_patient_pct:pct(n,N),first_event_by_hour_pct:Object.fromEntries(Object.entries(byHour).sort().map(([k,v])=>[k,pct(v,n)])),first_event_by_day_pct:Object.fromEntries(Object.entries(byDay).sort((x,y)=>Number(x[0])-Number(y[0])).map(([k,v])=>[k,pct(v,n)])),first_event_by_archetype_pct:Object.fromEntries(Object.entries(byArch).sort().map(([k,v])=>[k,pct(v,n)])),event_context:{npo_pct:pct(events.filter(e=>e.npo).length,n),partial_meal_pct:pct(events.filter(e=>e.partial_meal).length,n),underbolus_pct:pct(events.filter(e=>e.underbolus).length,n),delayed_bolus_pct:pct(events.filter(e=>e.delayed_bolus).length,n),bedtime_correction_pct:pct(events.filter(e=>e.bedtime_correction).length,n),mean_tdd_per_kg:mean(events.map(e=>e.tdd_per_kg)),mean_basal_per_kg:mean(events.map(e=>e.basal_per_kg)),mean_stress:mean(events.map(e=>e.stress)),mean_age:mean(events.map(e=>e.age)),mean_bmi:mean(events.map(e=>e.bmi)),mean_egfr:mean(events.map(e=>e.egfr)),mean_duration:mean(events.map(e=>e.duration)),mean_si:mean(events.map(e=>e.si))},events};
}
const rows=ARMS.map(runArm),out={purpose:'diagnose first <20 mg/dL events; attribution only, no parameter selection',n:N,rows};const dir='analysis/extreme_hypoglycemia_attribution';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));let md=['# Extreme hypoglycemia attribution audit','','Diagnostic only. Compares legacy low-side homeostasis with physiology-grounded counterregulation V2. No parameter is selected by Emory closeness.','','| arm | patients <20 | NPO | partial meal | delayed bolus | bedtime correction | mean TDD/kg | basal/kg |','|---|---:|---:|---:|---:|---:|---:|---:|'];for(const r of rows){const e=r.event_context;md.push(`| ${r.name} | ${r.below20_patient_pct.toFixed(1)}% | ${e.npo_pct.toFixed(1)}% | ${e.partial_meal_pct.toFixed(1)}% | ${e.delayed_bolus_pct.toFixed(1)}% | ${e.bedtime_correction_pct.toFixed(1)}% | ${e.mean_tdd_per_kg.toFixed(2)} | ${e.mean_basal_per_kg.toFixed(2)} |`);md.push('',`## ${r.name} first-event clock`,`- ${Object.entries(r.first_event_by_hour_pct).map(([k,v])=>`${k} ${v.toFixed(1)}%`).join(', ')}`,`- By day: ${Object.entries(r.first_event_by_day_pct).map(([k,v])=>`D${k} ${v.toFixed(1)}%`).join(', ')}`,`- By phenotype: ${Object.entries(r.first_event_by_archetype_pct).map(([k,v])=>`${k} ${v.toFixed(1)}%`).join(', ')}`,'');}md.push('Guardrails:','- This audit diagnoses the existing extreme tail; it does not justify changing counterregulation gain, insulin PK, basal potency, phenotype weights, or treatment policy.','- If events cluster after specific observable treatment/environment mismatches, investigate those mechanisms next.','- If events are diffuse and physiology-linked, revisit low-glucose physiology using independent evidence.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
