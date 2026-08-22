const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js']) vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=global.T2DMPatientPhenotypeV1ShanghaiExp;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function logMult(r,cv){const s2=Math.log(1+cv*cv),s=Math.sqrt(s2),mu=-.5*s2;return Math.exp(mu+s*randn(r))}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
function gamma1(dt,tau){return (dt/tau)*Math.exp(1-dt/tau)}
function area(tau,dur){let a=0;for(let t=0;t<dur;t++)a+=gamma1(t,tau);return a}
function mr(p){return clamp(Math.exp(1.5*(0.428-p.beta_cell_reserve)+0.60*Math.log(0.965/p.si_relative)+0.30*Math.log(p.hepatic_ir/1.072)),0.40,2.20)*.96}
function basalRef(p){const ukg=clamp(.18+.42*(1-p.beta_cell_reserve)+.18*(1/p.si_relative-1),.08,.65);return Math.max(0,Math.round(.5*ukg*p.body_weight_kg))}
const TARGET={mean:154.2,sd:56.7,tbr:1.92,tir:68.29,tar:29.79,b:140.5,l:138.7,d:160.9,d120:39.6};
const CFG={eq_center:147,eq_sd:35,meal_var_scale:.55,bolus_mismatch_sd:.10};
const CV={breakfast:75.98621722681969/115.40601503759399,lunch:100.68674533159886/121.1217162872154,dinner:80.71613119459934/109.88185654008439};
const MEAL_TAUS=[60,70,80],BOLUS_TAUS=[110,130,150,170,190],COVERAGES=[.80,.85,.90,.95,1.00];
const mealDur=330,bolusDur=480,N=1000,DAYS=8,WARM=2;
let rows=[];
for(const mt of MEAL_TAUS)for(const bt of BOLUS_TAUS)for(const cov of COVERAGES){
 const ma=area(mt,mealDur),ba=area(bt,bolusDur),uPerGBase=(.025*ma)/(.28*ba);
 let vals=[],B=[],L=[],D=[],d120s=[];
 for(let i=1;i<=N;i++){
  const p={...P.sample(i)};p.dynamic_fasting_setpoint_mg_dl=clamp(CFG.eq_center+(p.dynamic_fasting_setpoint_mg_dl-147)*(CFG.eq_sd/28),75,260);p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
  const r=rng(`reg:${mt}:${bt}:${cov}:${i}`);let state=p.dynamic_fasting_setpoint_mg_dl;
  const mult=mr(p);const baseBasal=basalRef(p);const nominal={breakfast:50,lunch:70,dinner:60};
  for(let day=0;day<DAYS;day++){
   const meal={};for(const k of ['breakfast','lunch','dinner'])meal[k]=nominal[k]*logMult(r,CV[k]*CFG.meal_var_scale);
   const dose={basal_u:baseBasal};for(const k of ['breakfast','lunch','dinner'])dose[k+'_u']=Math.max(0,Math.round(nominal[k]*cov*uPerGBase*mult/p.si_relative*(1+CFG.bolus_mismatch_sd*randn(r))));
   const g=new Float64Array(1441);g[0]=state;const mev=[[480,meal.breakfast],[780,meal.lunch],[1140,meal.dinner]],bev=[[465,dose.breakfast_u],[765,dose.lunch_u],[1125,dose.dinner_u]];
   for(let t=0;t<1440;t++){
    let md=0,bd=0;for(const [tm,c] of mev){const dt=t-tm;if(dt>=0&&dt<mealDur)md+=c*gamma1(dt,mt)*.025*mult}for(const [tb,u] of bev){const dt=t-tb;if(dt>=0&&dt<bolusDur)bd+=u*gamma1(dt,bt)*.28*p.si_relative}
    const restore=-.006*(g[t]-p.dynamic_fasting_setpoint_mg_dl);g[t+1]=g[t]+md-bd+restore;
   }
   state=g[1440];if(day>=WARM){for(let t=0;t<1440;t+=15)vals.push(g[t]);B.push(g[420]);L.push(g[720]);D.push(g[1080]);d120s.push(g[600]-g[480]);}
  }
 }
 const m=mean(vals),s=sd(vals),tbr=100*vals.filter(x=>x<70).length/vals.length,tir=100*vals.filter(x=>x>=70&&x<=180).length/vals.length,tar=100*vals.filter(x=>x>180).length/vals.length;
 const row={meal_tau:mt,bolus_tau:bt,coverage:cov,mean:m,sd:s,tbr,tir,tar,b:mean(B),l:mean(L),d:mean(D),d120:mean(d120s)};
 row.score=Math.sqrt(((m-TARGET.mean)/8)**2+((s-TARGET.sd)/8)**2+((tbr-TARGET.tbr)/1.5)**2+((tir-TARGET.tir)/8)**2+((tar-TARGET.tar)/8)**2+((row.b-TARGET.b)/12)**2+((row.l-TARGET.l)/15)**2+((row.d-TARGET.d)/15)**2+((row.d120-TARGET.d120)/12)**2);rows.push(row);
}
rows.sort((a,b)=>a.score-b.score);fs.mkdirSync('analysis/regular_kernel_grid',{recursive:true});fs.writeFileSync('analysis/regular_kernel_grid/results.json',JSON.stringify({target:TARGET,cfg:CFG,top:rows.slice(0,20),all:rows},null,2));
let md=['# Regular-insulin kernel grid','',`Target Shanghai regular basal-bolus n=6: mean ${TARGET.mean}, SD ${TARGET.sd}, TBR ${TARGET.tbr}, TIR ${TARGET.tir}, TAR ${TARGET.tar}; pre B/L/D ${TARGET.b}/${TARGET.l}/${TARGET.d}; breakfast Δ120 ${TARGET.d120}.`,'','| meal τ | regular τ | coverage | mean±SD | TBR | TIR | TAR | B/L/D | Δ120 | score |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const x of rows.slice(0,12))md.push(`| ${x.meal_tau} | ${x.bolus_tau} | ${x.coverage.toFixed(2)} | ${x.mean.toFixed(1)}±${x.sd.toFixed(1)} | ${x.tbr.toFixed(2)} | ${x.tir.toFixed(1)} | ${x.tar.toFixed(1)} | ${x.b.toFixed(0)}/${x.l.toFixed(0)}/${x.d.toFixed(0)} | ${x.d120.toFixed(1)} | ${x.score.toFixed(2)} |`);
fs.writeFileSync('analysis/regular_kernel_grid/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
