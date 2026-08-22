#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_poc_safety_exp.js','t2dm_inpatient_dynamic_v1_observable_correction_exp.js','t2dm_counterregulation_v2_egp_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,A=T2DMInpatientDynamicV1PocSafetyExp,B=T2DMInpatientDynamicV1ObservableCorrectionExp,CR=T2DMCounterregulationV2EgpExp;
let maxAbs=0,bad=0,checked=0;
for(let i=1;i<=1200;i++){
 const p=P.sample(i,{preset:i%2?'support_sweep':'us_obese_inpatient_sensitivity'}),o={breakfast_u:(i%8)+2,lunch_u:(i%9)+3,dinner_u:(i%7)+2,basal_u:(i%18)+5};
 const s={stress_severity:(i%11)/15,admission_glucose_offset_mg_dl:i%3?0:80,bolus_tau_min:70+(i%4)*15,bolus_duration_min:260+(i%5)*30,prandial_mass_action_low_side:i%2===0,prandial_mass_action_reference_mg_dl:100,...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})};
 if(i%5===0)s.intake_fraction={breakfast:.7,lunch:.9,dinner:.55};
 if(i%7===0){s.meal_shift_min={breakfast:-12,lunch:8,dinner:15};s.bolus_shift_min={breakfast:-12,lunch:8,dinner:15};}
 const a=A.simulateDay(M,p,o,s,i,null),b=B.simulateDay(M,p,o,s,i,null);
 if(a.series.length!==b.series.length){bad++;continue}
 for(let t=0;t<a.series.length;t++){const d=Math.abs(a.series[t]-b.series[t]);if(d>maxAbs)maxAbs=d;if(d>1e-12){bad++;break}}
 checked++;
}
const pass=bad===0&&maxAbs<=1e-12;
const out={checked,bad,max_abs_difference:maxAbs,pass,original_version:A.version,derivative_version:B.version};
fs.mkdirSync('analysis/observable_correction_dynamic_equivalence',{recursive:true});fs.writeFileSync('analysis/observable_correction_dynamic_equivalence/results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));process.exit(pass?0:2);
