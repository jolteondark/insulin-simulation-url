(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function sample(seed=1){
  const zSize=randn('t2-size:'+seed),zIR=randn('t2-ir:'+seed),zBeta=randn('t2-beta:'+seed),zHep=randn('t2-hep:'+seed),zDur=randn('t2-dur:'+seed);
  const sex=(hash32('t2-sex:'+seed)&1)?'M':'F';
  const height_cm=clamp((sex==='M'?171:158)+7*zSize,145,190);
  const bmi_kg_m2=clamp(26.5+4.8*(.55*zSize+.75*zIR),18,42);
  const body_weight_kg=bmi_kg_m2*(height_cm/100)**2;
  const age_years=Math.round(clamp(62+11*randn('t2-age:'+seed),30,85));
  const duration_years=Math.round(clamp(9+7*(.35*zDur+.15*zBeta),0,35));
  const si_relative=clamp(Math.exp(-.42*zIR-.018*(bmi_kg_m2-25)),.28,1.35);
  const beta_cell_reserve=clamp(1/(1+Math.exp(-(.15-.85*zBeta-.055*duration_years))),.05,.95);
  const hepatic_ir=clamp(Math.exp(.28*zHep+.018*(bmi_kg_m2-25)),.65,1.8);
  const fasting_setpoint_mg_dl=clamp(105+38*(1-beta_cell_reserve)+24*(hepatic_ir-1)+8*randn('t2-fpg:'+seed),90,230);
  return {
    phenotype:'T2DM',sex,height_cm,bmi_kg_m2,body_weight_kg,age_years,duration_years,
    si_relative,beta_cell_reserve,hepatic_ir,fasting_setpoint_mg_dl,
    endogenous_insulin:{
      glucose_threshold_mg_dl:100,
      halfmax_delta_mg_dl:70,
      max_effect_u_equiv_per_min:0.022*beta_cell_reserve,
      basal_effect_u_equiv_per_min:0.004*beta_cell_reserve
    }
  };
}
window.T2DMPatientPhenotypeV0={version:'0.1-minimal-2026-08-20',sample};
})();