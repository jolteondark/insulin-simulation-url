(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const clone=p=>JSON.parse(JSON.stringify(p));
const DEFAULT_STATE={
 acute_stress:false,
 stress_severity:0,
 steroid:false,
 steroid_severity:0,
 npo:false,
 intake_fraction:{breakfast:1,lunch:1,dinner:1}
};
function applyState(patient,state={}){
 const s={...DEFAULT_STATE,...state,intake_fraction:{...DEFAULT_STATE.intake_fraction,...(state.intake_fraction||{})}};
 const p=clone(patient);
 // Mechanistic state effects only. No generic Gaussian glucose noise.
 // Severity is dimensionless 0..1 and intentionally left as an experimental knob.
 const stress=clamp(Number(s.stress_severity)||0,0,1);
 const steroid=clamp(Number(s.steroid_severity)||0,0,1);
 if(s.acute_stress&&stress>0){
   p.si_relative=clamp(p.si_relative*(1-0.35*stress),0.20,1.45);
   p.hepatic_ir=clamp(p.hepatic_ir*(1+0.35*stress),0.65,2.20);
   const eq=Number(p.dynamic_fasting_setpoint_mg_dl??p.fasting_setpoint_mg_dl);
   p.dynamic_fasting_setpoint_mg_dl=clamp(eq+45*stress,55,340);
   p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
 }
 if(s.steroid&&steroid>0){
   // Current core has no time-varying SI yet; represent the day-average component only.
   // A later formulation may make this explicitly afternoon/evening weighted.
   p.si_relative=clamp(p.si_relative*(1-0.25*steroid),0.20,1.45);
   p.hepatic_ir=clamp(p.hepatic_ir*(1+0.20*steroid),0.65,2.20);
 }
 const ctx={intake_fraction:{...s.intake_fraction}};
 if(s.npo)ctx.intake_fraction={breakfast:0,lunch:0,dinner:0};
 return{patient:p,ctx,state:s};
}
function simulateDay(baseModel,patient,order,state={},seed=1,prevState=null){
 if(!baseModel||typeof baseModel.simulateDay!=='function')throw new Error('base model required');
 const a=applyState(patient,state);
 return{...baseModel.simulateDay(a.patient,order,a.ctx,seed,prevState),inpatient_state:a.state,state_adjusted_patient:a.patient};
}
window.T2DMInpatientStateV1Exp={version:'0.1-mechanistic-state-wrapper-2026-08-20',DEFAULT_STATE,applyState,simulateDay};
})();
