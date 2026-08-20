#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp;
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function run(mode,mult,N=400){const gp=PK.get('glulisine'),patient=[];for(let i=1;i<=N;i++){
 const p=P.sample(i,{preset:'us_obese_inpatient_sensitivity'}),admission=Math.max(70,Math.min(400,p.observed_fasting_glucose_mg_dl)),o=TP.startingOrder(p,{admission_bg_mg_dl:admission});o.basal_u=Math.max(0,Math.round(o.basal_u*mult));const trajectory=T.choose(i);
 const patch=mode==='unit_consistent'?B.statePatch(M,1):{};
 const cfg={days:8,titrate:false,allow_meal_mismatch:true,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:30,underbolus_probability:.08,allow_npo:true,npo_day_probability:.06,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,steroid:false,admission_glucose_offset_mg_dl:0,initial_stress_severity:0,stress_daily_decay:0,state_modifier_fn:({day})=>({...T.statePatch(trajectory,day,i),...patch})};
 const c=C.simulateCourse(M,D,p,o,cfg,i),xs=[],nox=[];for(const rec of c.records){for(let t=0;t<1440;t+=15){xs.push(rec.series[t]);if(t<360)nox.push(rec.series[t]);}}
 patient.push({mean:mean(xs),tbr54:100*xs.filter(x=>x<54).length/xs.length,nocturnal54:nox.some(x=>x<54)});
 }
 return{mode,mult,mean:mean(patient.map(x=>x.mean)),tbr54:mean(patient.map(x=>x.tbr54)),nocturnal54:100*patient.filter(x=>x.nocturnal54).length/patient.length};
}
const rows=[];for(const mode of ['legacy','unit_consistent'])for(const mult of [.8,1,1.2])rows.push(run(mode,mult));
function get(mode,m){return rows.find(x=>x.mode===mode&&x.mult===m)}
const legacySlope=get('legacy',.8).mean-get('legacy',1.2).mean,unitSlope=get('unit_consistent',.8).mean-get('unit_consistent',1.2).mean;
const checks=[
 ['legacy basal response is pathologically weak',legacySlope<2],
 ['unit-consistent basal response is materially stronger',unitSlope>10],
 ['unit-consistent response is >5x legacy',unitSlope>5*Math.max(.1,legacySlope)],
 ['higher basal raises nocturnal <54 incidence',get('unit_consistent',1.2).nocturnal54>get('unit_consistent',.8).nocturnal54]
];
const out={derived_daily_gain:B.unitConsistentDailyGain(M,1),rows,legacy_mean_slope_08_to_12:legacySlope,unit_mean_slope_08_to_12:unitSlope,checks};
const dir='analysis/basal_delta_potency';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Basal dose-deviation potency audit','','This is a unit-consistency mechanism audit, not outcome calibration. The maintenance basal requirement remains implicit in the frozen fasting equilibrium; only deviations from the reference basal dose are challenged. Unit-consistent gain is derived from the simulator prandial 1-U integrated effect.','','Derived unit-consistent daily gain: '+out.derived_daily_gain.toFixed(2)+' mg/dL-equivalent per U at SI=1.','','| mode | basal multiplier | mean glucose | TBR <54 | patients nocturnal <54 |','|---|---:|---:|---:|---:|'];for(const r of rows)md.push(`| ${r.mode} | ${r.mult.toFixed(1)} | ${r.mean.toFixed(1)} | ${r.tbr54.toFixed(2)}% | ${r.nocturnal54.toFixed(1)}% |`);md+=['','## Checks'];for(const [n,ok] of checks)md.push(`- ${ok?'PASS':'FAIL'} — ${n}`);md+=['','## Guardrails','- Do not fit the derived gain to Emory glucose metrics.','- Existing simulations remain unchanged unless the optional basal_delta_gain_per_day hook is enabled.','- This audit does not establish the final U100/U300 time profile; it only tests missing per-unit potency of basal-dose deviations.'];fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));if(checks.some(x=>!x[1]))process.exitCode=2;
