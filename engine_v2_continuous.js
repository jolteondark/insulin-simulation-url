(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function gamma2(t50,h){const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){const t=i+.5,v=(t/(th*th))*Math.exp(-t/th);k[i]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function mealKernel(p){const h=Math.floor(Math.max(720,p.meal_t50_slow_min*5)),f=gamma2(p.meal_t50_fast_min,h),s=gamma2(p.meal_t50_slow_min,h),q=p.meal_fast_fraction,k=new Float64Array(h);for(let i=0;i<h;i++)k[i]=q*f[i]+(1-q)*s[i];return k}
function conv(n,events,k){const y=new Float64Array(n);for(const [rawT,a] of events){const t=Math.trunc(rawT),ks=Math.max(0,-t),ys=Math.max(0,t),m=Math.min(k.length-ks,n-ys);for(let j=0;j<m;j++)y[ys+j]+=Number(a)*k[ks+j]}return y}
function shiftedGammaTaper(onset,peak,duration,h=1200,shape=3,timeScale=1){const sc=Math.max(.6,Number(timeScale)||1),on=onset*sc,pk=peak*sc,dur=duration*sc,sh=Math.max(shape,1.05),theta=Math.max((pk-on)/(sh-1),1),k=new Float64Array(h);let sum=0;const taperStart=Math.max(pk,.80*dur);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-on,0);let v=x>0?Math.pow(x,sh-1)*Math.exp(-x/theta):0;let taper=1;if(t>taperStart&&t<dur)taper=.5*(1+Math.cos(Math.PI*(t-taperStart)/(dur-taperStart)));if(t>=dur)taper=0;v*=taper;k[i]=v;sum+=v}if(sum<=0)throw new Error('invalid insulin profile');for(let i=0;i<h;i++)k[i]/=sum;return k}
function rapidKernel(name='aspart',h=1200,timeScale=1){const n=String(name).toLowerCase().replaceAll(' ','_');if(['lyumjev','lispro-aabc','insulin_lispro-aabc'].includes(n))return shiftedGammaTaper(5,95,276,h,3,timeScale);return shiftedGammaTaper(15,105,300,h,3,timeScale)}
function basalKernel(h=1800){const k=new Float64Array(h);let s=0;for(let t=0;t<h;t++){let v=0;if(t>=60&&t<180)v=(t-60)/120;else if(t>=180&&t<1260)v=1;else if(t>=1260&&t<1500)v=1-(t-1260)/240;k[t]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}
function unitResponseAt(p,kernel,minutes=240){const u=new Float64Array(minutes+1);for(let i=0;i<Math.min(kernel.length,u.length);i++)u[i]=kernel[i];const kh=restoreK(p);let d=0;for(let t=0;t<minutes;t++)d+=(-u[t]-kh*d);return Math.max(1e-6,-d)}
function insulinGain(p,refKernel){return p.cf_mg_dl_u/unitResponseAt(p,refKernel||rapidKernel('aspart'),240)}
function simulateContinuous(p,ctx,rapidOrder,basalOrder,days,seed,stateParams={}){
 if(!window.GlucoseStateSpaceV2)throw new Error('state adapter must load first');
 const total=Number(days)*1440,n=total+1,mealPlan=ctx.meal_plan_carb_g||{breakfast:50,lunch:70,dinner:60},intake=ctx.intake_fraction||{breakfast:1,lunch:1,dinner:1};
 const mealEvents=[],bolusEvents=[],basalTargetEvents=[],basalActualEvents=[];
 const physiologicBasal=Number(p.legacy_basal_u_day??p.basal_u_day),actualBasal=Number(basalOrder);
 for(let d=-1;d<days;d++){
   const z=d*1440;
   mealEvents.push([z+480,mealPlan.breakfast*intake.breakfast],[z+780,mealPlan.lunch*intake.lunch],[z+1140,mealPlan.dinner*intake.dinner]);
   bolusEvents.push([z+465,rapidOrder.breakfast_u],[z+765,rapidOrder.lunch_u],[z+1125,rapidOrder.dinner_u]);
   basalTargetEvents.push([z-120,physiologicBasal]);
   basalActualEvents.push([z-120,actualBasal]);
 }
 const renal=p.renal_modifier||(window.ClinicalModifiersV2?ClinicalModifiersV2.renalModifier(p.egfr_ml_min_1_73m2??90):{insulin_action_duration_multiplier:1});
 const rk=rapidKernel(ctx.rapid_formulation||'aspart',1200,renal.insulin_action_duration_multiplier||1),bk=basalKernel(),mk=mealKernel(p);
 const meal=conv(n,mealEvents,mk),bol=conv(n,bolusEvents,rk),targetBasal=conv(n,basalTargetEvents,bk),actualBasalAct=conv(n,basalActualEvents,bk);
 const ig=insulinGain(p,rapidKernel('aspart',1200,renal.insulin_action_duration_multiplier||1)),cg=ig/p.icr_g_u,kh=restoreK(p),cfg={...GlucoseStateSpaceV2.DEFAULTS,...stateParams};
 const targetSetpoint=Number(p.fasting_setpoint_mg_dl)+Number(cfg.setpoint_shift_mg_dl||0),M=GlucoseStateSpaceV2.evolveMetabolicState([],total,seed??1,cfg),g=new Float64Array(n);g[0]=targetSetpoint;
 for(let t=0;t<total;t++){
   const sm=GlucoseStateSpaceV2.modifiers(M[t],cfg),obesityAction=Number(p.incremental_obesity_insulin_action_multiplier??1);
   const circ=stateParams.circadian_off?1:(window.ClinicalModifiersV2?ClinicalModifiersV2.circadianNeed(t%1440,p):1);
   const restore=-kh*(g[t]-targetSetpoint),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t]));
   const basalPhys=ig*sm.basal_requirement_multiplier*circ*targetBasal[t]-ig*obesityAction*actualBasalAct[t];
   const fast=sm.fast_scale*(cg*meal[t]-ig*obesityAction*bol[t]);
   g[t+1]=g[t]+fast+basalPhys+restore+counter;
 }
 return{series:g,metabolic_series:M};
}
window.GlucoseEngineV2Continuous={simulate:simulateContinuous,version:'0.1-10080min-continuous-kernels'};
})();
