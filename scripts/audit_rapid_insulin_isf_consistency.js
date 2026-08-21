#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_treatment_policy_bogota_rabbit_exp.js','insulin_prandial_pk_prior_ranges_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,BP=T2DMTreatmentPolicyBogotaRabbitExp,PK=InsulinPrandialPkPriorRangesExp;
const gp=PK.get('glulisine'),N=10000;
function gamma1(dt,tau){return(dt/tau)*Math.exp(1-dt/tau)}
function area(tau,dur){let a=0;for(let dt=0;dt<dur;dt++)a+=gamma1(dt,tau);return a}
const baseArea=area(M.KERNEL.bolus_tau_min,M.KERNEL.bolus_duration_min),candArea=area(gp.candidate.tau_min,gp.candidate.duration_min),norm=baseArea/candArea;
const oneUatSI1=M.SCALE.bolus_gain*norm*candArea; // identical integrated high-side effect before restore/meal/stress
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function q(a,p){const b=[...a].sort((x,y)=>x-y),i=(b.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return b[l]+(b[h]-b[l])*(i-l)}
const rows=[];
for(let i=1;i<=N;i++){
 const p=P.sample(i,{preset:'support_sweep'}),age=Number(p.age_years),egfr=Number(p.egfr_ml_min_1_73m2);if(age<18||age>80||egfr<30)continue;
 const adm=Math.max(140,Math.min(400,Number(p.observed_fasting_glucose_mg_dl)||180));
 const o=BP.startingOrder(p,{admission_bg_mg_dl:adm},{renal_mode:'age_only'}),tdd=o.basal_u+o.breakfast_u+o.lunch_u+o.dinner_u;
 const modelIsf=oneUatSI1*Number(p.si_relative),rule1800=1800/Math.max(1,tdd);
 rows.push({si:p.si_relative,bmi:p.bmi_kg_m2,tdd,model_isf:modelIsf,rule1800,ratio:modelIsf/rule1800,arch:p.archetype});
}
const out={purpose:'Outcome-independent mechanistic consistency check. Compare the integrated 1-U rapid-insulin high-side effect implied by the model with the conventional 1800/TDD correction-factor heuristic. No external glycemic outcome is used.',one_u_effect_at_si1_mg_dl:oneUatSI1,n:rows.length,summary:{si_mean:mean(rows.map(r=>r.si)),model_isf_mean:mean(rows.map(r=>r.model_isf)),rule1800_mean:mean(rows.map(r=>r.rule1800)),ratio_mean:mean(rows.map(r=>r.ratio)),ratio_p10:q(rows.map(r=>r.ratio),.1),ratio_p50:q(rows.map(r=>r.ratio),.5),ratio_p90:q(rows.map(r=>r.ratio),.9)},by_si_quartile:[]};
const sorted=[...rows].sort((a,b)=>a.si-b.si);for(let k=0;k<4;k++){const s=sorted.slice(Math.floor(k*sorted.length/4),Math.floor((k+1)*sorted.length/4));out.by_si_quartile.push({q:k+1,n:s.length,si:mean(s.map(r=>r.si)),bmi:mean(s.map(r=>r.bmi)),tdd:mean(s.map(r=>r.tdd)),model_isf:mean(s.map(r=>r.model_isf)),rule1800:mean(s.map(r=>r.rule1800)),ratio:mean(s.map(r=>r.ratio))});}
const dir='analysis/rapid_insulin_isf_consistency';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Rapid-insulin ISF consistency diagnostic','',`Integrated model effect at SI=1: ${oneUatSI1.toFixed(1)} mg/dL per U.`,'',`Overall model ISF ${out.summary.model_isf_mean.toFixed(1)} vs 1800/TDD ${out.summary.rule1800_mean.toFixed(1)} mg/dL/U; ratio median ${out.summary.ratio_p50.toFixed(2)} (P10 ${out.summary.ratio_p10.toFixed(2)}, P90 ${out.summary.ratio_p90.toFixed(2)}).`,'','| SI quartile | SI | BMI | TDD U | model ISF | 1800/TDD | ratio |','|---|---:|---:|---:|---:|---:|---:|'];for(const x of out.by_si_quartile)md.push(`| Q${x.q} | ${x.si.toFixed(3)} | ${x.bmi.toFixed(1)} | ${x.tdd.toFixed(1)} | ${x.model_isf.toFixed(1)} | ${x.rule1800.toFixed(1)} | ${x.ratio.toFixed(2)} |`);fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));