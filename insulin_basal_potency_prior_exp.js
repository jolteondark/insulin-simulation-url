(function(){
'use strict';
// Unit-consistency prior for basal-dose deviations.
// The frozen base model implicitly absorbs the maintenance basal requirement into
// the fasting equilibrium, so this module only governs the effect of a dose
// deviation from that maintenance reference. It is NOT an absolute basal model.
//
// A unit of insulin should not lose ~two orders of magnitude of integrated
// glucose-lowering potency merely because it is delivered as basal insulin.
// Therefore the default 24 h delta gain is derived from the simulator's own
// area-normalized prandial 1 U effect, not fitted to any external glucose cohort.
function gamma1(dt,tau){return (dt/tau)*Math.exp(1-dt/tau)}
function kernelArea(tau,duration){let a=0;for(let dt=0;dt<duration;dt++)a+=gamma1(dt,tau);return a}
function unitConsistentDailyGain(baseModel,relativePotency=1){
 if(!baseModel||!baseModel.SCALE||!baseModel.KERNEL)throw new Error('base model with SCALE and KERNEL required');
 const K=baseModel.KERNEL,S=baseModel.SCALE;
 const prandialIntegratedPerUnit=S.bolus_gain*kernelArea(K.bolus_tau_min,K.bolus_duration_min);
 return prandialIntegratedPerUnit*Math.max(0,Number(relativePotency)||0);
}
function statePatch(baseModel,relativePotency=1){return{basal_delta_gain_per_day:unitConsistentDailyGain(baseModel,relativePotency)}}
window.InsulinBasalPotencyPriorExp={
 version:'0.1-unit-consistent-delta-potency-2026-08-20',
 unitConsistentDailyGain,statePatch,
 note:'Experimental basal-dose-deviation potency prior. Derived from the simulator prandial 1-U integrated effect; not fitted to Emory or Shanghai. Existing behavior is unchanged unless basal_delta_gain_per_day is explicitly supplied.'
};
})();
