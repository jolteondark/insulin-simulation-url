(function(){
'use strict';
const MAX_ATTEMPTS=256;
const STABILIZE_DAYS=3;
const NOMINAL_INTAKE={breakfast:1,lunch:1,dinner:1};
function candidateSeed(seed,attempt){return (Number(seed)+(attempt*0x9E3779B9))>>>0}
function stableReferenceRun(game,seed){const order={...game.case.previous_order_u};let state=null,last=null;for(let d=0;d<STABILIZE_DAYS;d++){last=T1DMGameModelV2.simulateDay(game.patient,order,{meal_plan_carb_g:game.case.meal_plan_carb_g,intake_fraction:NOMINAL_INTAKE,meal_timing_sd_min:15,bolus_timing_sd_min:15,poc_timing_sd_min:15},(seed+d*104729)>>>0,state);if(last.min<70||last.max>400)return null;state=last.next_state}return{state,last,order}}
function generatePlayablePatient(seed=1){for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){const s=candidateSeed(seed,attempt),game=T1DMGameModelV2.generatePatient(s),ref=stableReferenceRun(game,(s^0xA5A5A5A5)>>>0);if(!ref)continue;game.state=ref.state;game.case.previous_order_u={...ref.order};game.case.previous_day_4point_bg_mg_dl={...ref.last.bg};game.case.previous_day_end_glucose_mg_dl=ref.last.end;game.case.admission_gate={stable_reference_days:STABILIZE_DAYS,attempts:attempt+1};return{game,attempts:attempt+1,reference:ref.last}}throw new Error('No stable playable T1DM case found')}
window.T1DMGameAdmissionV2={version:'1.0-stable-reference-gate',STABILIZE_DAYS,MAX_ATTEMPTS,generatePlayablePatient};
})();