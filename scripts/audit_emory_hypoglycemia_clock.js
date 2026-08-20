#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp;
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
const N=800,hourly=Array.from({length:24},(_,h)=>({hour:h,points:0,below70:0,below54:0,patients70:new Set(),patients54:new Set()}));
const gp=PK.get('glulisine');
for(let i=1;i<=N;i++){
 const p=P.sample(i,{preset:'us_obese_inpatient_sensitivity'}),admission=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:admission}),trajectory=T.choose(i);
 const cfg={days:8,titrate:true,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,titrate_order_fn:(ord,bg)=>TP.componentTitrate(ord,bg),steroid:false,admission_glucose_offset_mg_dl:0,initial_stress_severity:0,stress_daily_decay:0,state_modifier_fn:T.stateModifier(trajectory,i)};
 const c=C.simulateCourse(M,D,p,o,cfg,i);
 for(const rec of c.records)for(let t=0;t<1440;t+=15){const h=Math.floor(t/60),x=rec.series[t],q=hourly[h];q.points++;if(x<70){q.below70++;q.patients70.add(i)}if(x<54){q.below54++;q.patients54.add(i)}}
}
const rows=hourly.map(q=>({hour:q.hour,tbr70:100*q.below70/q.points,tbr54:100*q.below54/q.points,patient_any70:100*q.patients70.size/N,patient_any54:100*q.patients54.size/N}));
const nocturnal=rows.filter(r=>r.hour<6),daytime=rows.filter(r=>r.hour>=6);
const peak54=[...rows].sort((a,b)=>b.tbr54-a.tbr54)[0],peak70=[...rows].sort((a,b)=>b.tbr70-a.tbr70)[0];
const checks=[
 ['nocturnal <54 materially present',Math.max(...nocturnal.map(x=>x.tbr54))>=0.5],
 ['hypoglycemia not concentrated only in daytime',peak54.hour<6||Math.max(...nocturnal.map(x=>x.tbr54))>=.5*Math.max(...daytime.map(x=>x.tbr54))]
];
const out={n:N,rows,peak70,peak54,checks,reference:{emory_any54_pct:36,emory_nocturnal54_pct:26,nocturnal_window:'00:00-06:00'}};
const dir='analysis/emory_hypoglycemia_clock';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Emory hypoglycemia clock audit','','Purpose: test whether simulated hypoglycemia occurs at clinically plausible clock times rather than only matching pooled TBR. Uses the fixed heterogeneous stress trajectories, US-obese phenotype sensitivity preset, component-specific treatment policy, glulisine literature prior, renal OFF and steroid OFF.','','Emory reported any CGM <54 mg/dL in 36% of patients and nocturnal <54 mg/dL in 26%.','','| hour | TBR <70 | TBR <54 | patients any <70 | patients any <54 |','|---:|---:|---:|---:|---:|'];
for(const r of rows)md.push(`| ${String(r.hour).padStart(2,'0')}:00 | ${r.tbr70.toFixed(2)}% | ${r.tbr54.toFixed(2)}% | ${r.patient_any70.toFixed(1)}% | ${r.patient_any54.toFixed(1)}% |`);
md+=['',`Peak <70 hour: ${peak70.hour}:00 (${peak70.tbr70.toFixed(2)}%).`,`Peak <54 hour: ${peak54.hour}:00 (${peak54.tbr54.toFixed(2)}%).`,'','## Structural checks'];for(const [name,ok] of checks)md.push(`- ${ok?'PASS':'FAIL'} — ${name}`);
md+=['','## Guardrails','- Do not tune stress-trajectory weights to move hypoglycemia into the night.','- If nocturnal hypoglycemia remains absent, investigate basal/fasting physiology before changing prandial PK.','- Do not add Gaussian glucose noise to satisfy this audit.'];
fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));if(checks.some(x=>!x[1]))process.exitCode=2;
