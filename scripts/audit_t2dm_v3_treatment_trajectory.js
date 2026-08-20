#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp;
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function tdd(o){return Number(o.breakfast_u||0)+Number(o.lunch_u||0)+Number(o.dinner_u||0)+Number(o.basal_u||0)}
function glucoseMetrics(xs){const m=mean(xs),s=sd(xs);return{mean:m,tir:100*xs.filter(x=>x>=70&&x<=180).length/xs.length,tar:100*xs.filter(x=>x>180).length/xs.length,tbr:100*xs.filter(x=>x<70).length/xs.length,tbr54:100*xs.filter(x=>x<54).length/xs.length,cv:100*s/m}}
function runArchetype(archetype,N=600){
 const gp=PK.get('glulisine'),days=8,rows=[];
 for(let i=1;i<=N;i++){
  const p=P.sample(i,{archetype}),admission=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl));
  const initial=TP.startingOrder(p,{admission_bg_mg_dl:admission});
  const cfg={days,titrate:true,admission_glucose_offset_mg_dl:120,initial_stress_severity:.70,stress_daily_decay:.10,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:(o,bg)=>TP.componentTitrate(o,bg)};
  const c=C.simulateCourse(M,D,p,initial,cfg,i),all=[];
  for(const r of c.records)for(let t=0;t<=1440;t+=15)all.push(r.series[t]);
  rows.push({p,initial,c,gm:glucoseMetrics(all),any70:all.some(x=>x<70),any54:all.some(x=>x<54)});
 }
 const day=[];
 for(let d=0;d<days;d++){
  const rec=rows.map(x=>x.c.records[d]),tddkg=rec.map((r,j)=>tdd(r.order)/rows[j].p.body_weight_kg),bgm=rec.map(r=>mean([r.bg.pre_breakfast,r.bg.pre_lunch,r.bg.pre_dinner,r.bg.bedtime]));
  const dayXs=[];for(const r of rec)for(let t=0;t<=1440;t+=15)dayXs.push(r.series[t]);const gm=glucoseMetrics(dayXs);
  day.push({day:d+1,tdd_kg:mean(tddkg),basal_u:mean(rec.map(r=>r.order.basal_u)),breakfast_u:mean(rec.map(r=>r.order.breakfast_u)),lunch_u:mean(rec.map(r=>r.order.lunch_u)),dinner_u:mean(rec.map(r=>r.order.dinner_u)),mean_four_point:mean(bgm),mean_glucose:gm.mean,tir:gm.tir,tar:gm.tar,tbr:gm.tbr});
 }
 const init=mean(rows.map(x=>tdd(x.initial)/x.p.body_weight_kg));
 const final=mean(rows.map(x=>tdd(x.c.final_order)/x.p.body_weight_kg));
 return{archetype,n:N,bmi:mean(rows.map(x=>x.p.bmi_kg_m2)),age:mean(rows.map(x=>x.p.age_years)),duration:mean(rows.map(x=>x.p.duration_years)),si:mean(rows.map(x=>x.p.si_relative)),beta:mean(rows.map(x=>x.p.beta_cell_reserve)),egfr:mean(rows.map(x=>x.p.egfr_ml_min_1_73m2)),fpg:mean(rows.map(x=>x.p.observed_fasting_glucose_mg_dl)),initial_tdd_kg:init,final_tdd_kg:final,delta_tdd_kg:final-init,outcomes:{mean:mean(rows.map(x=>x.gm.mean)),tir:mean(rows.map(x=>x.gm.tir)),tar:mean(rows.map(x=>x.gm.tar)),tbr:mean(rows.map(x=>x.gm.tbr)),tbr54:mean(rows.map(x=>x.gm.tbr54)),cv:mean(rows.map(x=>x.gm.cv)),any70:100*rows.filter(x=>x.any70).length/N,any54:100*rows.filter(x=>x.any54).length/N},day};
}
const archetypes=Object.keys(P.DEFAULT_WEIGHTS),results={};for(const a of archetypes)results[a]=runArchetype(a);
const dir='analysis/t2dm_v3_treatment_trajectory';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));
let md=['# T2DM V3 8-day treatment trajectory audit','','Mechanism audit only. Uses physiology-blind observable-data starting policy and component-specific four-point titration. Renal exposure modifier is OFF. Each archetype is audited separately; mixture prevalence is irrelevant here.','','| archetype | n | age | BMI | duration | SI | beta | eGFR | FPG | initial TDD/kg | final TDD/kg | delta | mean | TIR | TAR | TBR | TBR<54 | CV | any<70 |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const [a,x] of Object.entries(results))md.push(`| ${a} | ${x.n} | ${x.age.toFixed(1)} | ${x.bmi.toFixed(1)} | ${x.duration.toFixed(1)} | ${x.si.toFixed(2)} | ${x.beta.toFixed(2)} | ${x.egfr.toFixed(0)} | ${x.fpg.toFixed(0)} | ${x.initial_tdd_kg.toFixed(3)} | ${x.final_tdd_kg.toFixed(3)} | ${(x.delta_tdd_kg>=0?'+':'')+x.delta_tdd_kg.toFixed(3)} | ${x.outcomes.mean.toFixed(1)} | ${x.outcomes.tir.toFixed(1)}% | ${x.outcomes.tar.toFixed(1)}% | ${x.outcomes.tbr.toFixed(2)}% | ${x.outcomes.tbr54.toFixed(2)}% | ${x.outcomes.cv.toFixed(1)}% | ${x.outcomes.any70.toFixed(1)}% |`);
for(const [a,x] of Object.entries(results)){md+=['',`## ${a}`,'','| day | TDD/kg | basal U | breakfast U | lunch U | dinner U | mean 4-point BG | mean glucose | TIR | TAR | TBR |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];for(const d of x.day)md.push(`| ${d.day} | ${d.tdd_kg.toFixed(3)} | ${d.basal_u.toFixed(1)} | ${d.breakfast_u.toFixed(1)} | ${d.lunch_u.toFixed(1)} | ${d.dinner_u.toFixed(1)} | ${d.mean_four_point.toFixed(1)} | ${d.mean_glucose.toFixed(1)} | ${d.tir.toFixed(1)}% | ${d.tar.toFixed(1)}% | ${d.tbr.toFixed(2)}% |`)}
md+=['','## Interpretation guardrails','- Do not tune archetype prevalence from this audit.','- Do not tune patient physiology to force a desired TDD trajectory.','- poor_control_ir and beta_failure_long_duration are intentionally distinct mechanisms despite both permitting chronic hyperglycemia.','- Renal physiology remains OFF so treatment-policy and renal-clearance effects are not conflated.','- A credible result should show higher insulin requirements for obesity/IR phenotypes and distinguish insulin-resistant poor control from low-beta long-duration disease without direct archetype-to-glucose multipliers.'];
fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
