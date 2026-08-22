const fs=require('fs'),vm=require('vm');global.window=global;const load=f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
for(const f of ['engine.js','patient_generator.js','patient_phenotype_v2.js','clinical_modifiers_v2.js'])load(f);
const CARBS=[50,70,60], TIMES=[60,120,180,240], clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function gamma2(t50,h){const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){const t=i+.5,v=(t/(th*th))*Math.exp(-t/th);k[i]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function mealKernel(p,h=1200){const f=gamma2(p.meal_t50_fast_min,h),s=gamma2(p.meal_t50_slow_min,h),q=clamp(Number(p.meal_fast_fraction),.05,.95),k=new Float64Array(h);for(let i=0;i<h;i++)k[i]=q*f[i]+(1-q)*s[i];return k}
function shifted(on,pk,dur,scale,h=1400,shape=3){on*=scale;pk*=scale;dur*=scale;const theta=Math.max((pk-on)/(shape-1),1),k=new Float64Array(h);let sum=0,taperStart=Math.max(pk,.8*dur);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-on,0);let v=x>0?Math.pow(x,shape-1)*Math.exp(-x/theta):0;if(t>taperStart&&t<dur)v*=.5*(1+Math.cos(Math.PI*(t-taperStart)/(dur-taperStart)));if(t>=dur)v=0;k[i]=v;sum+=v}for(let i=0;i<h;i++)k[i]/=sum;return k}
function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}
function unitResponse(p,k,mins=240){const kh=restoreK(p);let d=0;for(let t=0;t<mins;t++)d+=(-(k[t]||0)-kh*d);return Math.max(1e-6,-d)}
function patient(base){const p=PatientPhenotypeV2.decorate(base),q=ClinicalModifiersV2.decorateClinical(p,{egfr_ml_min_1_73m2:90,meal_plan_carb_g:{breakfast:50,lunch:70,dinner:60}});return PatientPhenotypeV2.toEnginePatient(q)}
function roundHalf(x){return Math.round(x*2)/2}
function response(flux,kh){let d=0,out={};for(let t=0;t<240;t++){d+=flux[t]-kh*d;if(TIMES.includes(t+1))out[t+1]=d}return out}
function median(a){const x=[...a].sort((a,b)=>a-b),n=x.length;return n%2?x[(n-1)/2]:(x[n/2-1]+x[n/2])/2}
function q(a,p){const x=[...a].sort((a,b)=>a-b),i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return x[l]+(x[h]-x[l])*(i-l)}
function pearson(a,b){const ma=a.reduce((s,x)=>s+x,0)/a.length,mb=b.reduce((s,x)=>s+x,0)/b.length;let n=0,da=0,db=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;n+=x*y;da+=x*x;db+=y*y}return n/Math.sqrt(da*db)}
const N=Number(process.env.N||300),bases=PatientGenerator.sampleCandidates(N,7901,false).map(patient),rk=shifted(15,105,300,.80),rows=[];
for(let i=0;i<bases.length;i++){
 const p=bases[i],kh=restoreK(p),ig=p.cf_mg_dl_u/unitResponse(p,rk,240),ob=Number(p.incremental_obesity_insulin_action_multiplier??1),icr=Number(p.v2_icr_g_u??p.icr_g_u),gain=clamp(5.0*Math.pow(70/clamp(p.body_weight_kg,40,130),.65),1,10),mk=mealKernel(p);
 for(let mi=0;mi<3;mi++){
  const carb=CARBS[mi],dose=roundHalf(carb/icr),mealFlux=new Float64Array(240),bolFlux=new Float64Array(240);for(let t=0;t<240;t++){mealFlux[t]=.80*gain*carb*(mk[t]||0);bolFlux[t]=-.80*ig*ob*dose*(rk[t]||0)}
  const mr=response(mealFlux,kh),br=response(bolFlux,kh),r={patient:i,meal:mi,carb,dose,weight:p.body_weight_kg,legacy_icr:p.icr_g_u,v2_icr:icr,legacy_cf:p.cf_mg_dl_u,v2_cf:p.v2_cf_mg_dl_u,obesity_action:ob,gain,meal_t50_fast:p.meal_t50_fast_min,meal_t50_slow:p.meal_t50_slow_min,meal_fast_fraction:p.meal_fast_fraction};
  for(const t of TIMES){r['meal_rise_'+t]=mr[t];r['bolus_fall_'+t]=-br[t];r['fall_rise_ratio_'+t]=(-br[t])/Math.max(mr[t],1e-9);r['net_'+t]=mr[t]+br[t]}
  r.total_nominal_ratio=(p.cf_mg_dl_u*ob*dose)/(gain*carb);rows.push(r)
 }
}
const summary={N,rapid_scale:.80,fast_scale:.80,gain_70kg:5.0,rows:rows.length,by_time:{},correlations:{}};
for(const t of TIMES){const x=rows.map(r=>r['fall_rise_ratio_'+t]);summary.by_time[t]={median:median(x),p10:q(x,.1),p25:q(x,.25),p75:q(x,.75),p90:q(x,.9),pct_gt1:100*x.filter(v=>v>1).length/x.length,net_median:median(rows.map(r=>r['net_'+t]))}}
const ratio240=rows.map(r=>r.fall_rise_ratio_240);for(const k of ['legacy_cf','legacy_icr','v2_icr','obesity_action','weight','meal_t50_fast','meal_t50_slow','meal_fast_fraction'])summary.correlations[k]=pearson(rows.map(r=>Number(r[k])),ratio240);
summary.nominal={median:median(rows.map(r=>r.total_nominal_ratio)),p10:q(rows.map(r=>r.total_nominal_ratio),.1),p90:q(rows.map(r=>r.total_nominal_ratio),.9)};
summary.identity_check={note:'Because v2_icr = legacy_icr * obesity_action and bolus action is multiplied by obesity_action, obesity largely cancels before dose rounding. The effective prandial strength is therefore driven mainly by legacy CF / legacy ICR versus the independent meal gain.'};
fs.writeFileSync('prandial_balance_result.json',JSON.stringify({summary,rows},null,2));console.log(JSON.stringify(summary,null,2));