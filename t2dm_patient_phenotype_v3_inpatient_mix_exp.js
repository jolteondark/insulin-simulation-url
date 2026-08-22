(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function chooseArchetype(seed,weights){const r=rng('t2v3-mix:'+seed)(),entries=Object.entries(weights),tot=entries.reduce((s,x)=>s+x[1],0);let x=r*tot;for(const [k,w] of entries){x-=w;if(x<=0)return k}return entries[entries.length-1][0]}
// SUPPORT_WEIGHTS are deliberately not prevalence estimates. They only exercise broad phenotype support.
const SUPPORT_WEIGHTS={shanghai_anchor:.25,obesity_ir:.20,moderate_ckd:.15,elderly_ckd:.10,chronic_hyperglycemia:.20,beta_failure_long_duration:.10};
const COHORT_PRESETS={
 support_sweep:SUPPORT_WEIGHTS,
 japan_inpatient_sensitivity:{shanghai_anchor:.35,obesity_ir:.10,moderate_ckd:.25,elderly_ckd:.10,chronic_hyperglycemia:.15,beta_failure_long_duration:.05},
 us_obese_inpatient_sensitivity:{shanghai_anchor:.10,obesity_ir:.60,moderate_ckd:.05,elderly_ckd:.05,chronic_hyperglycemia:.15,beta_failure_long_duration:.05}
};
const DEFAULT_WEIGHTS=SUPPORT_WEIGHTS;
function recomputeDerived(p){
 p.bmi_kg_m2=clamp(Number(p.bmi_kg_m2),16,55);p.height_cm=clamp(Number(p.height_cm),140,200);p.body_weight_kg=p.bmi_kg_m2*Math.pow(p.height_cm/100,2);
 p.age_years=clamp(Number(p.age_years),18,95);p.duration_years=clamp(Number(p.duration_years),0,50);p.egfr_ml_min_1_73m2=clamp(Number(p.egfr_ml_min_1_73m2),8,220);
 p.fasting_c_peptide_nmol_l=clamp(Number(p.fasting_c_peptide_nmol_l),.03,2.5);p.beta_cell_reserve=clamp(p.fasting_c_peptide_nmol_l/(p.fasting_c_peptide_nmol_l+.55),.03,.93);
 p.si_relative=clamp(Number(p.si_relative),.18,1.45);p.hepatic_ir=clamp(Number(p.hepatic_ir),.60,2.20);p.observed_fasting_glucose_mg_dl=clamp(Number(p.observed_fasting_glucose_mg_dl),55,500);
 p.dynamic_fasting_setpoint_mg_dl=clamp(Number(p.dynamic_fasting_setpoint_mg_dl),65,300);p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
 p.endogenous_insulin={glucose_threshold_mg_dl:100,halfmax_delta_mg_dl:70,max_effect_u_equiv_per_min:.022*p.beta_cell_reserve,basal_effect_u_equiv_per_min:.004*p.beta_cell_reserve};return p;
}
function applyArchetype(base,archetype,seed){
 const p={...base},z1=randn('t2v3-z1:'+seed),z2=randn('t2v3-z2:'+seed),z3=randn('t2v3-z3:'+seed),z4=randn('t2v3-z4:'+seed);
 if(archetype==='shanghai_anchor'){p.patient_archetype=archetype;p.generator_note='Shanghai-anchored phenotype';return recomputeDerived(p)}
 if(archetype==='obesity_ir'){
   p.age_years=clamp(56+12*z4,30,82);p.bmi_kg_m2=clamp(34+6*z1,24,52);
   p.si_relative=clamp(base.si_relative*Math.exp(-.60-.020*(p.bmi_kg_m2-30)+.10*z2),.18,1.05);p.hepatic_ir=clamp(base.hepatic_ir*Math.exp(.22+.012*(p.bmi_kg_m2-30)+.08*z3),.85,2.20);
   p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(.20+.08*z2),.06,2.5);p.observed_fasting_glucose_mg_dl=clamp(base.observed_fasting_glucose_mg_dl+18+18*z3,70,500);p.dynamic_fasting_setpoint_mg_dl=clamp(base.dynamic_fasting_setpoint_mg_dl+6+6*z3,75,300);
   p.patient_archetype=archetype;p.generator_note='Obesity/IR support including younger obese inpatient cohorts';return recomputeDerived(p)
 }
 if(archetype==='moderate_ckd'){
   p.age_years=clamp(63+12*z1,40,88);p.bmi_kg_m2=clamp(25.8+4.8*z2,18,42);p.egfr_ml_min_1_73m2=clamp(75+25*z3,20,130);p.duration_years=clamp(10.5+9*z4,0,40);
   p.si_relative=clamp(base.si_relative*Math.exp(-.05+.06*z2),.30,1.30);p.observed_fasting_glucose_mg_dl=clamp(base.observed_fasting_glucose_mg_dl+5+12*z2,65,450);
   p.patient_archetype=archetype;p.generator_note='Moderate renal impairment separated from advanced age';return recomputeDerived(p)
 }
 if(archetype==='elderly_ckd'){
   p.age_years=clamp(76+7*z1,62,92);p.bmi_kg_m2=clamp(25.5+4.2*z2,18,39);p.egfr_ml_min_1_73m2=clamp(42+20*z3,8,85);p.duration_years=clamp(Math.max(base.duration_years,8)+6+6*Math.max(0,z1),5,45);
   p.si_relative=clamp(base.si_relative*Math.exp(-.10+.08*z2),.28,1.25);p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(-.10-.08*Math.max(0,z1)),.04,1.8);p.observed_fasting_glucose_mg_dl=clamp(base.observed_fasting_glucose_mg_dl+8+15*z2,65,450);
   p.patient_archetype=archetype;p.generator_note='Older/advanced renal-impaired support';return recomputeDerived(p)
 }
 if(archetype==='chronic_hyperglycemia'){
   // Japanese inpatient CGM data: HbA1c >=10% group was younger, shorter-duration, higher-BMI, higher-IR and had higher C-peptide than better-controlled groups.
   p.age_years=clamp(55+13.5*z1,25,82);p.bmi_kg_m2=clamp(26.9+4.3*z2,18,42);p.duration_years=clamp(6.2+7.1*z3,0,35);p.egfr_ml_min_1_73m2=clamp(90.9+28.3*z4,20,160);
   p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(.18+.10*z2),.06,2.5);p.si_relative=clamp(base.si_relative*Math.exp(-.22-.03*Math.max(0,p.bmi_kg_m2-25)),.22,1.20);p.hepatic_ir=clamp(base.hepatic_ir*Math.exp(.15+.05*z2),.75,2.0);
   p.observed_fasting_glucose_mg_dl=clamp(Math.max(base.observed_fasting_glucose_mg_dl,190)+55+35*z4,120,500);p.dynamic_fasting_setpoint_mg_dl=clamp(base.dynamic_fasting_setpoint_mg_dl+10+8*z4,80,300);
   p.patient_archetype=archetype;p.generator_note='Poor-control/IR phenotype; high HbA1c does not imply beta failure';return recomputeDerived(p)
 }
 if(archetype==='beta_failure_long_duration'){
   p.age_years=clamp(64+11*z1,40,88);p.bmi_kg_m2=clamp(24.8+4.2*z2,18,38);p.duration_years=clamp(Math.max(base.duration_years,10)+8+5*Math.max(0,z3),8,48);
   p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(-.45-.15*Math.max(0,z3)),.03,1.2);p.si_relative=clamp(base.si_relative*Math.exp(-.05),.28,1.25);p.observed_fasting_glucose_mg_dl=clamp(base.observed_fasting_glucose_mg_dl+25+25*z4,80,500);p.dynamic_fasting_setpoint_mg_dl=clamp(base.dynamic_fasting_setpoint_mg_dl+10+6*z4,75,300);
   p.patient_archetype=archetype;p.generator_note='Long-duration beta-cell-failure phenotype separated from poor-control IR';return recomputeDerived(p)
 }
 throw new Error('Unknown archetype: '+archetype);
}
function sample(seed=1,opts={}){if(!window.T2DMPatientPhenotypeV2Shanghai106Exp)throw new Error('T2DMPatientPhenotypeV2Shanghai106Exp must load first');const base=T2DMPatientPhenotypeV2Shanghai106Exp.sample(seed);const weights=opts.weights||((opts.preset&&COHORT_PRESETS[opts.preset])||DEFAULT_WEIGHTS);const archetype=opts.archetype||chooseArchetype(seed,weights);const p=applyArchetype(base,archetype,seed);p.phenotype='T2DM';p.generator_version='t2dm-v3-inpatient-mixture-exp-2026-08-20';return p}
window.T2DMPatientPhenotypeV3InpatientMixExp={version:'0.3-static-cohort-support-refactor-exp-2026-08-20',DEFAULT_WEIGHTS,SUPPORT_WEIGHTS,COHORT_PRESETS,sample,applyArchetype};
})();
