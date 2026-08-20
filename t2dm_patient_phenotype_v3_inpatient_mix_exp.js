(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function chooseArchetype(seed,weights){const r=rng('t2v3-mix:'+seed)(),entries=Object.entries(weights),tot=entries.reduce((s,x)=>s+x[1],0);let x=r*tot;for(const [k,w] of entries){x-=w;if(x<=0)return k}return entries[entries.length-1][0]}
const DEFAULT_WEIGHTS={shanghai_anchor:.30,obesity_ir:.40,elderly_ckd:.20,chronic_hyperglycemia:.10};
function recomputeDerived(p){
 p.bmi_kg_m2=clamp(Number(p.bmi_kg_m2),16,55);
 p.height_cm=clamp(Number(p.height_cm),140,200);
 p.body_weight_kg=p.bmi_kg_m2*Math.pow(p.height_cm/100,2);
 p.egfr_ml_min_1_73m2=clamp(Number(p.egfr_ml_min_1_73m2),8,220);
 p.fasting_c_peptide_nmol_l=clamp(Number(p.fasting_c_peptide_nmol_l),0.03,2.5);
 p.beta_cell_reserve=clamp(p.fasting_c_peptide_nmol_l/(p.fasting_c_peptide_nmol_l+0.55),0.03,.93);
 p.si_relative=clamp(Number(p.si_relative),0.18,1.45);
 p.hepatic_ir=clamp(Number(p.hepatic_ir),0.60,2.20);
 p.observed_fasting_glucose_mg_dl=clamp(Number(p.observed_fasting_glucose_mg_dl),55,500);
 p.dynamic_fasting_setpoint_mg_dl=clamp(Number(p.dynamic_fasting_setpoint_mg_dl),65,300);
 p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
 p.endogenous_insulin={
   glucose_threshold_mg_dl:100,
   halfmax_delta_mg_dl:70,
   max_effect_u_equiv_per_min:0.022*p.beta_cell_reserve,
   basal_effect_u_equiv_per_min:0.004*p.beta_cell_reserve
 };
 return p;
}
function applyArchetype(base,archetype,seed){
 const p={...base},z1=randn('t2v3-z1:'+seed),z2=randn('t2v3-z2:'+seed),z3=randn('t2v3-z3:'+seed);
 if(archetype==='shanghai_anchor'){
   p.patient_archetype='shanghai_anchor';
   p.generator_note='Shanghai-anchored phenotype; unchanged static physiology except V3 metadata';
   return recomputeDerived(p);
 }
 if(archetype==='obesity_ir'){
   // Expand the phenotype support rather than multiplying glucose directly.
   // BMI and IR move together, but retain within-group heterogeneity.
   p.bmi_kg_m2=clamp(34.0+6.0*z1,24,52);
   p.si_relative=clamp(base.si_relative*Math.exp(-0.42-0.018*(p.bmi_kg_m2-30)+0.10*z2),0.18,1.05);
   p.hepatic_ir=clamp(base.hepatic_ir*Math.exp(0.22+0.012*(p.bmi_kg_m2-30)+0.08*z3),0.85,2.20);
   p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(0.20+0.08*z2),0.06,2.5);
   p.observed_fasting_glucose_mg_dl=clamp(base.observed_fasting_glucose_mg_dl+18+18*z3,70,500);
   p.dynamic_fasting_setpoint_mg_dl=clamp(base.dynamic_fasting_setpoint_mg_dl+6+6*z3,75,300);
   p.patient_archetype='obesity_ir';
   p.generator_note='Obesity/insulin-resistance support extension; no direct outcome fitting';
   return recomputeDerived(p);
 }
 if(archetype==='elderly_ckd'){
   p.age_years=clamp(76+7*z1,62,92);
   p.bmi_kg_m2=clamp(25.5+4.2*z2,18,39);
   p.egfr_ml_min_1_73m2=clamp(42+20*z3,8,85);
   p.duration_years=clamp(Math.max(base.duration_years,8)+6+6*Math.max(0,z1),5,45);
   p.si_relative=clamp(base.si_relative*Math.exp(-0.10+0.08*z2),0.28,1.25);
   p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(-0.10-0.08*Math.max(0,z1)),0.04,1.8);
   p.observed_fasting_glucose_mg_dl=clamp(base.observed_fasting_glucose_mg_dl+8+15*z2,65,450);
   p.patient_archetype='elderly_ckd';
   p.generator_note='Older/renal-impaired phenotype support extension; renal state remains physiology, not treatment policy';
   return recomputeDerived(p);
 }
 if(archetype==='chronic_hyperglycemia'){
   p.bmi_kg_m2=clamp(28.5+5.5*z1,20,45);
   p.duration_years=clamp(Math.max(base.duration_years,6)+5+5*Math.max(0,z2),4,45);
   p.fasting_c_peptide_nmol_l=clamp(base.fasting_c_peptide_nmol_l*Math.exp(-0.35-0.12*Math.max(0,z2)),0.03,1.4);
   p.si_relative=clamp(base.si_relative*Math.exp(-0.18-0.05*Math.max(0,z1)),0.22,1.20);
   p.hepatic_ir=clamp(base.hepatic_ir*Math.exp(0.15+0.05*z3),0.75,2.0);
   p.observed_fasting_glucose_mg_dl=clamp(Math.max(base.observed_fasting_glucose_mg_dl,190)+55+35*z3,120,500);
   // Keep treated equilibrium distinct from laboratory glycemia; only a modest shift.
   p.dynamic_fasting_setpoint_mg_dl=clamp(base.dynamic_fasting_setpoint_mg_dl+12+8*z3,80,300);
   p.patient_archetype='chronic_hyperglycemia';
   p.generator_note='Chronic poor-control phenotype support extension; laboratory hyperglycemia is not copied one-for-one into treated equilibrium';
   return recomputeDerived(p);
 }
 throw new Error('Unknown archetype: '+archetype);
}
function sample(seed=1,opts={}){
 if(!window.T2DMPatientPhenotypeV2Shanghai106Exp)throw new Error('T2DMPatientPhenotypeV2Shanghai106Exp must load first');
 const base=T2DMPatientPhenotypeV2Shanghai106Exp.sample(seed);
 const archetype=opts.archetype||chooseArchetype(seed,opts.weights||DEFAULT_WEIGHTS);
 const p=applyArchetype(base,archetype,seed);
 p.phenotype='T2DM';p.generator_version='t2dm-v3-inpatient-mixture-exp-2026-08-20';
 return p;
}
window.T2DMPatientPhenotypeV3InpatientMixExp={version:'0.1-inpatient-mixture-exp-2026-08-20',DEFAULT_WEIGHTS,sample,applyArchetype};
})();
