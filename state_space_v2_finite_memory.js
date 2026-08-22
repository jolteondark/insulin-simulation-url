(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULTS={
  memory_min:180,
  stationary_sd:1.0,
  basal_requirement_coupling:0.28,
  fast_scale:0.74,
  setpoint_shift_mg_dl:15
};
function rng(seed){let a=(Number(seed)||1)>>>0;return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function createInitialState(glucoseMgDl,history=null,params={}){
  const cfg={...DEFAULTS,...params},w=Math.max(30,Math.round(cfg.memory_min));
  const h=Array.isArray(history)?history.slice(-w):[];
  while(h.length<w)h.unshift(0);
  return{glucose_mg_dl:Number(glucoseMgDl),metabolic_history:h};
}
function evolveMetabolicState(initialHistory,minutes,seed,params={}){
  const cfg={...DEFAULTS,...params},w=Math.max(30,Math.round(cfg.memory_min)),r=rng(seed),history=Array.isArray(initialHistory)?initialHistory.slice(-w):[];
  while(history.length<w)history.unshift(0);
  let sum=0;for(const x of history)sum+=Number(x)||0;
  const scale=cfg.stationary_sd*Math.sqrt(w);
  const y=new Float64Array(Number(minutes)+1);y[0]=sum/scale;
  for(let t=0;t<minutes;t++){
    const incoming=randn(r),outgoing=Number(history.shift())||0;
    history.push(incoming);sum+=incoming-outgoing;
    y[t+1]=sum/scale;
  }
  return{series:y,end_history:history};
}
function modifiers(m,params={}){
  const cfg={...DEFAULTS,...params},z=Number(m)||0;
  return{
    basal_requirement_multiplier:clamp(Math.exp(cfg.basal_requirement_coupling*z),0.55,1.80),
    fast_scale:clamp(cfg.fast_scale,0.45,1.0),
    setpoint_shift_mg_dl:Number(cfg.setpoint_shift_mg_dl)||0
  };
}
function theoreticalAutocorrelation(lagMin,params={}){
  const cfg={...DEFAULTS,...params},w=Math.max(1,Number(cfg.memory_min));
  const l=Math.abs(Number(lagMin)||0);return Math.max(0,1-l/w);
}
window.GlucoseStateSpaceV2FiniteMemory={DEFAULTS,createInitialState,evolveMetabolicState,modifiers,theoreticalAutocorrelation,version:'0.1-finite-memory-requirement'};
})();
