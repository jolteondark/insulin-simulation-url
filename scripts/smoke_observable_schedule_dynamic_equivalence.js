#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of [
 't2dm_patient_phenotype_v1_shanghai_exp.js',
 't2dm_patient_phenotype_v2_shanghai106_exp.js',
 't2dm_patient_phenotype_v3_inpatient_mix_exp.js',
 't2dm_game_model_v2_order_decomp_exp.js',
 't2dm_inpatient_dynamic_v1_poc_safety_exp.js',
 't2dm_inpatient_dynamic_v1_observable_schedule_exp.js',
 't2dm_counterregulation_v2_egp_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,
 A=T2DMInpatientDynamicV1PocSafetyExp,B=T2DMInpatientDynamicV1ObservableScheduleExp,CR=T2DMCounterregulationV2EgpExp;
let maxAbs=0,mismatches=0,checked=0;
for(let i=1;i<=300;i++){
 const p=P.sample(i,{preset:'support_sweep'}),o=M.suggestOrder(p),state={
  stress_severity:(i%5)*0.12,
  admission_glucose_offset_mg_dl:i%3===0?60:0,
  bolus_tau_min:70+(i%4)*10,
  bolus_duration_min:260+(i%4)*30,
  insulin_exposure_multiplier:.9+(i%5)*.05,
  prandial_mass_action_low_side:i%2===0,
  prandial_mass_action_reference_mg_dl:100,
  ...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10}),
  prandial_safety_adjustment_fn:({poc_glucose_mg_dl,planned_units})=>poc_glucose_mg_dl<100?Math.max(0,planned_units-1):planned_units,
  bedtime_correction_fn:({glucose_mg_dl})=>glucose_mg_dl>250?2:0,
  hypoglycemia_rescue_fn:({t,glucose_mg_dl})=>(t===420&&glucose_mg_dl<70)?{carbs_g:15,cooldown_min:15,label:'smoke'}:0
 };
 const a=A.simulateDay(M,p,o,state,i,null),b=B.simulateDay(M,p,o,state,i,null);
 if(a.series.length!==b.series.length)throw new Error('series length mismatch');
 for(let t=0;t<a.series.length;t++){
  const d=Math.abs(a.series[t]-b.series[t]);if(d>maxAbs)maxAbs=d;if(d!==0)mismatches++;checked++;
 }
 const ja=JSON.stringify({end:a.end,min:a.min,max:a.max,bed:a.bedtime_corrections,pr:a.prandial_safety_adjustments,res:a.hypoglycemia_rescues});
 const jb=JSON.stringify({end:b.end,min:b.min,max:b.max,bed:b.bedtime_corrections,pr:b.prandial_safety_adjustments,res:b.hypoglycemia_rescues});
 if(ja!==jb)throw new Error('metadata mismatch seed '+i+'\n'+ja+'\n'+jb);
}
console.log(JSON.stringify({checked_points:checked,max_abs_difference:maxAbs,nonzero_point_differences:mismatches,legacy_version:A.version,derivative_version:B.version},null,2));
if(maxAbs!==0||mismatches!==0)process.exit(2);
