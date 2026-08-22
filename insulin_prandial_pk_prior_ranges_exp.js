(function(){
'use strict';
// Literature-constrained experimental priors. These are NOT fitted to Emory.
// The simulator uses gamma1 kernels whose tau/duration are phenomenological,
// so label PK/PD times define plausible ranges rather than exact mappings.
const PRIORS={
  regular:{
    implementation_anchor:{tau_min:90,duration_min:330},
    tau_range_min:[90,120],duration_range_min:[300,480],
    status:'Shanghai strict Basal+Regular anchor; do not retune from Emory',
    evidence:['Novolin R SC effect begins ~30 min, maximal 1.5–3.5 h, terminates ~8 h; concentration peak 1.5–2.5 h and returns near baseline ~5 h.']
  },
  aspart:{
    tau_range_min:[60,90],duration_range_min:[180,300],
    candidate:{tau_min:75,duration_min:300},
    status:'literature prior only',
    evidence:['NovoLog maximum glucose-lowering effect 1–3 h; duration 3–5 h.']
  },
  glulisine:{
    tau_range_min:[55,80],duration_range_min:[240,300],
    candidate:{tau_min:65,duration_min:270},
    status:'literature prior only; candidate chosen from label-constrained range, not Emory fit',
    evidence:['Apidra has more rapid onset and shorter duration than regular human insulin. Median concentration Tmax 60 vs 120 min in T1DM and 100 vs 240 min in T2DM.']
  },
  lyumjev:{
    tau_range_min:[55,85],duration_range_min:[276,438],
    candidate:null,
    status:'single-gamma kernel structurally inadequate; preserve as range until fast+tail kernel is implemented',
    evidence:['Lyumjev first measurable effect ~15–17 min, peak effect ~120–174 min, return to baseline ~4.6–7.3 h; plasma appearance ~1 min and concentration Tmax ~57 min.']
  }
};
function get(name){return PRIORS[String(name||'').toLowerCase()]||null}
window.InsulinPrandialPkPriorRangesExp={version:'0.1-literature-ranges-2026-08-20',PRIORS,get};
})();
