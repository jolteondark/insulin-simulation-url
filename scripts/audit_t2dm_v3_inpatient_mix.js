#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const G=T2DMPatientPhenotypeV3InpatientMixExp;
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function q(a,p){const x=[...a].sort((a,b)=>a-b),i=(x.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return x[lo]+(x[hi]-x[lo])*(i-lo)}
function stats(rows,key){const a=rows.map(x=>Number(x[key])).filter(Number.isFinite);return{n:a.length,mean:mean(a),sd:sd(a),p05:q(a,.05),p50:q(a,.5),p95:q(a,.95),min:Math.min(...a),max:Math.max(...a)}}
const N=20000,rows=[];for(let i=1;i<=N;i++)rows.push(G.sample(i));
const groups={all:rows};for(const k of Object.keys(G.DEFAULT_WEIGHTS))groups[k]=rows.filter(x=>x.patient_archetype===k);
const keys=['age_years','bmi_kg_m2','body_weight_kg','duration_years','egfr_ml_min_1_73m2','fasting_c_peptide_nmol_l','beta_cell_reserve','si_relative','hepatic_ir','observed_fasting_glucose_mg_dl','dynamic_fasting_setpoint_mg_dl'];
const out={version:G.version,weights:G.DEFAULT_WEIGHTS,n:N,groups:{}};
for(const [name,xs] of Object.entries(groups)){out.groups[name]={n:xs.length};for(const k of keys)out.groups[name][k]=stats(xs,k)}
const dir='analysis/t2dm_v3_inpatient_mix';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# T2DM V3 inpatient phenotype mixture audit','','This generator broadens static phenotype support only. The default mixture weights are sensitivity weights, not an estimate of national inpatient prevalence. Core glucose dynamics and treatment-policy rules are not calibrated here.','','## Mixture',''];
for(const k of Object.keys(G.DEFAULT_WEIGHTS))md.push(`- ${k}: ${(100*groups[k].length/N).toFixed(1)}% (configured ${(100*G.DEFAULT_WEIGHTS[k]).toFixed(1)}%)`);
md+=['','## Static phenotype summary','','| group | n | age | BMI | eGFR | C-peptide | SI | observed FPG | treated eq |','|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const [name,xs] of Object.entries(groups)){const s=out.groups[name];md.push(`| ${name} | ${xs.length} | ${s.age_years.mean.toFixed(1)}±${s.age_years.sd.toFixed(1)} | ${s.bmi_kg_m2.mean.toFixed(1)}±${s.bmi_kg_m2.sd.toFixed(1)} | ${s.egfr_ml_min_1_73m2.mean.toFixed(0)}±${s.egfr_ml_min_1_73m2.sd.toFixed(0)} | ${s.fasting_c_peptide_nmol_l.mean.toFixed(2)}±${s.fasting_c_peptide_nmol_l.sd.toFixed(2)} | ${s.si_relative.mean.toFixed(2)}±${s.si_relative.sd.toFixed(2)} | ${s.observed_fasting_glucose_mg_dl.mean.toFixed(0)}±${s.observed_fasting_glucose_mg_dl.sd.toFixed(0)} | ${s.dynamic_fasting_setpoint_mg_dl.mean.toFixed(0)}±${s.dynamic_fasting_setpoint_mg_dl.sd.toFixed(0)} |`)}
const A=out.groups.shanghai_anchor,O=out.groups.obesity_ir,E=out.groups.elderly_ckd,H=out.groups.chronic_hyperglycemia;
const checks=[
 ['obesity BMI > anchor',O.bmi_kg_m2.mean>A.bmi_kg_m2.mean+5],
 ['obesity SI < anchor',O.si_relative.mean<A.si_relative.mean-.15],
 ['elderly age > anchor',E.age_years.mean>A.age_years.mean+8],
 ['elderly eGFR < anchor',E.egfr_ml_min_1_73m2.mean<A.egfr_ml_min_1_73m2.mean-35],
 ['hyperglycemia FPG > anchor',H.observed_fasting_glucose_mg_dl.mean>A.observed_fasting_glucose_mg_dl.mean+50],
 ['mixture BMI p95 >= 40',out.groups.all.bmi_kg_m2.p95>=40],
 ['mixture SI p05 <= 0.35',out.groups.all.si_relative.p05<=.35]
];
md+=['','## Directional checks'];for(const [name,ok] of checks)md.push(`- ${ok?'PASS':'FAIL'} — ${name}`);
md+=['','## Guardrails','- Do not infer disease prevalence from DEFAULT_WEIGHTS.','- Do not use `patient_archetype` as a direct glucose multiplier. It only generates correlated static physiology.','- Treatment policy must remain blind to hidden SI, beta-cell reserve and hepatic IR.','- External validation must report results stratified by archetype as well as pooled.'];
fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));if(checks.some(x=>!x[1]))process.exitCode=2;
