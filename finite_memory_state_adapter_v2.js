(function(){
if(!window.GlucoseStateSpaceV2FiniteMemory)throw new Error('state_space_v2_finite_memory.js must load first');
const F=window.GlucoseStateSpaceV2FiniteMemory;
// Compatibility adapter for engine_v2.js. metabolic_state becomes the finite-memory innovation history.
// Indices 0..minutes-1 are numeric state values; index `minutes` carries the history into next_state.
function evolveMetabolicState(initial,minutes,seed,params={}){
  const h=Array.isArray(initial)?initial:null;
  const r=F.evolveMetabolicState(h,minutes,seed,params),out=Array(Number(minutes)+1);
  for(let i=0;i<Number(minutes);i++)out[i]=r.series[i];
  out[Number(minutes)]=r.end_history;
  return out;
}
window.GlucoseStateSpaceV2={
  DEFAULTS:F.DEFAULTS,
  createInitialState:F.createInitialState,
  evolveMetabolicState,
  modifiers:F.modifiers,
  theoreticalAutocorrelation:F.theoreticalAutocorrelation,
  version:'0.1-finite-memory-adapter'
};
})();
