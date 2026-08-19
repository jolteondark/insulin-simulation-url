(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Experimental clinical-parameter layer for T1DM v2.
// Coefficients are literature-anchored pilots and must be externally validated before merge.

function renalModifier(egfr){
  const e=Math.max(1,Number(egfr)||90);
  // Conservative pilot: no effect above 60, progressively prolonged effective insulin action below 60.
  // Severe CKD effect is intentionally capped pending T1DM-specific calibration.
  let clearance=1;
  if(e<60&&e>=30) clearance=0.92;
  else if(e<30&&e>=15) clearance=0.82;
  else if(e<15) clearance=0.72;
  return{
    insulin_clearance_multiplier:clearance,
    insulin_action_duration_multiplier:1/clearance,
    hypoglycemia_risk_multiplier:clamp(1+(1-clearance)*1.5,1,1.5)
  };
}

function mealICRFromTDD(tdd){
  const d=Math.max(8,Number(tdd)||40);
  return{
    breakfast:clamp(300/d,2.5,35),
    lunch:clamp(400/d,2.5,35),
    dinner:clamp(400/d,2.5,35)
  };
}

function circadianNeed(minute,p={}){
  const m=((Number(minute)%1440)+1440)%1440;
  const dawnAmp=Number(p.dawn_amplitude_fraction??0.12);
  const eveAmp=Number(p.evening_resistance_fraction??0.04);
  // Smooth dawn bump centered ~06:00, width ~2 h; small evening resistance bump centered ~20:00.
  const gauss=(x,mu,sd)=>Math.exp(-0.5*Math.pow((x-mu)/sd,2));
  const dawn=dawnAmp*gauss(m,360,120);
  const eve=eveAmp*gauss(m,1200,150);
  return 1+dawn+eve;
}

function decorateClinical(p,opts={}){
  const q={...p};
  q.age_years=Number(opts.age_years??q.age_years??35);
  q.egfr_ml_min_1_73m2=Number(opts.egfr_ml_min_1_73m2??q.egfr_ml_min_1_73m2??90);
  const tdd=Number(q.v2_tdd_u_day??q.tdd_u_day);
  q.icr_g_u_by_meal=mealICRFromTDD(tdd);
  q.renal_modifier=renalModifier(q.egfr_ml_min_1_73m2);
  q.dawn_amplitude_fraction=Number(opts.dawn_amplitude_fraction??0.12);
  q.evening_resistance_fraction=Number(opts.evening_resistance_fraction??0.04);
  return q;
}

window.ClinicalModifiersV2={renalModifier,mealICRFromTDD,circadianNeed,decorateClinical,version:'0.1-clinical-pilot'};
})();
