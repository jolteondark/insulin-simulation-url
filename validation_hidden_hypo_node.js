const fs=require('fs'),vm=require('vm');
global.window=global;const load=f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
for(const f of ['engine.js','patient_generator.js','patient_phenotype_v2.js','clinical_modifiers_v2.js','dosing_policy_v2.js','state_space_v2_finite_memory.js','finite_memory_state_adapter_v2.js','engine_v2.js']) load(f);
const CARBS={breakfast:50,lunch:70,dinner:60},CHECKS=[420,720,1080,1260];
function ctx(){return{rapid_formulation:'aspart',basal_formulation:'glargine',prednisone_mg:0,infection_severity:0,meal_plan_carb_g:{...CARBS},intake_fraction:{breakfast:1,lunch:1,dinner:1}}}
function makePatient(base){const p=PatientPhenotypeV2.decorate(base),q=ClinicalModifiersV2.decorateClinical(p,{egfr_ml_min_1_73m2:90,meal_plan_carb_g:CARBS});return PatientPhenotypeV2.toEnginePatient(q)}
function sustained(series,thr){let run=0;for(let i=0;i<series.length;i++){if(Number(series[i])<thr)run++;else run=0;if(run>=3)return true}return false}
const N=Number(process.env.N||300),DAYS=Number(process.env.DAYS||7),params={memory_min:Number(process.env.MEMORY||210),stationary_sd:1,basal_requirement_coupling:Number(process.env.COUPLING||0.28),fast_scale:Number(process.env.FAST_SCALE||0.80),setpoint_shift_mg_dl:Number(process.env.SETPOINT_SHIFT||15)};
const patients=PatientGenerator.sampleCandidates(N,7901,false).map(makePatient);
let eligible=0,h70=0,h54=0,allDays=0,all70=0,all54=0;
for(let i=0;i<patients.length;i++){
 const p=patients[i],o=DosingPolicyV2.starterOrder(p,CARBS),rapid={breakfast_u:o.breakfast_u,lunch_u:o.lunch_u,dinner_u:o.dinner_u},b=o.basal_u;
 let st={glucose_mg_dl:p.fasting_setpoint_mg_dl+params.setpoint_shift_mg_dl,metabolic_state:[]};
 for(let d=0;d<DAYS;d++){
   const r=GlucoseEngineV2.simulate(p,ctx(),rapid,b,7901+i*100+d,st,params);st=r.next_state;if(d===0)continue;
   allDays++;
   const checks=CHECKS.map(t=>Number(r.series[t]));
   const s70=sustained(r.series,70),s54=sustained(r.series,54);if(s70)all70++;if(s54)all54++;
   if(checks.every(x=>x>=70)) {eligible++;if(s70)h70++;if(s54)h54++;}
 }
}
const out={protocol:{N,DAYS,warmup_days:1,definition:'>=3 consecutive 1-min values below threshold; all four 07/12/18/21 checks >=70 for hidden-hypo denominator'},params,patient_days:allDays,eligible_four_checks_all_ge70:eligible,hidden_sustained_lt70_pct:100*h70/eligible,hidden_sustained_lt54_pct:100*h54/eligible,overall_sustained_lt70_pct:100*all70/allDays,overall_sustained_lt54_pct:100*all54/allDays,external_reference_T1D_UOM:{hidden_sustained_lt70_pct:35.356,hidden_sustained_lt54_pct:6.860}};
fs.writeFileSync('hidden_hypo_validation_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
