(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function cyclicDt(t,inj){let d=(t-inj)%1440;if(d<0)d+=1440;return d;}
function gaussian(dt,peak,width){const z=(dt-peak)/width;return Math.exp(-0.5*z*z)}
function buildShape(peakMin,widthMin){
  const raw=[];for(let t=0;t<1440;t++)raw.push(gaussian(cyclicDt(t,1260),peakMin,widthMin));
  const m=raw.reduce((a,b)=>a+b,0)/raw.length, mx=Math.max(...raw), scale=Math.max(1e-9,mx-m);
  return raw.map(x=>(x-m)/scale);
}
const SHAPES={
  u100:buildShape(240,300),
  u300:buildShape(360,540)
};
function multiplier(formulation,t,amplitude){
  const f=String(formulation||'flat').toLowerCase();if(f==='flat')return 1;
  const sh=SHAPES[f];if(!sh)return 1;
  const a=clamp(Number(amplitude)||0,0,0.5),idx=Math.max(0,Math.min(1439,Math.round(t)%1440));
  return Math.max(0.5,1+a*sh[idx]);
}
function statePatch(formulation,amplitude){return{basal_profile_fn:({t})=>multiplier(formulation,t,amplitude),basal_profile_meta:{formulation,amplitude,injection_min:1260}}}
window.InsulinBasalTimeProfilePriorExp={
  version:'0.1-zero-area-glargine-time-shape-sensitivity-2026-08-20',
  statePatch,multiplier,
  sensitivity_amplitudes:[0.10,0.20,0.30],
  note:'Experimental shape-only sensitivity prior. 24 h mean multiplier is 1 by construction. Injection anchor 21:00 is a sensitivity scenario, not an assertion about every Emory patient. U100 is narrower/earlier; U300 broader/flatter. Amplitude is not fit to Emory and must remain sensitivity-only until independently identified.'
};
})();
