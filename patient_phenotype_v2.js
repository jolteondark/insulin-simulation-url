(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;const s=String(x);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=(Number(seed)||1)>>>0;return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}

// Experimental pilot only. Coefficients are intentionally conservative and must be externally calibrated.
function decorate(base){
  const p={...base};
  const r=rng(hash32(`${p.seed}:${p.candidate_id}:phenotype-v2`));
  const sex=r()<0.5?'female':'male';
  const heightMean=sex==='male'?173:160;
  // Only weakly tie stature to legacy size so adiposity is not identical to body size.
  const height=clamp(heightMean+5.5*(0.30*(p.z_size||0)+0.954*randn(r)),145,198);
  const bmi=p.body_weight_kg/Math.pow(height/100,2);
  const adiposity=clamp((bmi-23)/5,-1.5,3.0);
  // Legacy z_insulin_sensitivity already carries part of insulin sensitivity. Keep a distinct residual component.
  const intrinsicIR=clamp(-0.70*(p.z_insulin_sensitivity||0)+0.18*(p.z_insulin_need||0)+0.45*randn(r),-2.5,2.5);
  const ir=clamp(0.55*intrinsicIR+0.45*adiposity,-2.5,3.5);
  const sensitivityMultiplier=clamp(Math.exp(-0.16*ir),0.58,1.55);
  const obesityResidual=clamp(Math.exp(-0.07*adiposity),0.75,1.25);

  p.sex=sex;
  p.height_cm=height;
  p.bmi_kg_m2=bmi;
  p.obesity_class=bmi>=35?'class_II_plus':bmi>=30?'class_I':bmi>=25?'overweight':'non_overweight';
  p.adiposity_index=adiposity;
  p.intrinsic_insulin_resistance_index=intrinsicIR;
  p.insulin_resistance_index=ir;
  p.insulin_sensitivity_multiplier=sensitivityMultiplier;
  p.obesity_resistance_multiplier=obesityResidual;

  // Pilot phenotype outputs. Keep legacy fields available for paired comparison.
  p.v2_tdd_u_kg_day=clamp(p.tdd_u_kg_day/(sensitivityMultiplier*obesityResidual),0.20,1.60);
  p.v2_tdd_u_day=p.v2_tdd_u_kg_day*p.body_weight_kg;
  p.v2_basal_u_day=p.v2_tdd_u_day*p.basal_fraction_tdd;
  p.v2_icr_g_u=clamp(p.icr_g_u*sensitivityMultiplier*obesityResidual,2.5,35);
  p.v2_cf_mg_dl_u=clamp(p.cf_mg_dl_u*sensitivityMultiplier*obesityResidual,8,160);
  return p;
}
function toEnginePatient(decorated){
  const p={...decorated};
  p.legacy_tdd_u_kg_day=p.tdd_u_kg_day;
  p.legacy_tdd_u_day=p.tdd_u_day;
  p.legacy_basal_u_day=p.basal_u_day;
  p.legacy_icr_g_u=p.icr_g_u;
  p.legacy_cf_mg_dl_u=p.cf_mg_dl_u;
  p.tdd_u_kg_day=p.v2_tdd_u_kg_day;
  p.tdd_u_day=p.v2_tdd_u_day;
  p.basal_u_day=p.v2_basal_u_day;
  p.icr_g_u=p.v2_icr_g_u;
  p.cf_mg_dl_u=p.v2_cf_mg_dl_u;
  return p;
}
function sample(n,seed=7901,applyGate=false){
  if(!window.PatientGenerator)throw new Error('patient_generator.js must load before patient_phenotype_v2.js');
  return PatientGenerator.sampleCandidates(n,seed,applyGate).map(decorate);
}
function sampleForEngine(n,seed=7901,applyGate=false){return sample(n,seed,applyGate).map(toEnginePatient)}
window.PatientPhenotypeV2={decorate,toEnginePatient,sample,sampleForEngine,version:'0.2-obesity-ir-engine-pilot'};
})();
