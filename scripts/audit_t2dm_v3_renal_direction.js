#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js','t2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_weight_bg_exp.js','t2dm_renal_insulin_modifier_v1_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyWeightBgExp,R=T2DMRenalInsulinModifierV1Exp;
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function metrics(c){const xs=[];for(const r of c.records)for(let t=0;t<=1440;t+=15)xs.push(r.series[t]);return{mean:mean(xs),tbr:100*xs.filter(x=>x<70).length/xs.length,min:Math.min(...xs)}}
function runEgfr(e,n=500){const out=[];for(let i=1;i<=n;i++){
 const base=P.sample(i,{archetype:'shanghai_anchor'}),referencePatient={...base,egfr_ml_min_1_73m2:90};
 const admission=Math.max(70,Math.min(400,referencePatient.observed_fasting_glucose_mg_dl));
 // Freeze treatment order at the eGFR90 value so this audit isolates renal physiology.
 const o=TP.startingOrder(referencePatient,{admission_bg_mg_dl:admission});
 const p={...base,egfr_ml_min_1_73m2:e};
 const cfg={days:5,titrate:false,admission_glucose_offset_mg_dl:70,initial_stress_severity:.45,stress_daily_decay:.08,state_modifier_fn:({patient})=>({insulin_exposure_multiplier:R.exposureMultiplier(patient)})};
 out.push(metrics(C.simulateCourse(M,D,p,o,cfg,i)));
 }return{egfr:e,exposure:R.exposureMultiplier({egfr_ml_min_1_73m2:e}),mean:mean(out.map(x=>x.mean)),tbr:mean(out.map(x=>x.tbr)),min:mean(out.map(x=>x.min))}}
const rows=[90,60,45,30,20,10].map(runEgfr);
const checks=[['eGFR>=60 exposure exactly 1',rows[0].exposure===1&&rows[1].exposure===1],['eGFR90 and eGFR60 are identical under fixed order',Math.abs(rows[0].mean-rows[1].mean)<1e-9&&Math.abs(rows[0].tbr-rows[1].tbr)<1e-9],['exposure monotonic with renal impairment',rows.every((x,i)=>i===0||x.exposure>=rows[i-1].exposure)],['advanced CKD lowers mean glucose vs eGFR90',rows[4].mean<rows[0].mean],['advanced CKD increases TBR vs eGFR90',rows[4].tbr>rows[0].tbr]];
const dir='analysis/t2dm_v3_renal_direction';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify({rows,checks},null,2));let md=['# T2DM V3 renal insulin-exposure directional audit','','Mechanism-direction audit only. The patient phenotype and insulin order are frozen to the same eGFR90 treatment-policy decision; then eGFR is varied only inside the optional renal physiology modifier. This avoids confounding renal physiology with the clinically appropriate lower starting dose used by the treatment-policy layer at eGFR <=60.','','| eGFR | exposure multiplier | mean glucose | TBR <70 | mean minimum |','|---:|---:|---:|---:|---:|'];for(const r of rows)md.push(`| ${r.egfr} | ${r.exposure.toFixed(2)} | ${r.mean.toFixed(1)} | ${r.tbr.toFixed(2)}% | ${r.min.toFixed(1)} |`);md+=['','## Checks'];for(const [n,ok] of checks)md.push(`- ${ok?'PASS':'FAIL'} — ${n}`);md+=['','## Guardrails','- No effect is applied at eGFR >=60.','- Treatment policy is deliberately frozen in this audit; policy renal dose-reduction is tested separately.','- The modifier is capped at +20% exposure and is intentionally conservative.','- Do not fit the multiplier magnitude from this audit; validate magnitude against a renal cohort before promotion.'];fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));if(checks.some(x=>!x[1]))process.exitCode=2;
