#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_poc_safety_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js','t2dm_counterregulation_v2_egp_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P1=T2DMPatientPhenotypeV1ShanghaiExp,P3=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1PocSafetyExp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,CR=T2DMCounterregulationV2EgpExp;
const gp=PK.get('glulisine'),MAP={basal_u:'pre_breakfast',breakfast_u:'pre_lunch',lunch_u:'pre_dinner',dinner_u:'bedtime'};
const NSH=3000,NEX=5000;
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function persistent2of4(order,bg){
 const next=TP.componentTitrate(order,bg),vals=Object.values(bg).map(Number).filter(Number.isFinite),nHigh=vals.filter(x=>x>=180).length;
 for(const [comp,key] of Object.entries(MAP)){const cur=Number(order[comp])||0,nxt=Number(next[comp])||0,signal=Number(bg[key]);if(nxt>cur&&!(Number.isFinite(signal)&&signal>=180&&nHigh>=2))next[comp]=cur;}
 return next;
}
function patternScheduled(order,bg,ctx={}){
 const next=persistent2of4(order,bg),recs=(ctx.course&&ctx.course.records)||[];
 const prev=recs.length>=2?recs[recs.length-2]:null;
 for(const [comp,key] of Object.entries(MAP)){
   const cur=Number(order[comp])||0,nxt=Number(next[comp])||0;
   if(nxt<=cur)continue;
   const prior=Number(prev&&prev.bg&&prev.bg[key]);
   if(!(Number.isFinite(prior)&&prior>=180))next[comp]=cur;
 }
 return next;
}
function mealMatchedPatch({order,state}){
 const intake=state.intake_fraction||{},mealShift=state.meal_shift_min||{},bolusShift={...(state.bolus_shift_min||{})},bolusFraction={...(state.bolus_fraction||{})};
 for(const meal of ['breakfast','lunch','dinner']){
   const f=Number(intake[meal]);if(!Number.isFinite(f)||f>=.85)continue;
   const key=meal+'_u',ordered=Math.max(0,Math.round(Number(order[key])||0)),given=Math.max(0,Math.round(ordered*Math.max(0,Math.min(1,f))));
   bolusFraction[meal]=ordered>0?given/ordered:0;const ms=Number(mealShift[meal])||0;bolusShift[meal]=Math.max(Number(bolusShift[meal])||0,15+ms);
 }
 return{bolus_fraction:bolusFraction,bolus_shift_min:bolusShift};
}
function safetyOnly({poc_glucose_mg_dl,planned_units}){const bg=Number(poc_glucose_mg_dl),u=Math.max(0,Math.round(Number(planned_units)||0));if(bg<70)return Math.max(0,u-2);if(bg<100)return Math.max(0,u-1);return u;}
function nutritionalPlusCorrection(counter){return({meal,poc_glucose_mg_dl,planned_units})=>{
 const bg=Number(poc_glucose_mg_dl),u=Math.max(0,Math.round(Number(planned_units)||0));
 if(bg<70){counter.low2++;return Math.max(0,u-2)}
 if(bg<100){counter.low1++;return Math.max(0,u-1)}
 if(bg>250){counter.corr2++;counter.byMeal[meal]=(counter.byMeal[meal]||0)+2;return u+2}
 if(bg>180){counter.corr1++;counter.byMeal[meal]=(counter.byMeal[meal]||0)+1;return u+1}
 return u;
};}
function thresholdAlignedPatch(){const width=10,maxDrive=CR.maxDriveMgDlMin();return{fasting_adjustment_fn:({t,glucose_mg_dl})=>{const g=Number(glucose_mg_dl),threshold=CR.isSleepMinute(t)?CR.SLEEP_THRESHOLD_MG_DL:CR.AWAKE_THRESHOLD_MG_DL;if(!Number.isFinite(g)||g>=threshold)return{restore_multiplier:1,drive_mg_dl_per_min:0};const depth=threshold-g;return{restore_multiplier:0,drive_mg_dl_per_min:maxDrive*CR.activation(depth,width)};},counterregulation_model:'threshold-aligned-egp-v2-diagnostic',counterregulatory_activation_width_mg_dl:width,counterregulatory_max_drive_mg_dl_min:maxDrive};}
const ARMS=[
 {name:'final_stack_persistent2of4',titrate:persistent2of4,correction:false},
 {name:'split_scheduled_pattern_plus_transient_correction',titrate:patternScheduled,correction:true}
];
function makeCounter(){return{corr1:0,corr2:0,low1:0,low2:0,byMeal:{breakfast:0,lunch:0,dinner:0}}}
function external(arm,N=NEX){
 let p20=0,p30=0,p40=0,p54=0,p70=0,noct70=0,noct54=0,deep54=0,total=0,n70=0,n54=0,n180=0,n250=0;const pMeans=[],pCV=[],lunch=[],tddkg=[];const counter=makeCounter();
 for(let i=1;i<=N;i++){
   const p=P3.sample(i,{preset:'us_obese_inpatient_sensitivity'}),adm=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:adm}),tr=T.choose(i);
   const premealFn=arm.correction?nutritionalPlusCorrection(counter):safetyOnly;
   const cfg={days:8,titrate:true,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:arm.titrate,state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,i),...B.statePatch(M,.20),...thresholdAlignedPatch(),bedtime_correction_fn:({glucose_mg_dl})=>TP.emoryBedtimeCorrection(glucose_mg_dl),...mealMatchedPatch(ctx),prandial_safety_adjustment_fn:premealFn})};
   const c=C.simulateCourse(M,D,p,o,cfg,i);let a20=false,a30=false,a40=false,a54=false,a70=false,n70p=false,n54p=false,d54p=false;const xs=[];
   for(const r of c.records){lunch.push(Number(r.order.lunch_u)||0);tddkg.push(((Number(r.order.basal_u)||0)+(Number(r.order.breakfast_u)||0)+(Number(r.order.lunch_u)||0)+(Number(r.order.dinner_u)||0))/p.body_weight_kg);for(let t=0;t<1440;t+=15){const x=r.series[t];xs.push(x);total++;if(x<20)a20=true;if(x<30)a30=true;if(x<40)a40=true;if(x<54){a54=true;n54++;}if(x<70){a70=true;n70++;}if(x>180)n180++;if(x>250)n250++;const isNoct=t>=1320||t<360;if(isNoct&&x<70)n70p=true;if(isNoct&&x<54)n54p=true;if(t<360&&x<54)d54p=true;}}
   if(a20)p20++;if(a30)p30++;if(a40)p40++;if(a54)p54++;if(a70)p70++;if(n70p)noct70++;if(n54p)noct54++;if(d54p)deep54++;const m=mean(xs);pMeans.push(m);pCV.push(100*sd(xs)/m);
 }
 return{mean_bg:mean(pMeans),tir_pct:100*(total-n70-n180)/total,tar180_pct:100*n180/total,tar250_pct:100*n250/total,tbr70_pct:100*n70/total,tbr54_pct:100*n54/total,cv_pct:mean(pCV),patients_any70_pct:100*p70/N,patients_any54_pct:100*p54/N,noct70_pct:100*noct70/N,noct54_pct:100*noct54/N,deep00_06_54_pct:100*deep54/N,patients_below20_pct:100*p20/N,patients_below30_pct:100*p30/N,patients_below40_pct:100*p40/N,mean_scheduled_lunch_u:mean(lunch),mean_scheduled_tddkg:mean(tddkg),transient_correction:counter,correction_units_per_patient_day:(counter.corr1+2*counter.corr2)/(N*8)};
}
function shanghaiCurrent(N=NSH){return shanghai({name:'current',current:true,titrate:(o,b)=>TP.componentTitrate(o,b),correction:false},N)}
function shanghai(arm,N=NSH){
 const all=[],preB=[],preL=[],preD=[],d120=[];let tbr70=0,tir=0,total=0;const counter=makeCounter();
 for(let i=1;i<=N;i++){
   const p=P1.sample(i),adm=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:adm}),current=!!arm.current,premealFn=arm.correction?nutritionalPlusCorrection(counter):safetyOnly;
   const cfg={days:8,titrate:true,allow_meal_mismatch:false,allow_npo:false,bolus_tau_min:90,bolus_duration_min:330,titrate_order_fn:arm.titrate,state_modifier_fn:()=>({...B.statePatch(M,.20),...(current?{}:thresholdAlignedPatch()),...(current?{}:{prandial_safety_adjustment_fn:premealFn})})};
   const c=C.simulateCourse(M,D,p,o,cfg,i);for(let d=2;d<c.records.length;d++){const r=c.records[d];for(let t=0;t<1440;t++){const x=r.series[t];all.push(x);total++;if(x<70)tbr70++;if(x>=70&&x<=180)tir++;}preB.push(r.series[420]);preL.push(r.series[720]);preD.push(r.series[1080]);d120.push(r.series[600]-r.series[480]);}
 }
 return{mean:mean(all),preB:mean(preB),preL:mean(preL),preD:mean(preD),delta120:mean(d120),tbr70:100*tbr70/total,tir:100*tir/total,transient_correction:counter,correction_units_per_patient_day:(counter.corr1+2*counter.corr2)/(N*8)};
}
const ref=shanghaiCurrent(),rows=[];
for(const arm of ARMS){const sh=shanghai(arm),ex=external(arm),d={};for(const k of ['mean','preB','preL','preD','delta120','tbr70','tir'])d[k]=sh[k]-ref[k];const shGate=Math.abs(d.mean)<5&&Math.abs(d.preB)<5&&Math.abs(d.preL)<5&&Math.abs(d.preD)<5&&Math.abs(d.delta120)<2&&Math.abs(d.tbr70)<1&&Math.abs(d.tir)<3;const safetyGate=ex.patients_below20_pct<=1;rows.push({name:arm.name,shanghai:sh,external:ex,delta_vs_current:d,shanghai_gate:shGate,safety_gate:safetyGate});}
const cand=rows.find(r=>r.name==='split_scheduled_pattern_plus_transient_correction');const out={purpose:'Controller architecture diagnostic: separate scheduled nutritional insulin from transient same-day correction. Scheduled upward titration requires the already-studied repeated same-component >=180 mg/dL pattern in addition to persistent_2of4; isolated premeal hyperglycemia receives a transient +1 U (>180) or +2 U (>250) correction at the current meal instead of permanently accumulating into the next day scheduled dose. Existing thresholds/steps are reused; no outcome-fitted threshold, TDD cap, hidden physiology, or trajectory label is used.',n:{shanghai:NSH,external:NEX},definition:{scheduled:'persistent_2of4 plus prior-day same-component POC >=180 before an upward scheduled change; downward scheduled changes remain immediate',transient_correction:'current premeal POC >180 => +1 U, >250 => +2 U, applied only to current meal; existing <100/-1 and <70/-2 same-day safety remain',bedtime:'published Emory bedtime correction unchanged',counterregulation:'threshold-aligned width10 diagnostic unchanged'},shanghai_reference:ref,rows,candidate_pass:cand.shanghai_gate&&cand.safety_gate};
const dir='analysis/scheduled_transient_correction_split';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Scheduled nutritional vs transient correction split audit','','Architecture diagnostic only. Same pre-existing 180/250 mg/dL thresholds and +1/+2 U steps are reused; no new threshold or cap is introduced.','','| arm | Shanghai | safety<20 | mean | TIR | TAR>180 | TBR<70 | TBR<54 | CV | noct<54 | 00–06<54 | <20pt | <30pt | <40pt | sched lunch U | correction U/patient-day |','|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of rows){const e=r.external;md.push(`| ${r.name} | ${r.shanghai_gate?'PASS':'FAIL'} | ${r.safety_gate?'PASS':'FAIL'} | ${e.mean_bg.toFixed(1)} | ${e.tir_pct.toFixed(1)}% | ${e.tar180_pct.toFixed(1)}% | ${e.tbr70_pct.toFixed(2)}% | ${e.tbr54_pct.toFixed(2)}% | ${e.cv_pct.toFixed(1)}% | ${e.noct54_pct.toFixed(1)}% | ${e.deep00_06_54_pct.toFixed(1)}% | ${e.patients_below20_pct.toFixed(2)}% | ${e.patients_below30_pct.toFixed(2)}% | ${e.patients_below40_pct.toFixed(2)}% | ${e.mean_scheduled_lunch_u.toFixed(2)} | ${e.correction_units_per_patient_day.toFixed(3)} |`);}
md.push('',`Candidate: **${out.candidate_pass?'PASS':'FAIL'}**`,`Shanghai ΔTIR ${cand.delta_vs_current.tir.toFixed(3)}pp; Δmean ${cand.delta_vs_current.mean.toFixed(3)}; ΔpreD ${cand.delta_vs_current.preD.toFixed(3)}.`,`External <20 ${cand.external.patients_below20_pct.toFixed(3)}%.`,'','Guardrails:','- Do not alter 180/250 thresholds, +1/+2 U steps, or the <=1% catastrophic-tail gate from this result.','- Do not introduce a TDD cap or use trajectory/stress labels as policy inputs.','- Do not alter stress decay, glulisine PK, basal potency, phenotype weights, or counterregulation width/thresholds to compensate.','- If this architecture fails Shanghai preservation, reject it rather than weakening the Shanghai gate.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));if(!out.candidate_pass)process.exitCode=2;
