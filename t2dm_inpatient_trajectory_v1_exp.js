(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
// Sensitivity weights only. persistent_inflammatory is anchored near the observed
// Emory infection-admission fraction (~41%) but is NOT a prevalence estimate of
// all inpatient T2DM stress trajectories and must not be tuned to glucose outcomes.
const DEFAULT_WEIGHTS={persistent_inflammatory:.41,resolving_acute:.39,moderate_stable:.20};
const PROFILES={
 persistent_inflammatory:{initial_stress:.78,daily_decay:.045,floor:.32,admission_offset:120},
 resolving_acute:{initial_stress:.70,daily_decay:.105,floor:.00,admission_offset:120},
 moderate_stable:{initial_stress:.38,daily_decay:.035,floor:.15,admission_offset:75}
};
function choose(seed,weights=DEFAULT_WEIGHTS){const entries=Object.entries(weights),tot=entries.reduce((s,x)=>s+x[1],0),r=rng('t2traj:'+seed)();let x=r*tot;for(const [k,w] of entries){x-=w;if(x<=0)return k}return entries[entries.length-1][0]}
function patientScale(seed){const r=rng('t2traj-scale:'+seed)();return .90+.20*r}
function stressFor(profile,day,seed){const p=PROFILES[profile];if(!p)throw new Error('Unknown trajectory '+profile);const d=Math.max(1,Math.round(day));return clamp(Math.max(p.floor,p.initial_stress-(d-1)*p.daily_decay)*patientScale(seed),0,1)}
function admissionOffset(profile,seed){const p=PROFILES[profile];if(!p)throw new Error('Unknown trajectory '+profile);const r=rng('t2traj-adm:'+seed)();return p.admission_offset*(.90+.20*r)}
function statePatch(profile,day,seed){return{stress_severity:stressFor(profile,day,seed),admission_glucose_offset_mg_dl:day===1?admissionOffset(profile,seed):0,trajectory_class:profile};}
function stateModifier(profile,seed){return({day})=>statePatch(profile,day,seed)}
window.T2DMInpatientTrajectoryV1Exp={version:'0.1-three-class-time-structure-exp-2026-08-20',DEFAULT_WEIGHTS,PROFILES,choose,stressFor,admissionOffset,statePatch,stateModifier,note:'Experimental inpatient time-structure layer. No generic glucose noise, steroid or renal modifier. Default weights are sensitivity anchors only and must not be fit to glucose outcomes.'};
})();
