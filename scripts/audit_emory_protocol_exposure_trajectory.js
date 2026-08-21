#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_poc_safety_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_emory_u300_trial_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1PocSafetyExp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyEmoryU300TrialExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp;
const gp=PK.get('glulisine'),N=5000;
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function mealPatch({order,state}){return{prandial_safety_adjustment_fn:({meal,poc_glucose_mg_dl,planned_units})=>TP.mealDose({meal,poc_glucose_mg_dl,planned_units,state})};}
function run(){
 const days=Array.from({length:8},(_,i)=>({day:i+1,poc:[],latent:[],basal:[],pr:[],supp:[],tddkg:[],p20:0,n:0}));
 const horizons={4:{poc:[],latent:[],p20:0,n:0},6:{poc:[],latent:[],p20:0,n:0},8:{poc:[],latent:[],p20:0,n:0}};
 for(let i=1;i<=N;i++){
   const p=P.sample(i,{preset:'us_obese_inpatient_sensitivity'}),adm=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:adm}),tr=T.choose(i);
   const cfg={days:8,titrate:true,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:(ord,bg)=>TP.registered2019Titrate(ord,bg),state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,i),...B.statePatch(M,.20),...mealPatch(ctx),bedtime_correction_fn:({glucose_mg_dl})=>TP.bedtimeSupplement(glucose_mg_dl,'usual')})};
   const c=C.simulateCourse(M,D,p,o,cfg,i);
   for(const r of c.records){
     const d=days[r.day-1],ord=r.order,pr=ord.breakfast_u+ord.lunch_u+ord.dinner_u,supp=(r.prandial_safety_adjustments||[]).reduce((s,a)=>s+Math.max(0,(a.given_units||0)-(a.planned_units||0)),0)+(r.bedtime_corrections||[]).reduce((s,a)=>s+(a.units||0),0);
     d.basal.push(ord.basal_u);d.pr.push(pr);d.supp.push(supp);d.tddkg.push((ord.basal_u+pr+supp)/p.body_weight_kg);d.n++;
     const poc=[r.series[420],r.series[720],r.series[1080],r.series[1260]];d.poc.push(...poc);let any20=false;for(let t=0;t<1440;t+=15){const x=r.series[t];d.latent.push(x);if(x<20)any20=true;}if(any20)d.p20++;
   }
   for(const h of [4,6,8]){const recs=c.records.slice(0,h);let any20=false;for(const r of recs){horizons[h].poc.push(r.series[420],r.series[720],r.series[1080],r.series[1260]);for(let t=0;t<1440;t+=15){const x=r.series[t];horizons[h].latent.push(x);if(x<20)any20=true;}}if(any20)horizons[h].p20++;horizons[h].n++;}
 }
 const summarize=x=>{const vals=x;let n70=0,n180=0,n250=0;for(const v of vals){if(v<70)n70++;if(v>180)n180++;if(v>250)n250++;}return{mean:mean(vals),tir_pct:100*(vals.length-n70-n180)/vals.length,tar180_pct:100*n180/vals.length,tar250_pct:100*n250/vals.length,tbr70_pct:100*n70/vals.length};};
 const dayRows=days.map(d=>({day:d.day,poc:summarize(d.poc),latent:summarize(d.latent),basal_u:mean(d.basal),scheduled_prandial_u:mean(d.pr),supplement_u:mean(d.supp),tdd_per_kg:mean(d.tddkg),day_any20_pct:100*d.p20/d.n}));
 const horizonRows={};for(const h of [4,6,8])horizonRows[h]={poc:summarize(horizons[h].poc),latent:summarize(horizons[h].latent),patients_below20_pct:100*horizons[h].p20/horizons[h].n};
 const out={purpose:'Protocol-fidelity exposure trajectory audit after correcting registered fasting AND predinner basal-titration logic. No parameter tuning. Quantifies whether fixed 8-day horizon materially drives exposure mismatch versus the U300 parent trial and Galindo cohort.',n:N,day_rows:dayRows,horizons:horizonRows,benchmarks:{u300_trial_tdd_per_kg:0.43,u300_trial_basal_u:29.0,u300_trial_prandial_u:14.4,u300_trial_supplement_u:7.6,u300_trial_los_median_days:6,galindo_los_median_days:7.5}};
 const dir='analysis/emory_protocol_exposure_trajectory';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
 let md=['# Emory protocol exposure trajectory','','No tuning. Registered protocol AND-logic fix is held fixed.','','| day | POC mean | POC TIR | latent mean | basal U | scheduled prandial U | supplement U | TDD/kg | day any <20 |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];for(const r of dayRows)md.push(`| ${r.day} | ${r.poc.mean.toFixed(1)} | ${r.poc.tir_pct.toFixed(1)}% | ${r.latent.mean.toFixed(1)} | ${r.basal_u.toFixed(1)} | ${r.scheduled_prandial_u.toFixed(1)} | ${r.supplement_u.toFixed(1)} | ${r.tdd_per_kg.toFixed(3)} | ${r.day_any20_pct.toFixed(2)}% |`);
 md.push('','## Horizon sensitivity','| horizon | POC mean | POC TIR | latent mean | latent TIR | patients <20 |','|---:|---:|---:|---:|---:|---:|');for(const h of [4,6,8]){const r=horizonRows[h];md.push(`| ${h}d | ${r.poc.mean.toFixed(1)} | ${r.poc.tir_pct.toFixed(1)}% | ${r.latent.mean.toFixed(1)} | ${r.latent.tir_pct.toFixed(1)}% | ${r.patients_below20_pct.toFixed(2)}% |`);}md.push('','Benchmarks: U300 trial TDD 0.43 U/kg/day; basal 29.0 U/day; prandial 14.4 U/day; supplemental 7.6 U/day; LOS median 6 days. Galindo cohort LOS median 7.5 days.','', 'Guardrails:','- Do not select a horizon from closeness to Emory endpoints.','- Do not alter published correction scales or basal percentages from this audit.','- Use this only to identify whether exposure mismatch is early, late, or horizon-driven.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
}
run();
