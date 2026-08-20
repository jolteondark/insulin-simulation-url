const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_game_model_v2_order_decomp_exp.js']) vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=global.T2DMPatientPhenotypeV1ShanghaiExp,M=global.T2DMGameModelV2OrderDecompExp;
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function logMult(r,cv){if(cv<=0)return 1;const s2=Math.log(1+cv*cv),s=Math.sqrt(s2),mu=-.5*s2;return Math.exp(mu+s*randn(r))}
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length)}
const PROXY_CV={breakfast:75.98621722681969/115.40601503759399,lunch:100.68674533159886/121.1217162872154,dinner:80.71613119459934/109.88185654008439};
const CFG={eq_center:147,eq_sd:35,coverage:0.80,meal_var_scale:0.55,bolus_mismatch_sd:0.10};
const N=1500,DAYS=12,WARMUP=2;
let patientMeans=[];
for(let i=1;i<=N;i++){
  const p={...P.sample(i)};
  p.dynamic_fasting_setpoint_mg_dl=Math.max(75,Math.min(260,CFG.eq_center+(p.dynamic_fasting_setpoint_mg_dl-147)*(CFG.eq_sd/28)));
  p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
  const nominal={...M.DEFAULT_MEALS};
  const base=M.suggestOrder(p,nominal);
  let state=null,vals=[]; const r=rng('mealresp:'+i);
  for(let d=0;d<DAYS;d++){
    const meal={}; for(const k of ['breakfast','lunch','dinner']) meal[k]=nominal[k]*logMult(r,PROXY_CV[k]*CFG.meal_var_scale);
    const order={...base};
    for(const k of ['breakfast','lunch','dinner']){
      const key=k+'_u';
      const coverageScale=CFG.coverage/M.PRANDIAL_COVERAGE;
      order[key]=Math.max(0,Math.round(base[key]*coverageScale*(1+CFG.bolus_mismatch_sd*randn(r))));
    }
    const out=M.simulateDay(p,order,{meal_plan_carb_g:meal},i,state); state=out.next_state;
    if(d>=WARMUP){
      const pre=out.series[480],g120=out.series[600];
      vals.push(g120-pre);
    }
  }
  patientMeans.push(mean(vals));
}
const sorted=[...patientMeans].sort((a,b)=>a-b);
const q=p=>sorted[Math.floor((sorted.length-1)*p)];
const result={n_patients:N,days_per_patient:DAYS-WARMUP,cfg:CFG,patient_mean_delta120:{mean:mean(patientMeans),between_patient_sd:sd(patientMeans),p05:q(.05),p25:q(.25),median:q(.5),p75:q(.75),p95:q(.95)},observed_basal_bolus_7:{mean_of_means:44.4,between_patient_sd:28.1,range:[0.3,73.3]}};
fs.mkdirSync('analysis/model_patient_meal_response',{recursive:true});
fs.writeFileSync('analysis/model_patient_meal_response/results.json',JSON.stringify(result,null,2));
const r=result.patient_mean_delta120;
const md=`# Model patient-level breakfast response heterogeneity\n\nCandidate config: equilibrium ${CFG.eq_center}±${CFG.eq_sd}, prandial coverage ${CFG.coverage}, meal variability scale ${CFG.meal_var_scale}, bolus mismatch SD ${CFG.bolus_mismatch_sd}.\n\n- Model patient-mean Δ120: **${r.mean.toFixed(1)} mg/dL**\n- Model between-patient SD of patient-mean Δ120: **${r.between_patient_sd.toFixed(1)} mg/dL**\n- Model p05/median/p95: ${r.p05.toFixed(1)} / ${r.median.toFixed(1)} / ${r.p95.toFixed(1)} mg/dL\n- Shanghai basal-bolus 7-session mean-of-means Δ120: **44.4 mg/dL**\n- Shanghai between-patient SD: **28.1 mg/dL**\n- Shanghai observed patient-mean range: **0.3 to 73.3 mg/dL**\n`;
fs.writeFileSync('analysis/model_patient_meal_response/report.md',md);console.log(md);
