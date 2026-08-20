(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function lognormalFromMeanSd(mean,sd,z){const s2=Math.log(1+(sd*sd)/(mean*mean)),s=Math.sqrt(s2),m=Math.log(mean)-.5*s2;return Math.exp(m+s*z)}
function sample(seed=1){
  const zAge=randn('t2v1-age:'+seed),zSize=randn('t2v1-size:'+seed),zIR=randn('t2v1-ir:'+seed),zDur0=randn('t2v1-dur:'+seed),zBeta0=randn('t2v1-beta:'+seed),zHep=randn('t2v1-hep:'+seed),zFpg0=randn('t2v1-fpg:'+seed),zRenal=randn('t2v1-renal:'+seed);
  const sex=(hash32('t2v1-sex:'+seed)&1)?'M':'F';

  // ShanghaiT2DM static targets: age ~60.2±13.7, BMI ~24.1±3.25, duration ~8.7±8.45.
  const age_years=clamp(60.2+13.7*zAge,30,90);
  const height_m=clamp((sex==='M'?1.70:1.59)+0.075*zSize,1.45,1.90);
  const zBmi=(-0.28*zAge+0.62*zSize+0.52*zIR)/Math.sqrt(0.28**2+0.62**2+0.52**2);
  const bmi_kg_m2=clamp(24.12+3.25*zBmi,17,36);
  const body_weight_kg=bmi_kg_m2*height_m*height_m;

  // Duration is positively associated with age and is strongly right-skewed.
  const zDur=0.38*zAge+Math.sqrt(1-0.38**2)*zDur0;
  const duration_years=clamp(lognormalFromMeanSd(9.2,9.0,zDur),0,40);

  // eGFR is explicit, with the observed age-associated decline (rho ~ -0.42).
  const zEgfr=-0.42*zAge+Math.sqrt(1-0.42**2)*zRenal;
  const egfr_ml_min_1_73m2=clamp(115.8+42.8*zEgfr,25,220);

  // Fasting C-peptide: higher with BMI, lower with longer duration.
  const zCpep=0.25*zBmi-0.35*zDur+Math.sqrt(1-0.25**2-0.35**2)*zBeta0;
  const fasting_c_peptide_nmol_l=clamp(lognormalFromMeanSd(0.476,0.281,zCpep),0.05,1.8);
  const beta_cell_reserve=clamp(fasting_c_peptide_nmol_l/(fasting_c_peptide_nmol_l+0.55),0.05,0.90);

  // IR axes remain latent physiology. BMI influences them, but observed FPG is not forced to track BMI.
  const si_relative=clamp(Math.exp(-0.24*zIR-0.018*(bmi_kg_m2-24.12)),0.35,1.45);
  const hepatic_ir=clamp(Math.exp(0.20*zHep+0.012*(bmi_kg_m2-24.12)),0.65,1.65);

  // Treated-cohort fasting glycemia has large residual dispersion; preserve that rather than over-coupling to BMI/IR.
  const zFpg=0.08*zCpep+Math.sqrt(1-0.08**2)*zFpg0;
  const fasting_setpoint_mg_dl=clamp(60+lognormalFromMeanSd(110,66,zFpg),55,450);

  return {
    phenotype:'T2DM',sex,
    height_cm:height_m*100,bmi_kg_m2,body_weight_kg,age_years,duration_years,
    egfr_ml_min_1_73m2,fasting_c_peptide_nmol_l,
    si_relative,beta_cell_reserve,hepatic_ir,fasting_setpoint_mg_dl,
    endogenous_insulin:{
      glucose_threshold_mg_dl:100,
      halfmax_delta_mg_dl:70,
      max_effect_u_equiv_per_min:0.022*beta_cell_reserve,
      basal_effect_u_equiv_per_min:0.004*beta_cell_reserve
    }
  };
}
window.T2DMPatientPhenotypeV1ShanghaiExp={version:'0.1-shanghai-static-exp-2026-08-20',sample};
})();