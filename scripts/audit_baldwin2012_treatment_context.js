#!/usr/bin/env node
'use strict';
// Treatment-context identifiability audit for Baldwin et al. Diabetes Care 2012;35:1970-1974.
// Uses published baseline weight and administered insulin only. No glucose outcome enters any calculation.
const groups={
  high:{label:'0.50 U/kg',weight_kg:89.4,start_ukg:.50,day1_total_u:33.4,day1_basal_u:21.4},
  low:{label:'0.25 U/kg',weight_kg:93.9,start_ukg:.25,day1_total_u:21.1,day1_basal_u:13.1}
};
const rows=[];
for(const [name,g] of Object.entries(groups)){
  const nominalTdd=g.start_ukg*g.weight_kg;
  const nominalBasal=.5*nominalTdd;
  const nominalPrandial=.5*nominalTdd;
  const observedNonbasal=g.day1_total_u-g.day1_basal_u;
  rows.push({
    name,label:g.label,weight_kg:g.weight_kg,
    nominal_tdd_u:nominalTdd,observed_day1_total_u:g.day1_total_u,observed_total_over_nominal:g.day1_total_u/nominalTdd,
    nominal_basal_u:nominalBasal,observed_day1_basal_u:g.day1_basal_u,observed_basal_over_nominal:g.day1_basal_u/nominalBasal,
    nominal_prandial_u:nominalPrandial,observed_day1_nonbasal_u:observedNonbasal,
    observed_nonbasal_over_nominal_prandial:observedNonbasal/nominalPrandial,
    note:'Observed non-basal includes correction insulin, so this ratio is an upper bound on the fraction of nominal scheduled prandial insulin actually delivered.'
  });
}
const out={
  purpose:'Determine whether nominal protocol dosing uniquely identifies actual insulin exposure before using Baldwin 2012 to validate renal physiology.',
  source:'Baldwin et al. Diabetes Care 2012;35:1970-1974, main article + Supplementary Data.',
  rows,
  decision:'Treatment exposure is not identified by nominal 0.50/0.25 U/kg assignment alone. Day-1 basal delivery is close to nominal, whereas observed non-basal insulin is far below nominal prandial allocation despite including positive correction doses. Unreported/aggregate meal intake and prandial withholding therefore materially determine exposure. Do not use the protocol-only simulation as a pass/fail test of the renal insulin-exposure multiplier magnitude.'
};
const fs=require('fs'),dir='analysis/baldwin2012_renal_rct_external';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/treatment_context.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
