(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const POC={pre_breakfast:420,pre_lunch:720,pre_dinner:1080,bedtime:1260};
const MEAL_TIMES=[480,780,1140];
const RAPID_TIMES=[465,765,1125];
function gamma2(t50,h){const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){const t=i+.5,v=(t/(th*th))*Math.exp(-t/th);k[i]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function mealKernel(p){const h=Math.floor(Math.max(720,p.meal_t50_slow_min*5)),f=gamma2(p.meal_t50_fast_min,h),s=gamma2(p.meal_t50_slow_min,h),q=p.meal_fast_fraction,k=new Float64Array(h);for(let i=0;i<h;i++)k[i]=q*f[i]+(1-q)*s[i];return k}
function conv(n,events,k){const y=new Float64Array(n);for(const [rawT,a] of events){const t=Math.trunc(rawT),ks=Math.max(0,-t),ys=Math.max(0,t),m=Math.min(k.length-ks,n-ys);for(let j=0;j<m;j++)y[ys+j]+=Number(a)*k[ks+j]}return y}
function shiftedGammaTaper(onset,peak,duration,h=1200,shape=3,timeScale=1){const sc=Math.max(.6,Number(timeScale)||1),on=onset*sc,pk=peak*sc,dur=duration*sc,sh=Math.max(shape,1.05),theta=Math.max((pk-on)/(sh-1),1),k=new Float64Array(h);let sum=0;const taperStart=Math.max(pk,.80*dur);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-on,0);let v=x>0?Math.pow(x,sh-1)*Math.exp(-x/theta):0;let taper=1;if(t>taperStart&&t<dur)taper=.5*(1+Math.cos(Math.PI*(t-taperStart)/(dur-taperStart)));if(t>=dur)taper=0;v*=taper;k[i]=v;sum+=v}if(sum<=0)throw new Error('invalid insulin profile');for(let i=0;i<h;i++)k[i]/=sum;return k}
function regularKernel(h=1200,timeScale=1){const sc=Math.max(.6,Number(timeScale)||1),core=shiftedGammaTaper(30,180,300,h,3,sc),tail=new Float64Array(h);let ts=0;const a=300*sc,b=480*sc;for(let i=0;i<h;i++){const t=i+.5;if(t>=a&&t<b){tail[i]=(b-t)/(b-a);ts+=tail[i]}}if(ts>0)for(let i=0;i<h;i++)tail[i]/=ts;const k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){k[i]=.96*core[i]+.04*tail[i];s+=k[i]}for(let i=0;i<h;i++)k[i]/=s;return k}
function rapidKernel(name='aspart',h=1200,timeScale=1){const n=String(name).toLowerCase().replaceAll(' ','_');if(['regular','humulin','humulin_r','human_regular','insulin_human'].includes(n))return regularKernel(h,timeScale);if(['lyumjev','lispro-aabc','insulin_lispro-aabc'].includes(n))return shiftedGammaTaper(5,95,276,h,3,timeScale);if(['aspart','novolog','novorapid','insulin_aspart'].includes(n))return shiftedGammaTaper(15,105,300,h,3,timeScale);throw new Error('unknown rapid formulation: '+name)}
function basalKernel(name='glargine',h=1800){const n=String(name).toLowerCase().replaceAll(' ','_');if(!['glargine','lantus','insulin_glargine','glargine_u100'].includes(n))throw new Error('unsupported basal formulation: '+name);const k=new Float64Array(h);let s=0;for(let t=0;t<h;t++){let v=0;if(t>=60&&t<180)v=(t-60)/120;else if(t>=180&&t<1260)v=1;else if(t>=1260&&t<1500)v=1-(t-1260)/240;k[t]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}
function unitResponseAt(p,kernel,minutes=240){const u=new Float64Array(minutes+1);for(let i=0;i<Math.min(kernel.length,u.length);i++)u[i]=kernel[i];const kh=restoreK(p);let d=0;for(let t=0;t<minutes;t++)d+=(-u[t]-kh*d);return Math.max(1e-6,-d)}
// Primitive patient-fixed insulin action axis in the current engine.
// This is the amount of glucose-lowering drive produced per unit of normalized insulin activity.
// For backward compatibility it is reconstructed from the legacy clinical CF using the 240-min 1U response.
// Future generator versions should generate this quantity first and derive CF from a virtual correction test.
function intrinsicInsulinSensitivity(p,refKernel){return p.cf_mg_dl_u/unitResponseAt(p,refKernel||rapidKernel('aspart'),240)}
function infectionSensitivity(severity){const s=clamp(Number(severity)||0,0,1);return 1-.50*Math.pow(s,1.25)}
function infectionHepaticDrive(severity){const s=clamp(Number(severity)||0,0,1);return .020*Math.pow(s,1.4)}
function steroidShape(minute){const a=[[0,.05],[360,.05],[600,.15],[720,.45],[960,1],[1260,.95],[1440,.25]],m=((Number(minute)%1440)+1440)%1440;for(let i=1;i<a.length;i++){if(m<=a[i][0]){const [x0,y0]=a[i-1],[x1,y1]=a[i],w=(m-x0)/(x1-x0);return y0+w*(y1-y0)}}return .25}
function steroidSensitivity(minute,prednisoneMg,response=.69){const dose=Math.max(0,Number(prednisoneMg)||0),r=clamp(Number(response),.30,1),resistance=r*dose/60*steroidShape(minute);return 1/(1+resistance)}
function simulateV2(p,ctx,rapidOrder,previousBasal,seed,initialState=null,stateParams={}){
  if(!window.GlucoseStateSpaceV2)throw new Error('state_space_v2.js must load before engine_v2.js');
  const n=1441,mealPlan=ctx.meal_plan_carb_g||{breakfast:50,lunch:70,dinner:60},intake=ctx.intake_fraction||{breakfast:1,lunch:1,dinner:1};
  const mealEvents=[[MEAL_TIMES[0],mealPlan.breakfast*intake.breakfast],[MEAL_TIMES[1],mealPlan.lunch*intake.lunch],[MEAL_TIMES[2],mealPlan.dinner*intake.dinner]];
  const bolusEvents=[[RAPID_TIMES[0],rapidOrder.breakfast_u],[RAPID_TIMES[1],rapidOrder.lunch_u],[RAPID_TIMES[2],rapidOrder.dinner_u]];
  const renal=p.renal_modifier||(window.ClinicalModifiersV2?ClinicalModifiersV2.renalModifier(p.egfr_ml_min_1_73m2??90):{insulin_action_duration_multiplier:1});
  const rk=rapidKernel(ctx.rapid_formulation||'aspart',1200,renal.insulin_action_duration_multiplier||1),bk=basalKernel(ctx.basal_formulation||'glargine'),mk=mealKernel(p);
  const meal=conv(n,mealEvents,mk),bol=conv(n,bolusEvents,rk);
  // Basal physiology reference is the pre-obesity physiologic requirement. Obesity increases dose needed
  // by reducing insulin action; using the obesity-adjusted dose on both sides would double count resistance.
  const physiologicBasal=Number(p.legacy_basal_u_day??p.basal_u_day);
  const targetBasalActivity=conv(n,[[-120,physiologicBasal]],bk),actualBasalActivity=conv(n,[[-120,Number(previousBasal)]],bk);
  const si=intrinsicInsulinSensitivity(p,rapidKernel('aspart',1200,renal.insulin_action_duration_multiplier||1)),cg=si/p.icr_g_u,kh=restoreK(p),infScale=infectionSensitivity(ctx.infection_severity||0),hepaticInfection=infectionHepaticDrive(ctx.infection_severity||0),prednisone=ctx.prednisone_mg??ctx.prednisolone_mg_am??0,response=ctx.patient_steroid_response??.69;
  const cfg={...GlucoseStateSpaceV2.DEFAULTS,...stateParams},targetSetpoint=Number(p.fasting_setpoint_mg_dl)+Number(cfg.setpoint_shift_mg_dl||0);
  const startG=initialState?.glucose_mg_dl??targetSetpoint,startM=initialState?.metabolic_state??0;
  const M=GlucoseStateSpaceV2.evolveMetabolicState(startM,1440,seed??1,cfg);
  const g=new Float64Array(n);g[0]=Number(startG);let mn=g[0],mx=g[0];
  for(let t=0;t<n-1;t++){
    const sm=GlucoseStateSpaceV2.modifiers(M[t],cfg);
    const obesityAction=Number(p.incremental_obesity_insulin_action_multiplier??1);
    const insulinScale=infScale*steroidSensitivity(t,prednisone,response)*obesityAction;
    const circ=window.ClinicalModifiersV2?ClinicalModifiersV2.circadianNeed(t,p):1;
    const restore=-kh*(g[t]-targetSetpoint),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t]));
    const basalPhysiology=si*sm.basal_requirement_multiplier*circ*targetBasalActivity[t]-si*insulinScale*actualBasalActivity[t];
    const fastFlux=sm.fast_scale*(cg*meal[t]-si*insulinScale*bol[t]);
    g[t+1]=g[t]+fastFlux+basalPhysiology+restore+counter+hepaticInfection;
    if(g[t+1]<mn)mn=g[t+1];if(g[t+1]>mx)mx=g[t+1];
  }
  const bg={};for(const k in POC)bg[k]=g[POC[k]];
  return{bg,min:mn,max:mx,end:g[n-1],series:g,metabolic_series:M,next_state:{glucose_mg_dl:g[n-1],metabolic_state:M[1440]}};
}
window.GlucoseEngineV2={simulate:simulateV2,version:'2.4-explicit-intrinsic-insulin-sensitivity-axis',POC_TIMES:POC};
})();
