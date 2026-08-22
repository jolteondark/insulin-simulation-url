(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function lognormalFromMeanSd(mean,sd,z){const s2=Math.log(1+(sd*sd)/(mean*mean)),s=Math.sqrt(s2),m=Math.log(mean)-.5*s2;return Math.exp(m+s*z)}
function sample(seed=1){
  const zAge=randn('t2v1-age:'+seed),zSize=randn('t2v1-size:'+seed),zIR=randn('t2v1-ir:'+seed),zDur0=randn('t2v1-dur:'+seed),zBeta0=randn('t2v1-beta:'+seed),zHep=randn('t2v1-hep:'+seed),zFpg0=randn('t2v1-fpg:'+seed),zEq0=randn('t2v1-eq:'+seed),zRenal=randn('t2v1-renal:'+seed);
  const sex=(hash32('t2v1-sex:'+seed)&1)?'M':'F';
  const age_years=clamp(60.2+13.7*zAge,30,90);
  const height_m=clamp((sex==='M'?1.70:1.59)+0.075*zSize,1.45,1.90);
  const zBmi=(-0.28*zAge+0.62*zSize+0.52*zIR)/Math.sqrt(0.28**2+0.62**2+0.52**2);
  const bmi_kg_m2=clamp(24.12+3.25*zBmi,17,36);
  const body_weight_kg=bmi_kg_m2*height_m*height_m;

  const ageBmiCorr=-0.28/Math.sqrt(0.28**2+0.62**2+0.52**2);
  const aDur=0.45,bDur=0.20;
  const residualVar=Math.max(0.01,1-aDur*aDur-bDur*bDur-2*aDur*bDur*ageBmiCorr);
  const zDur=aDur*zAge+bDur*zBmi+Math.sqrt(residualVar)*zDur0;
  const duration_years=clamp(lognormalFromMeanSd(9.0,10.5,zDur),0,40);

  const zEgfr=-0.42*zAge+Math.sqrt(1-0.42**2)*zRenal;
  const egfr_ml_min_1_73m2=clamp(115.8+42.8*zEgfr,25,220);

  const zCpep=0.25*zBmi-0.35*zDur+Math.sqrt(1-0.25**2-0.35**2)*zBeta0;
  const fasting_c_peptide_nmol_l=clamp(lognormalFromMeanSd(0.476,0.281,zCpep),0.05,1.8);
  const beta_cell_reserve=clamp(fasting_c_peptide_nmol_l/(fasting_c_peptide_nmol_l+0.55),0.05,0.90);

  const si_relative=clamp(Math.exp(-0.24*zIR-0.018*(bmi_kg_m2-24.12)),0.35,1.45);
  const hepatic_ir=clamp(Math.exp(0.20*zHep+0.012*(bmi_kg_m2-24.12)),0.65,1.65);

  // Laboratory FPG is a phenotype observation, not the simulator's treated fasting equilibrium.
  const zFpg=0.08*zCpep+Math.sqrt(1-0.08**2)*zFpg0;
  const observed_fasting_glucose_mg_dl=clamp(60+lognormalFromMeanSd(110,66,zFpg),55,450);

  // CGM fasting equilibrium is calibrated separately to the observed morning CGM distribution.
  // Keep only a modest link to laboratory FPG to avoid double-counting treatment/state effects.
  const zObserved=(observed_fasting_glucose_mg_dl-168)/64;
  const zEq=0.35*zObserved+Math.sqrt(1-0.35**2)*zEq0;
  const dynamic_fasting_setpoint_mg_dl=clamp(147+28*zEq,75,260);

  return {
    phenotype:'T2DM',sex,
    height_cm:height_m*100,bmi_kg_m2,body_weight_kg,age_years,duration_years,
    egfr_ml_min_1_73m2,fasting_c_peptide_nmol_l,observed_fasting_glucose_mg_dl,
    si_relative,beta_cell_reserve,hepatic_ir,
    dynamic_fasting_setpoint_mg_dl,
    fasting_setpoint_mg_dl:dynamic_fasting_setpoint_mg_dl,
    endogenous_insulin:{
      glucose_threshold_mg_dl:100,
      halfmax_delta_mg_dl:70,
      max_effect_u_equiv_per_min:0.022*beta_cell_reserve,
      basal_effect_u_equiv_per_min:0.004*beta_cell_reserve
    }
  };
}
window.T2DMPatientPhenotypeV1ShanghaiExp={version:'0.3-shanghai-static-exp-2026-08-20',sample};
})();