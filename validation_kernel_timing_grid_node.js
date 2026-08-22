const fs=require('fs'),vm=require('vm');global.window=global;const load=f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
for(const f of ['engine.js','patient_generator.js','patient_phenotype_v2.js','clinical_modifiers_v2.js','state_space_v2_finite_memory.js'])load(f);
const F=GlucoseStateSpaceV2FiniteMemory, CARBS={breakfast:50,lunch:70,dinner:60}, TARGET=[121.5,149.1,153.2,154.1];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function gamma2(t50,h){const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){const t=i+.5,v=(t/(th*th))*Math.exp(-t/th);k[i]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function mealKernel(p,scale){const h=1200,f=gamma2(p.meal_t50_fast_min*scale,h),s=gamma2(p.meal_t50_slow_min*scale,h),q=p.meal_fast_fraction,k=new Float64Array(h);for(let i=0;i<h;i++)k[i]=q*f[i]+(1-q)*s[i];return k}
function shifted(on,pk,dur,scale,h=1400,shape=3){on*=scale;pk*=scale;dur*=scale;const theta=Math.max((pk-on)/(shape-1),1),k=new Float64Array(h);let sum=0,taperStart=Math.max(pk,.8*dur);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-on,0);let v=x>0?Math.pow(x,shape-1)*Math.exp(-x/theta):0;if(t>taperStart&&t<dur)v*=.5*(1+Math.cos(Math.PI*(t-taperStart)/(dur-taperStart)));if(t>=dur)v=0;k[i]=v;sum+=v}for(let i=0;i<h;i++)k[i]/=sum;return k}
function conv(n,events,k){const y=new Float64Array(n);for(const [t0,a] of events){const t=Math.trunc(t0),ks=Math.max(0,-t),ys=Math.max(0,t),m=Math.min(k.length-ks,n-ys);for(let j=0;j<m;j++)y[ys+j]+=Number(a)*k[ks+j]}return y}
function basalKernel(h=1800){const k=new Float64Array(h);let s=0;for(let t=0;t<h;t++){let v=0;if(t>=60&&t<180)v=(t-60)/120;else if(t>=180&&t<1260)v=1;else if(t>=1260&&t<1500)v=1-(t-1260)/240;k[t]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}
function unitResponse(p,k,mins=240){const kh=restoreK(p);let d=0;for(let t=0;t<mins;t++)d+=(-(k[t]||0)-kh*d);return Math.max(1e-6,-d)}
function patient(base){const p=PatientPhenotypeV2.decorate(base),q=ClinicalModifiersV2.decorateClinical(p,{egfr_ml_min_1_73m2:90,meal_plan_carb_g:CARBS}),e=PatientPhenotypeV2.toEnginePatient(q);return e}
function roundHalf(x){return Math.round(x*2)/2}
function simulate(p,seed,mealScale,rapidScale,lead,days=7){const n=1441,bk=basalKernel(),mk=mealKernel(p,mealScale),rk=shifted(15,105,300,rapidScale),ref=shifted(15,105,300,rapidScale),ig=p.cf_mg_dl_u/unitResponse(p,ref,240),cg=ig/p.icr_g_u,kh=restoreK(p),ob=Number(p.incremental_obesity_insulin_action_multiplier??1),phys=Number(p.legacy_basal_u_day??p.basal_u_day),basalDose=roundHalf(Number(p.v2_basal_u_day??p.basal_u_day));
 const icr=Number(p.v2_icr_g_u??p.icr_g_u),dose=[roundHalf(50/icr),roundHalf(70/icr),roundHalf(60/icr)];
 let hist=[],g0=p.fasting_setpoint_mg_dl+15,checks=[],seriesAll=[];
 for(let d=0;d<days;d++){
  const E=F.evolveMetabolicState(hist,1440,seed+d,{memory_min:210,stationary_sd:1,basal_requirement_coupling:.28,fast_scale:.80,setpoint_shift_mg_dl:15});hist=E.end_history;
  const meal=conv(n,[[480,50],[780,70],[1140,60]],mk),bol=conv(n,[[480-lead,dose[0]],[780-lead,dose[1]],[1140-lead,dose[2]]],rk),targetB=conv(n,[[-120,phys]],bk),actualB=conv(n,[[-120,basalDose]],bk),g=new Float64Array(n);g[0]=g0;
  for(let t=0;t<n-1;t++){const sm=F.modifiers(E.series[t],{memory_min:210,stationary_sd:1,basal_requirement_coupling:.28,fast_scale:.80,setpoint_shift_mg_dl:15}),restore=-kh*(g[t]-(p.fasting_setpoint_mg_dl+15)),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t])),basal=ig*sm.basal_requirement_multiplier*targetB[t]-ig*ob*actualB[t],fast=sm.fast_scale*(cg*meal[t]-ig*ob*bol[t]);g[t+1]=g[t]+fast+basal+restore+counter}
  g0=g[n-1];if(d>0){checks.push([g[420],g[720],g[1080],g[1260]]);for(let i=1;i<g.length;i++)seriesAll.push(g[i])}
 }
 return{checks,seriesAll};
}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length)}
const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,7901,false).map(patient),mealScales=[.65,.8,1,1.2],rapidScales=[.8,1,1.2,1.4],leads=[0,15,30],out=[];
for(const ms of mealScales)for(const rs of rapidScales)for(const lead of leads){let C=[],V=[];for(let i=0;i<bases.length;i++){const r=simulate(bases[i],7901+i*100,ms,rs,lead);C.push(...r.checks);V.push(...r.seriesAll)}const m=[0,1,2,3].map(j=>mean(C.map(x=>x[j]))),s=[0,1,2,3].map(j=>sd(C.map(x=>x[j]))),err=Math.sqrt(m.reduce((z,x,j)=>z+(x-TARGET[j])**2,0)/4);let anyLow=0,anyHigh=0,allTir=0;for(const c of C){if(c.some(x=>x<70))anyLow++;if(c.some(x=>x>180))anyHigh++;if(c.every(x=>x>=70&&x<=180))allTir++}out.push({meal_scale:ms,rapid_scale:rs,bolus_lead_min:lead,poc_mean:m,poc_sd:s,poc_rmse_vs_uom:err,overall_mean:mean(V),overall_sd:sd(V),any_lt70_pct:100*anyLow/C.length,any_gt180_pct:100*anyHigh/C.length,all_four_tir_pct:100*allTir/C.length})}
out.sort((a,b)=>a.poc_rmse_vs_uom-b.poc_rmse_vs_uom);const result={protocol:{N,warmup:1,days:7,uniform_icr:true,circadian:false,state:{memory:210,coupling:.28,fast_scale:.80,shift:15}},uom_poc_mean:TARGET,top10:out.slice(0,10),all:out};fs.writeFileSync('kernel_timing_grid_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({protocol:result.protocol,uom_poc_mean:TARGET,top10:result.top10},null,2));