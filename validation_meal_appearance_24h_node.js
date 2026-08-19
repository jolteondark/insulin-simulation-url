const fs=require('fs'),vm=require('vm');global.window=global;const load=f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
for(const f of ['engine.js','patient_generator.js','patient_phenotype_v2.js','clinical_modifiers_v2.js','state_space_v2_finite_memory.js','meal_appearance_validation_v2.js'])load(f);
const F=GlucoseStateSpaceV2FiniteMemory, A=MealAppearanceValidationV2, CARBS={breakfast:50,lunch:70,dinner:60}, TARGET=[121.5,149.1,153.2,154.1];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function shifted(on,pk,dur,scale,h=1400,shape=3){on*=scale;pk*=scale;dur*=scale;const theta=Math.max((pk-on)/(shape-1),1),k=new Float64Array(h);let sum=0,taperStart=Math.max(pk,.8*dur);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-on,0);let v=x>0?Math.pow(x,shape-1)*Math.exp(-x/theta):0;if(t>taperStart&&t<dur)v*=.5*(1+Math.cos(Math.PI*(t-taperStart)/(dur-taperStart)));if(t>=dur)v=0;k[i]=v;sum+=v}for(let i=0;i<h;i++)k[i]/=sum;return k}
function conv(n,events,k){const y=new Float64Array(n);for(const [t0,a] of events){const t=Math.trunc(t0),ks=Math.max(0,-t),ys=Math.max(0,t),m=Math.min(k.length-ks,n-ys);for(let j=0;j<m;j++)y[ys+j]+=Number(a)*k[ks+j]}return y}
function addAppearance(n,events,p,cfg){const y=new Float64Array(n),gain=A.mealGain(p,cfg);for(const [t0,carb,fat] of events){const k=A.mealAppearanceKernel(carb,fat,cfg),t=Math.trunc(t0),m=Math.min(k.length,n-t);for(let j=0;j<m;j++)y[t+j]+=gain*carb*k[j]}return y}
function basalKernel(h=1800){const k=new Float64Array(h);let s=0;for(let t=0;t<h;t++){let v=0;if(t>=60&&t<180)v=(t-60)/120;else if(t>=180&&t<1260)v=1;else if(t>=1260&&t<1500)v=1-(t-1260)/240;k[t]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}
function unitResponse(p,k,mins=240){const kh=restoreK(p);let d=0;for(let t=0;t<mins;t++)d+=(-(k[t]||0)-kh*d);return Math.max(1e-6,-d)}
function patient(base){const p=PatientPhenotypeV2.decorate(base),q=ClinicalModifiersV2.decorateClinical(p,{egfr_ml_min_1_73m2:90,meal_plan_carb_g:CARBS}),e=PatientPhenotypeV2.toEnginePatient(q);return e}
function roundHalf(x){return Math.round(x*2)/2}
function simulate(p,seed,cfg,days=7){const n=1441,bk=basalKernel(),rk=shifted(15,105,300,.80),ig=p.cf_mg_dl_u/unitResponse(p,rk,240),kh=restoreK(p),ob=Number(p.incremental_obesity_insulin_action_multiplier??1),phys=Number(p.legacy_basal_u_day??p.basal_u_day),basalDose=roundHalf(Number(p.v2_basal_u_day??p.basal_u_day));
 const icr=Number(p.v2_icr_g_u??p.icr_g_u),dose=[roundHalf(50/icr),roundHalf(70/icr),roundHalf(60/icr)];
 let hist=[],g0=p.fasting_setpoint_mg_dl+15,checks=[],seriesAll=[];
 for(let d=0;d<days;d++){
  const E=F.evolveMetabolicState(hist,1440,seed+d,{memory_min:210,stationary_sd:1,basal_requirement_coupling:.28,fast_scale:.80,setpoint_shift_mg_dl:15});hist=E.end_history;
  const meal=addAppearance(n,[[480,50,0],[780,70,0],[1140,60,0]],p,cfg),bol=conv(n,[[480,dose[0]],[780,dose[1]],[1140,dose[2]]],rk),targetB=conv(n,[[-120,phys]],bk),actualB=conv(n,[[-120,basalDose]],bk),g=new Float64Array(n);g[0]=g0;
  for(let t=0;t<n-1;t++){const sm=F.modifiers(E.series[t],{memory_min:210,stationary_sd:1,basal_requirement_coupling:.28,fast_scale:.80,setpoint_shift_mg_dl:15}),restore=-kh*(g[t]-(p.fasting_setpoint_mg_dl+15)),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t])),basal=ig*sm.basal_requirement_multiplier*targetB[t]-ig*ob*actualB[t],fast=sm.fast_scale*(meal[t]-ig*ob*bol[t]);g[t+1]=g[t]+fast+basal+restore+counter}
  g0=g[n-1];if(d>0){checks.push([g[420],g[720],g[1080],g[1260]]);for(let i=1;i<g.length;i++)seriesAll.push(g[i])}
 }
 return{checks,seriesAll};
}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length)}
function acf(a,lag){const m=mean(a);let n=0,d=0;for(let i=0;i<a.length-lag;i++)n+=(a[i]-m)*(a[i+lag]-m);for(const x of a)d+=(x-m)*(x-m);return n/d}
const N=Number(process.env.N||30),bases=PatientGenerator.sampleCandidates(N,7901,false).map(patient);
const caps=[25,30,35,40,45],fast=[80,90,100,110],slow=[130,150,180,210],gains=[4.5,5.0,5.5,6.0],out=[];
for(const cap of caps)for(const ft of fast)for(const st of slow)for(const gain of gains){if(st<=ft)continue;const cfg={...A.DEFAULTS,early_carb_cap_g:cap,fast_t50_min:ft,slow_t50_min:st,gain_mg_dl_per_g_70kg:gain,fat_delay_per_10g:0};let C=[],V=[];for(let i=0;i<bases.length;i++){const r=simulate(bases[i],7901+i*100,cfg);C.push(...r.checks);V.push(...r.seriesAll)}const m=[0,1,2,3].map(j=>mean(C.map(x=>x[j]))),err=Math.sqrt(m.reduce((z,x,j)=>z+(x-TARGET[j])**2,0)/4);let anyLow=0,anyHigh=0,allTir=0;for(const c of C){if(c.some(x=>x<70))anyLow++;if(c.some(x=>x>180))anyHigh++;if(c.every(x=>x>=70&&x<=180))allTir++}out.push({cap,fast_t50:ft,slow_t50:st,gain,poc_mean:m,poc_rmse:err,overall_mean:mean(V),overall_sd:sd(V),acf30:acf(V,30),acf60:acf(V,60),acf120:acf(V,120),acf240:acf(V,240),any_lt70_pct:100*anyLow/C.length,any_gt180_pct:100*anyHigh/C.length,all_four_tir_pct:100*allTir/C.length})}
out.sort((a,b)=>a.poc_rmse-b.poc_rmse);const result={protocol:{N,warmup:1,days:7,rapid_scale:.80,bolus_lead_min:0,uniform_icr:true,circadian:false,state:{memory:210,coupling:.28,fast_scale:.80,shift:15},fat_in_24h:false},uom:{poc_mean:TARGET,overall_mean:146.463,overall_sd:56.225,acf:[.863,.634,.247,-.012],any_lt70_pct:7.68,any_gt180_pct:53.77,all_four_tir_pct:43.31},top20:out.slice(0,20),all:out};fs.writeFileSync('meal_appearance_24h_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({protocol:result.protocol,uom:result.uom,top20:result.top20},null,2));
