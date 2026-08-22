(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULTS={
  tau_min:120,
  stationary_sd:1.0,
  basal_requirement_coupling:0.28,
  fast_scale:0.74,
  setpoint_shift_mg_dl:15
};
function rng(seed){let a=(Number(seed)||1)>>>0;return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function createInitialState(glucoseMgDl,metabolicState=0){return{glucose_mg_dl:Number(glucoseMgDl),metabolic_state:Number(metabolicState)||0}}
function evolveMetabolicState(initial,minutes,seed,params={}){
  const cfg={...DEFAULTS,...params},r=rng(seed),rho=Math.exp(-1/Math.max(1,cfg.tau_min)),q=cfg.stationary_sd*Math.sqrt(Math.max(0,1-rho*rho));
  const y=new Float64Array(Number(minutes)+1);y[0]=Number(initial)||0;
  for(let t=0;t<minutes;t++)y[t+1]=rho*y[t]+q*randn(r);
  return y;
}
function modifiers(m,params={}){
  const cfg={...DEFAULTS,...params},z=Number(m)||0;
  return{
    basal_requirement_multiplier:clamp(Math.exp(cfg.basal_requirement_coupling*z),0.55,1.80),
    fast_scale:clamp(cfg.fast_scale,0.45,1.0),
    setpoint_shift_mg_dl:Number(cfg.setpoint_shift_mg_dl)||0
  };
}
window.GlucoseStateSpaceV2={DEFAULTS,createInitialState,evolveMetabolicState,modifiers,version:'0.2-requirement-state'};
})();
