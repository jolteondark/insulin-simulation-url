#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV2Shanghai106Exp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp;
const TARGET={mean:176.1,tir:53.5,tar:42.2,tbr:4.5,cv:32.0,median_los_days:7.5,infection_fraction:.41};
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function metrics(xs){const m=mean(xs),s=sd(xs);return{mean:m,tir:100*xs.filter(x=>x>=70&&x<=180).length/xs.length,tar:100*xs.filter(x=>x>180).length/xs.length,tbr:100*xs.filter(x=>x<70).length/xs.length,cv:100*s/m}}
function patientMetrics(course){const xs=[];for(const rec of course.records)for(let t=0;t<=1440;t+=15)xs.push(rec.series[t]);return metrics(xs)}
function commonWard(r){const infected=r()<TARGET.infection_fraction;return{days:8,titrate:true,admission_glucose_offset_mg_dl:infected?120:55,initial_stress_severity:infected?.75:.25,stress_daily_decay:infected?.10:.08,allow_meal_mismatch:true,partial_meal_probability:.12,meal_shift_max_min:20,bolus_delay_max_min:25,underbolus_probability:.06,allow_npo:true,npo_day_probability:.06};}
function configFor(name,seed){const r=rng(name+':'+seed);
 if(name==='stable8')return{days:8,titrate:true};
 if(name==='carryover8')return{days:8,titrate:true,admission_glucose_offset_mg_dl:100,initial_stress_severity:.65,stress_daily_decay:.10};
 if(name==='ward8_no_depot')return commonWard(r);
 if(name==='ward8_u100_depot'){const c=commonWard(r);c.basal_depot_carry_fraction=.35;return c;}
 if(name==='ward8_u300_depot'){const c=commonWard(r);c.basal_depot_carry_fraction=.60;return c;}
 if(name==='high_variability8'){return{days:8,titrate:true,admission_glucose_offset_mg_dl:140,initial_stress_severity:.85,stress_daily_decay:.10,allow_meal_mismatch:true,partial_meal_probability:.20,meal_shift_max_min:30,bolus_delay_max_min:40,underbolus_probability:.12,allow_npo:true,npo_day_probability:.10,basal_depot_carry_fraction:.50};}
 throw new Error(name)}
function runScenario(name,n=1200){const all=[],pm=[],events={};let daym=null;for(let i=1;i<=n;i++){
 const p=P.sample(i),order=M.suggestOrder(p),cfg=configFor(name,i),course=C.simulateCourse(M,D,p,order,cfg,i);if(!daym)daym=Array.from({length:course.records.length},()=>[]);const m=patientMetrics(course);pm.push(m);
 for(const ev of course.events)events[ev.type]=(events[ev.type]||0)+1;
 for(let d=0;d<course.records.length;d++){const xs=[];for(let t=0;t<=1440;t+=15){const x=course.records[d].series[t];xs.push(x);all.push(x)}daym[d].push(metrics(xs));}
 }
 const pooled=metrics(all);return{name,n,pooled,patient_mean:{mean:mean(pm.map(x=>x.mean)),tir:mean(pm.map(x=>x.tir)),tar:mean(pm.map(x=>x.tar)),tbr:mean(pm.map(x=>x.tbr)),cv:mean(pm.map(x=>x.cv))},patient_cv_sd:sd(pm.map(x=>x.cv)),daily:daym.map((arr,i)=>({day:i+1,mean:mean(arr.map(x=>x.mean)),tir:mean(arr.map(x=>x.tir)),tbr:mean(arr.map(x=>x.tbr)),tar:mean(arr.map(x=>x.tar)),cv:mean(arr.map(x=>x.cv))})),events};}
const scenarioNames=['stable8','carryover8','ward8_no_depot','ward8_u100_depot','ward8_u300_depot','high_variability8'];
const scenarios=scenarioNames.map(x=>runScenario(x));
const outDir='analysis/emory_multiday_external';fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(outDir+'/results.json',JSON.stringify({target:TARGET,scenarios},null,2));
let md=['# Emory external validation — multi-day inpatient course','','No Shanghai/core-model parameter is re-fit here. Emory excluded steroid-treated patients and severe kidney disease; steroid and CKD effects are therefore not used to explain this external cohort. Median LOS was 7.5 days, so the sensitivity horizon is 8 days.','',`External target: mean ${TARGET.mean}, TIR ${TARGET.tir}%, TAR ${TARGET.tar}%, TBR ${TARGET.tbr}%, CV ${TARGET.cv}%.`,'','| scenario | mean | TIR | TAR | TBR | patient CV |','|---|---:|---:|---:|---:|---:|'];
for(const s of scenarios)md.push(`| ${s.name} | ${s.patient_mean.mean.toFixed(1)} | ${s.patient_mean.tir.toFixed(1)}% | ${s.patient_mean.tar.toFixed(1)}% | ${s.patient_mean.tbr.toFixed(2)}% | ${s.patient_mean.cv.toFixed(1)}% |`);
for(const s of scenarios){md+=['',`## ${s.name}`];for(const d of s.daily)md.push(`- day ${d.day}: mean ${d.mean.toFixed(1)}, TIR ${d.tir.toFixed(1)}%, TAR ${d.tar.toFixed(1)}%, TBR ${d.tbr.toFixed(2)}%, CV ${d.cv.toFixed(1)}%`);}
md+=['','## Interpretation guardrail','- U100/U300 depot carry fractions are sensitivity parameters, not fitted pharmacokinetic estimates.','- Do not tune state magnitudes to the Emory aggregate target yet.','- Retain a state only if its direction is clinically interpretable and it improves multiple external fingerprints without creating an implausible hypo tail.','- Generic glucose noise remains off.'];
fs.writeFileSync(outDir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
