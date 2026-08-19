(function(){
// Validation-only meal appearance model for v2/state-space-minimal.
// Not loaded by production pages.
// Separates meal appearance physiology from treatment ICR and adds only two externally-supported modifiers:
// 1) meal-size dependent early appearance saturation
// 2) modest fat-dependent delay

function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function gamma2(t50,h){
  const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;
  for(let i=0;i<h;i++){const t=i+.5,v=(t/(th*th))*Math.exp(-t/th);k[i]=v;s+=v;}
  for(let i=0;i<h;i++)k[i]/=s;
  return k;
}

const DEFAULTS={
  gain_mg_dl_per_g_70kg:5.5,
  weight_exponent:0.65,
  fast_t50_min:100,
  slow_t50_min:150,
  early_carb_cap_g:35,
  // UOM estimate: +10 g fat shifts roughly 5 mg/dL from +60 toward +180.
  // Keep deliberately modest; this is a timing modifier, not extra carbohydrate gain.
  fat_delay_per_10g:0.08,
  max_fat_delay_fraction:0.24,
  horizon_min:900
};

function mealGain(p,cfg=DEFAULTS){
  if(Number.isFinite(Number(p.carb_glucose_gain_mg_dl_per_g)))return clamp(Number(p.carb_glucose_gain_mg_dl_per_g),.2,10);
  const wt=clamp(Number(p.body_weight_kg)||70,40,130);
  return clamp(cfg.gain_mg_dl_per_g_70kg*Math.pow(70/wt,cfg.weight_exponent),1,10);
}

function appearanceComponents(carbG,fatG=0,cfg=DEFAULTS){
  const carb=Math.max(0,Number(carbG)||0),fat=Math.max(0,Number(fatG)||0);
  // Saturate only the early pool. Total carbohydrate is conserved.
  const early=Math.min(carb,cfg.early_carb_cap_g);
  let late=Math.max(0,carb-early);
  // Fat transfers a modest fraction of the early pool to the late pool.
  const fatShift=clamp((fat/10)*cfg.fat_delay_per_10g,0,cfg.max_fat_delay_fraction);
  const shifted=early*fatShift;
  return{early_g:early-shifted,late_g:late+shifted,fat_shift_fraction:fatShift,total_g:carb};
}

function mealAppearanceKernel(carbG,fatG=0,cfg=DEFAULTS){
  const h=Math.max(cfg.horizon_min,Math.ceil(cfg.slow_t50_min*5));
  const f=gamma2(cfg.fast_t50_min,h),s=gamma2(cfg.slow_t50_min,h),c=appearanceComponents(carbG,fatG,cfg);
  const k=new Float64Array(h);
  if(c.total_g<=0)return k;
  for(let i=0;i<h;i++)k[i]=(c.early_g*f[i]+c.late_g*s[i])/c.total_g;
  return k;
}

function appearanceFlux(p,carbG,fatG=0,cfg=DEFAULTS){
  const k=mealAppearanceKernel(carbG,fatG,cfg),gain=mealGain(p,cfg),out=new Float64Array(k.length);
  for(let i=0;i<k.length;i++)out[i]=gain*Number(carbG||0)*k[i];
  return out;
}

window.MealAppearanceValidationV2={
  version:'0.1-validation-only-size-saturation-fat-delay',
  DEFAULTS,mealGain,appearanceComponents,mealAppearanceKernel,appearanceFlux
};
})();
