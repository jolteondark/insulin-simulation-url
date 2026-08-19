(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Experimental clinical-parameter layer for T1DM v2.
// Coefficients are literature-anchored pilots and must be externally validated before merge.

function renalModifier(egfr){
  const e=Math.max(1,Number(egfr)||90);
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

// Preserve each patient's baseline total prandial insulin requirement and use the
// literature-supported breakfast:lunch:dinner ICR ratio (about 300:400:400) only
// to redistribute dose by meal. For the default 50/70/60 g plan this gives factors
// ~0.819/1.093/1.093 relative to the patient's baseline ICR, with unchanged total bolus.
function mealICRFromBaseline(baseIcr,mealPlan={breakfast:50,lunch:70,dinner:60}){
  const b=clamp(Number(baseIcr)||10,2.5,35);
  const cB=Math.max(0,Number(mealPlan.breakfast)||0),cL=Math.max(0,Number(mealPlan.lunch)||0),cD=Math.max(0,Number(mealPlan.dinner)||0);
  const ratio={breakfast:.75,lunch:1,dinner:1};
  const total=cB+cL+cD;
  const k=total>0?(cB/ratio.breakfast+cL/ratio.lunch+cD/ratio.dinner)/total:1;
  return{
    breakfast:clamp(b*k*ratio.breakfast,2.5,35),
    lunch:clamp(b*k*ratio.lunch,2.5,35),
    dinner:clamp(b*k*ratio.dinner,2.5,35)
  };
}

// Retained for explicit literature-comparison only; not used as the default dosing rule.
function mealICRFromTDD(tdd){
  const d=Math.max(8,Number(tdd)||40);
  return{breakfast:clamp(300/d,2.5,35),lunch:clamp(400/d,2.5,35),dinner:clamp(400/d,2.5,35)};
}

function circadianNeed(minute,p={}){
  const m=((Number(minute)%1440)+1440)%1440;
  const dawnAmp=Number(p.dawn_amplitude_fraction??0.12);
  const eveAmp=Number(p.evening_resistance_fraction??0.04);
  const gauss=(x,mu,sd)=>Math.exp(-0.5*Math.pow((x-mu)/sd,2));
  const raw=1+dawnAmp*gauss(m,360,120)+eveAmp*gauss(m,1200,150);
  // Approximate 24 h mean normalization so circadian shape redistributes requirement
  // rather than silently increasing total daily basal need.
  const meanApprox=1+dawnAmp*Math.sqrt(2*Math.PI)*120/1440+eveAmp*Math.sqrt(2*Math.PI)*150/1440;
  return raw/meanApprox;
}

function decorateClinical(p,opts={}){
  const q={...p};
  q.age_years=Number(opts.age_years??q.age_years??35);
  q.egfr_ml_min_1_73m2=Number(opts.egfr_ml_min_1_73m2??q.egfr_ml_min_1_73m2??90);
  const baselineIcr=Number(q.v2_icr_g_u??q.icr_g_u);
  q.icr_g_u_by_meal=mealICRFromBaseline(baselineIcr,opts.meal_plan_carb_g);
  q.renal_modifier=renalModifier(q.egfr_ml_min_1_73m2);
  q.dawn_amplitude_fraction=Number(opts.dawn_amplitude_fraction??0.12);
  q.evening_resistance_fraction=Number(opts.evening_resistance_fraction??0.04);
  return q;
}

window.ClinicalModifiersV2={renalModifier,mealICRFromBaseline,mealICRFromTDD,circadianNeed,decorateClinical,version:'0.2-mean-preserving-clinical-pilot'};
})();
