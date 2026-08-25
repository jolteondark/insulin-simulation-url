(function(){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const POC={pre_breakfast:420,pre_lunch:720,pre_dinner:1080,bedtime:1260};
const MEAL_TIMES=[480,780,1140];
const RAPID_TIMES=[465,765,1125];
const SCALE_POC_TIMES=[POC.pre_breakfast,POC.pre_lunch,POC.pre_dinner];
const SCALE_KEYS=['breakfast','lunch','dinner'];

function gamma2(t50,h){const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){const t=i+.5,v=(t/(th*th))*Math.exp(-t/th);k[i]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function mealKernel(p){const h=Math.floor(Math.max(720,p.meal_t50_slow_min*5)),f=gamma2(p.meal_t50_fast_min,h),s=gamma2(p.meal_t50_slow_min,h),q=p.meal_fast_fraction,k=new Float64Array(h);for(let i=0;i<h;i++)k[i]=q*f[i]+(1-q)*s[i];return k}
function conv(n,events,k){const y=new Float64Array(n);for(const [rawT,a] of events){const t=Math.trunc(rawT),ks=Math.max(0,-t),ys=Math.max(0,t),m=Math.min(k.length-ks,n-ys);for(let j=0;j<m;j++)y[ys+j]+=Number(a)*k[ks+j]}return y}
function addKernel(y,t,dose,k){if(!(dose>0))return;const m=Math.min(k.length,y.length-t);for(let j=0;j<m;j++)y[t+j]+=Number(dose)*k[j]}
function shiftedGammaTaper(onset,peak,duration,h=900,shape=3){const sh=Math.max(shape,1.05),theta=Math.max((peak-onset)/(sh-1),1),k=new Float64Array(h);let sum=0;const taperStart=Math.max(peak,.80*duration);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-onset,0);let v=x>0?Math.pow(x,sh-1)*Math.exp(-x/theta):0;let taper=1;if(t>taperStart&&t<duration)taper=.5*(1+Math.cos(Math.PI*(t-taperStart)/(duration-taperStart)));if(t>=duration)taper=0;v*=taper;k[i]=v;sum+=v}if(sum<=0)throw new Error('invalid insulin profile');for(let i=0;i<h;i++)k[i]/=sum;return k}
function regularKernel(h=900){const core=shiftedGammaTaper(30,180,300,h,3),tail=new Float64Array(h);let ts=0;for(let i=0;i<h;i++){const t=i+.5;if(t>=300&&t<480){tail[i]=(480-t)/180;ts+=tail[i]}}if(ts>0)for(let i=0;i<h;i++)tail[i]/=ts;const k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){k[i]=.96*core[i]+.04*tail[i];s+=k[i]}for(let i=0;i<h;i++)k[i]/=s;return k}
function rapidKernel(name='aspart',h=900){const n=String(name).toLowerCase().replaceAll(' ','_');if(['regular','humulin','humulin_r','human_regular','insulin_human'].includes(n))return regularKernel(h);if(['lyumjev','lispro-aabc','insulin_lispro-aabc'].includes(n))return shiftedGammaTaper(5,95,276,h,3);if(['aspart','novolog','novorapid','insulin_aspart'].includes(n))return shiftedGammaTaper(15,105,300,h,3);throw new Error('unknown rapid formulation: '+name)}
function basalKernel(name='glargine',h=1800){const n=String(name).toLowerCase().replaceAll(' ','_');if(!['glargine','lantus','insulin_glargine','glargine_u100'].includes(n))throw new Error('unsupported basal formulation: '+name);const k=new Float64Array(h);let s=0;for(let t=0;t<h;t++){let v=0;if(t>=60&&t<180)v=(t-60)/120;else if(t>=180&&t<1260)v=1;else if(t>=1260&&t<1500)v=1-(t-1260)/240;k[t]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}
function unitResponseAt(p,kernel,minutes=240){const u=new Float64Array(minutes+1);for(let i=0;i<Math.min(kernel.length,u.length);i++)u[i]=kernel[i];const kh=restoreK(p);let d=0;for(let t=0;t<minutes;t++)d+=(-u[t]-kh*d);return Math.max(1e-6,-d)}
function insulinGain(p){const ref=rapidKernel('aspart');return p.cf_mg_dl_u/unitResponseAt(p,ref,240)}
function infectionSensitivity(severity){const s=clamp(Number(severity)||0,0,1);return 1-.50*Math.pow(s,1.25)}
function infectionHepaticDrive(severity){const s=clamp(Number(severity)||0,0,1);return .020*Math.pow(s,1.4)}
function steroidShape(minute){const a=[[0,.05],[360,.05],[600,.15],[720,.45],[960,1],[1260,.95],[1440,.25]],m=((Number(minute)%1440)+1440)%1440;for(let i=1;i<a.length;i++){if(m<=a[i][0]){const [x0,y0]=a[i-1],[x1,y1]=a[i],w=(m-x0)/(x1-x0);return y0+w*(y1-y0)}}return .25}
function steroidSensitivity(minute,prednisoneMg,response=.69){const dose=Math.max(0,Number(prednisoneMg)||0),r=clamp(Number(response),.30,1),resistance=r*dose/60*steroidShape(minute);return 1/(1+resistance)}
function currentScaleConfig(){try{return window.CorrectionScale?.consumeForSimulation?.()||null}catch{return null}}
function correctionUnits(bg,cfg){if(!cfg||!cfg.enabled)return 0;if(window.CorrectionScale?.correctionUnits)return Number(window.CorrectionScale.correctionUnits(bg,cfg))||0;const g=Number(bg),start=Number(cfg.start_bg),step=Number(cfg.bg_step),units=Number(cfg.units_per_step);if(!Number.isFinite(g)||g<70||g<start||!(step>0)||!(units>0))return 0;return (Math.floor((g-start)/step)+1)*units}

function simulate(p,ctx,rapidOrder,previousBasal,_seed,startG){
  const n=1441,mealPlan=ctx.meal_plan_carb_g||{breakfast:50,lunch:70,dinner:60},intake=ctx.intake_fraction||{breakfast:1,lunch:1,dinner:1};
  const mealEvents=[[MEAL_TIMES[0],mealPlan.breakfast*intake.breakfast],[MEAL_TIMES[1],mealPlan.lunch*intake.lunch],[MEAL_TIMES[2],mealPlan.dinner*intake.dinner]];
  const bolusEvents=[[RAPID_TIMES[0],rapidOrder.breakfast_u],[RAPID_TIMES[1],rapidOrder.lunch_u],[RAPID_TIMES[2],rapidOrder.dinner_u]];
  const rk=rapidKernel(ctx.rapid_formulation||'aspart'),bk=basalKernel(ctx.basal_formulation||'glargine'),mk=mealKernel(p);
  const meal=conv(n,mealEvents,mk),bol=conv(n,bolusEvents,rk),basalDelta=conv(n,[[-120,Number(previousBasal)-Number(p.basal_u_day)]],bk);
  const ig=insulinGain(p),cg=ig/p.icr_g_u,kh=restoreK(p),infScale=infectionSensitivity(ctx.infection_severity||0),hepatic=infectionHepaticDrive(ctx.infection_severity||0),prednisone=ctx.prednisone_mg??ctx.prednisolone_mg_am??0,response=ctx.patient_steroid_response??.69;
  const scaleCfg=ctx.correction_scale||currentScaleConfig();
  const correctionDoses={breakfast:0,lunch:0,dinner:0};
  const g=new Float64Array(n);g[0]=startG==null?p.fasting_setpoint_mg_dl:Number(startG);let mn=g[0],mx=g[0];
  for(let t=0;t<n-1;t++){
    const idx=RAPID_TIMES.indexOf(t);
    if(idx>=0&&scaleCfg?.enabled){
      const measuredBg=g[SCALE_POC_TIMES[idx]];
      const extra=correctionUnits(measuredBg,scaleCfg);
      correctionDoses[SCALE_KEYS[idx]]=extra;
      addKernel(bol,t,extra,rk);
    }
    const insulinScale=infScale*steroidSensitivity(t,prednisone,response),restore=-kh*(g[t]-p.fasting_setpoint_mg_dl),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t]));
    g[t+1]=g[t]+cg*meal[t]-ig*insulinScale*bol[t]-ig*insulinScale*basalDelta[t]+restore+counter+hepatic;
    if(g[t+1]<mn)mn=g[t+1];if(g[t+1]>mx)mx=g[t+1];
  }
  const bg={};for(const k in POC)bg[k]=g[POC[k]];
  return{bg,min:mn,max:mx,end:g[n-1],series:g,correction_doses_u:correctionDoses,correction_scale:scaleCfg?.enabled?{...scaleCfg}:null};
}

window.GlucoseEngine={simulate,version:'0.95-browser-scale',POC_TIMES:POC,correctionUnits};
})();