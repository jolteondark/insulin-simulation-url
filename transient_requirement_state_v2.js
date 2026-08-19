(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULTS={memory_min:180,effect_half_life_min:45,stationary_sd:1.0,effect_gain_mg_dl:25,fast_scale:0.74,setpoint_shift_mg_dl:15};
function rng(seed){let a=(Number(seed)||1)>>>0;return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function createInitialState(glucoseMgDl,history=null,effect=0,params={}){const cfg={...DEFAULTS,...params},w=Math.max(30,Math.round(cfg.memory_min)),h=Array.isArray(history)?history.slice(-w):[];while(h.length<w)h.unshift(0);return{glucose_mg_dl:Number(glucoseMgDl),metabolic_history:h,metabolic_effect_mg_dl:Number(effect)||0}}
function evolve(initialHistory,initialEffect,minutes,seed,params={}){
 const cfg={...DEFAULTS,...params},w=Math.max(30,Math.round(cfg.memory_min)),r=rng(seed),h=Array.isArray(initialHistory)?initialHistory.slice(-w):[];while(h.length<w)h.unshift(0);
 let sum=0;for(const v of h)sum+=Number(v)||0;const scale=cfg.stationary_sd*Math.sqrt(w),rho=Math.exp(-Math.log(2)/Math.max(1,cfg.effect_half_life_min));
 const m=new Float64Array(minutes+1),x=new Float64Array(minutes+1);m[0]=sum/scale;x[0]=Number(initialEffect)||0;
 for(let t=0;t<minutes;t++){const incoming=randn(r),outgoing=Number(h.shift())||0;h.push(incoming);sum+=incoming-outgoing;m[t+1]=sum/scale;x[t+1]=rho*x[t]+(1-rho)*cfg.effect_gain_mg_dl*m[t];}
 return{metabolic_series:m,effect_series:x,end_history:h,end_effect:x[minutes]};
}
function theoreticalStateAutocorrelation(lagMin,params={}){const cfg={...DEFAULTS,...params},w=Math.max(1,Number(cfg.memory_min)),l=Math.abs(Number(lagMin)||0);return Math.max(0,1-l/w)}
window.TransientRequirementStateV2={DEFAULTS,createInitialState,evolve,theoreticalStateAutocorrelation,version:'0.1-finite-memory-transient-effect'};
})();
