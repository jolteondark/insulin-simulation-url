(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function shiftedLognormal(mean,sd,shift,z){
 const m=mean-shift;
 const s2=Math.log(1+(sd*sd)/(m*m)),s=Math.sqrt(s2),mu=Math.log(m)-.5*s2;
 return shift+Math.exp(mu+s*z);
}
function sample(seed=1){
 if(!window.T2DMPatientPhenotypeV1ShanghaiExp)throw new Error('T2DMPatientPhenotypeV1ShanghaiExp must load first');
 const p={...T2DMPatientPhenotypeV1ShanghaiExp.sample(seed)};
 const zEq=randn('t2v2-shanghai106-eq:'+seed);
 // Shanghai all-session meal-relative breakfast CGM target:
 // mean 131.90, SD 35.53, median 127.8, p05 84.6, p95 199.0,
 // TBR<70 1.06%, TAR>180 10.18%.
 // A Gaussian with the same mean/SD creates ~4% <70 and is therefore rejected.
 // shift=5.844 mg/dL gives a shifted-lognormal matching mean/SD/TBR and closely
 // reproducing the observed quantiles (model approx p05 82.8, median 127.2,
 // p95 197.1; TAR>180 ~9.6%).
 const equilibrium=shiftedLognormal(131.9033628318584,35.53454047921964,5.84443263,zEq);
 p.dynamic_fasting_setpoint_mg_dl=clamp(equilibrium,55,260);
 p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
 p.model_note='Shanghai106 shifted-lognormal dynamic-equilibrium experiment; laboratory FPG unchanged';
 return p;
}
window.T2DMPatientPhenotypeV2Shanghai106Exp={version:'0.2-shanghai106-shifted-lognormal-eq-exp-2026-08-20',sample};
})();