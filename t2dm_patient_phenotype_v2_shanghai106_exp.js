(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function sample(seed=1){
 if(!window.T2DMPatientPhenotypeV1ShanghaiExp)throw new Error('T2DMPatientPhenotypeV1ShanghaiExp must load first');
 const p={...T2DMPatientPhenotypeV1ShanghaiExp.sample(seed)};
 const zEq=randn('t2v2-shanghai106-eq:'+seed);
 // Full mirror snapshot meal-relative breakfast target: 131.9 ± 35.5 mg/dL.
 // Keep this dynamic equilibrium separate from laboratory FPG.
 p.dynamic_fasting_setpoint_mg_dl=clamp(131.9+35.5*zEq,55,260);
 p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
 p.model_note='Shanghai106 dynamic-equilibrium experiment; laboratory FPG unchanged';
 return p;
}
window.T2DMPatientPhenotypeV2Shanghai106Exp={version:'0.1-shanghai106-eq-exp-2026-08-20',sample};
})();