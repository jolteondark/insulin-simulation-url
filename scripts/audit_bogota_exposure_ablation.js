#!/usr/bin/env node
'use strict';
const fs=require('fs'),Module=require('module');
const basePath='scripts/audit_bogota_frozen_composite_external.js';
const base=fs.readFileSync(basePath,'utf8');
const armBlock=/const ARMS=\[[\s\S]*?\n\];/;
const oneArm="const ARMS=[{name:'age_start_standardized_meals',renal_mode:'age_only',meal_match:false,primary:true}];";
const fullBed="bedtime_correction_fn:({glucose_mg_dl})=>{const u=BP.supplement(glucose_mg_dl,'usual');counter.bedtime_supplement_u+=u;return u;}";
const halfBed="bedtime_correction_fn:({glucose_mg_dl})=>{const u=BP.bedtimeSupplement(glucose_mg_dl,'usual');counter.bedtime_supplement_u+=u;return u;}";
const premeal="const supp=BP.supplement(poc_glucose_mg_dl,'usual');";
const cfgTrue="const cfg={days:7,titrate:true,";
const variants=[
 {name:'full_protocol_corrected',premeal:true,bedtime:true,titrate:true},
 {name:'no_bedtime_correction_diagnostic',premeal:true,bedtime:false,titrate:true},
 {name:'no_premeal_correction_diagnostic',premeal:false,bedtime:true,titrate:true},
 {name:'no_supplement_diagnostic',premeal:false,bedtime:false,titrate:true},
 {name:'no_basal_titration_diagnostic',premeal:true,bedtime:true,titrate:false}
];
const out={purpose:'Causal treatment-exposure decomposition under the frozen mass-action100 + CR V2 width10/reserve1 physiology and outcome-blind Bogotá baseline matching. Diagnostic ablations are not candidate policies and must not be selected by closeness to Bogotá outcomes.',n_per_variant:4000,variants:[]};
for(const v of variants){
 let src=base;
 if(!armBlock.test(src))throw new Error('ARMS block not found');
 src=src.replace(armBlock,oneArm).replace('const gp=PK.get(\'glulisine\'),REQUESTED_N=8000;','const gp=PK.get(\'glulisine\'),REQUESTED_N=4000;');
 if(!src.includes(fullBed))throw new Error('full bedtime callback not found');
 src=src.replace(fullBed,v.bedtime?halfBed:"bedtime_correction_fn:({glucose_mg_dl})=>0");
 if(!src.includes(premeal))throw new Error('premeal supplement line not found');
 if(!v.premeal)src=src.replace(premeal,'const supp=0;');
 if(!v.titrate){if(!src.includes(cfgTrue))throw new Error('cfg titrate marker not found');src=src.replace(cfgTrue,'const cfg={days:7,titrate:false,');}
 const mod=new Module(basePath,module);mod.filename=basePath;mod.paths=module.paths;mod._compile(src,basePath);
 const r=JSON.parse(fs.readFileSync('analysis/bogota_frozen_composite_external/results.json','utf8'));
 const s=r.arms[0].summary;
 out.variants.push({name:v.name,mean_bg:s.mean_bg,poc_mean_bg:s.poc_mean_bg,tbr70_pct:s.tbr70_pct,tbr54_pct:s.tbr54_pct,tar180_pct:s.tar180_pct,raw_any70_pct:s.raw_any70_pct,raw_events70_per_patient:s.raw_events70_per_patient,raw_any40_pct:s.raw_any40_pct,sustained_any70_pct:s.sustained_any70_pct,sustained_any54_pct:s.sustained_any54_pct,sustained_events70_per_patient:s.sustained_events70_per_patient,sustained_events54_per_patient:s.sustained_events54_per_patient,mean_basal_u:s.mean_basal_u,mean_sched_order_prandial_u:s.mean_sched_order_prandial_u,supplement_u_per_day:s.supplement_u_per_day,rescues_per_day:s.rescues_per_day,day:s.day});
}
out.targets={cgm_mean:176.2,poc_mean:176.6,raw_any70_pct:26.3,raw_events70_per_patient:1.447,sustained_any70_pct:14.7,sustained_any54_pct:5.8,sustained_events70_per_patient:.323,sustained_events54_per_patient:.059,raw_any40_pct:0};
out.guardrails=['All physiology, PK, basal potency, stress trajectories, patient support, baseline weights and meal structure are identical across variants.','The protocol-faithful bedtime correction is half of the usual RABBIT scale.','Ablations are causal diagnostics only; do not adopt no-correction or no-titration arms as treatment policy based on outcome closeness.'];
const dir='analysis/bogota_exposure_ablation';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Bogotá treatment-exposure causal ablation','',`N=${out.n_per_variant} generated seeds per diagnostic arm. Frozen physiology unchanged.`,'','| arm | mean | POC mean | <70 time | <54 time | raw any<70 | sustained any<70 | sustained any<54 | any<40 | basal U | sched prandial U | supplement U/day | rescue/day |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of out.variants)md.push(`| ${r.name} | ${r.mean_bg.toFixed(1)} | ${r.poc_mean_bg.toFixed(1)} | ${r.tbr70_pct.toFixed(2)}% | ${r.tbr54_pct.toFixed(2)}% | ${r.raw_any70_pct.toFixed(1)}% | ${r.sustained_any70_pct.toFixed(1)}% | ${r.sustained_any54_pct.toFixed(1)}% | ${r.raw_any40_pct.toFixed(2)}% | ${r.mean_basal_u.toFixed(1)} | ${r.mean_sched_order_prandial_u.toFixed(1)} | ${r.supplement_u_per_day.toFixed(1)} | ${r.rescues_per_day.toFixed(2)} |`);
md.push('','Interpretation: use deltas between arms to attribute treatment exposure. Do not choose an ablation arm as the final policy.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
