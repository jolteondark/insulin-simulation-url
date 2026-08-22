#!/usr/bin/env node
'use strict';

// Validation-only local runner. No GitHub Actions dependency.
// Run from repository root:
//   node validation/scripts/latent_insulin_demand_state_screen.js
// Optional:
//   N=60 DAYS=14 OUT=validation/results/latent_insulin_demand_state_latest.json node validation/scripts/latent_insulin_demand_state_screen.js

const fs=require('fs'),vm=require('vm'),path=require('path');
const ENGINE_PATH='engine.js', GENERATOR_PATH='patient_generator.js';
const OUT=process.env.OUT||'validation/results/latent_insulin_demand_state_latest.json';
const E=fs.readFileSync(ENGINE_PATH,'utf8'), G=fs.readFileSync(GENERATOR_PATH,'utf8');
const N=Number(process.env.N||60), DAYS=Number(process.env.DAYS||14), LAGS=[30,60,120,240];
const TARGET={
  day:{30:0.8356734642,60:0.5790031609,120:0.1024831789,240:-0.0541005771},
  night:{30:0.889,60:0.760,120:0.460,240:0.086},
  marginal:{mean:145.08,cv:32.47,TIR:79.09,TBR70:1.589,TBR54:0.296,TAR180:19.32,TAR250:3.46}
};
function context(src){const c={console,Float64Array,Math,Number,String,Object,Array,JSON,Date,Set,Map};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(src,c);return c;}
function rng(seed){let a=seed>>>0;return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function corr(a,b){const n=a.length;if(n<50)return NaN;let sx=0,sy=0,sxx=0,syy=0,sxy=0;for(let i=0;i<n;i++){const x=a[i],y=b[i];sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;}const den=Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));return den>0?(n*sxy-sx*sy)/den:NaN;}
function median(a){a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
function quantile(a,q){a=a.slice().sort((x,y)=>x-y);if(!a.length)return NaN;const p=(a.length-1)*q,i=Math.floor(p),f=p-i;return a[i]*(1-f)+(a[i+1]??a[i])*f;}
function rmse(acf,target){return Math.sqrt(LAGS.reduce((s,l)=>s+(acf[l]-target[l])**2,0)/LAGS.length);}

const base=context(E);vm.runInContext(G,base);const cohort=[];
for(let i=0;i<N;i++){const seed=970001+i,x=base.PatientGenerator.generate(seed);cohort.push({seed,p:structuredClone(x.patient),c:structuredClone(x.case)});}

// Bounded zero-mean coarse persistent state. One multiplier is shared by all
// three rapid doses for holdDays consecutive patient-days. This deliberately
// tests a minimal insulin-demand mismatch abstraction without modifying the
// frozen engine or generator.
function stateFor(config,seed,day){
  if(config.amp===0)return 1;
  const block=Math.floor(day/config.holdDays);
  const r=rng((seed*2654435761 + block*2246822519 + Math.round(config.amp*1e6)+config.holdDays*9973)>>>0);
  return 1+config.amp*(2*r()-1);
}

function run(config){
  const q=context(E), dayA=Object.fromEntries(LAGS.map(l=>[l,[]])), nightA=Object.fromEntries(LAGS.map(l=>[l,[]]));
  let n=0,sum=0,sum2=0,tir=0,lo=0,lo54=0,hi=0,hi250=0;
  const poc={pre_breakfast:[],pre_lunch:[],pre_dinner:[],bedtime:[]}, stateVals=[];
  for(const z of cohort){
    let start=z.c.previous_day_end_glucose_mg_dl; const series=[];
    for(let d=0;d<DAYS;d++){
      const m=stateFor(config,z.seed,d); stateVals.push(m);
      const cc=structuredClone(z.c),o=cc.previous_order_u;
      const rapid={breakfast_u:o.breakfast_u*m,lunch_u:o.lunch_u*m,dinner_u:o.dinner_u*m};
      const res=q.GlucoseEngine.simulate(z.p,cc,rapid,o.basal_u,z.seed+d*997,start); start=res.end;
      for(const k of Object.keys(poc))poc[k].push(res.bg[k]);
      for(let t=0;t<1440;t+=5)series.push({g:res.series[t],tod:t});
    }
    for(const lag of LAGS){
      const k=lag/5,da=[],db=[],na=[],nb=[];
      for(let i=0;i+k<series.length;i++){
        const x=series[i],y=series[i+k];
        if(x.tod>=360&&y.tod>=360){da.push(x.g);db.push(y.g);}
        if(x.tod<360&&y.tod<360){na.push(x.g);nb.push(y.g);}
      }
      dayA[lag].push(corr(da,db)); nightA[lag].push(corr(na,nb));
    }
    for(const x of series){const g=x.g;n++;sum+=g;sum2+=g*g;if(g>=70&&g<=180)tir++;if(g<70)lo++;if(g<54)lo54++;if(g>180)hi++;if(g>250)hi250++;}
  }
  const mean=sum/n,sd=Math.sqrt((sum2-sum*sum/n)/(n-1));
  const day=Object.fromEntries(LAGS.map(l=>[l,median(dayA[l])])), night=Object.fromEntries(LAGS.map(l=>[l,median(nightA[l])]));
  const pocs={};for(const [k,a] of Object.entries(poc))pocs[k]={q10:quantile(a,.1),median:quantile(a,.5),q90:quantile(a,.9),mean:a.reduce((s,x)=>s+x,0)/a.length};
  return {...config,state_sd:Math.sqrt(stateVals.reduce((s,x)=>s+(x-1)**2,0)/stateVals.length),day_acf:day,night_acf:night,day_rmse:rmse(day,TARGET.day),night_rmse:rmse(night,TARGET.night),mean,cv:100*sd/mean,TIR:100*tir/n,TBR70:100*lo/n,TBR54:100*lo54/n,TAR180:100*hi/n,TAR250:100*hi250/n,poc:pocs};
}

const configs=[{amp:0,holdDays:1}];
for(const amp of [.03,.05,.075,.10])for(const holdDays of [1,2,3])configs.push({amp,holdDays});
const results=configs.map((c,i)=>{const r=run(c);console.error(`${i+1}/${configs.length}`,c,'day',r.day_rmse.toFixed(3),'night',r.night_rmse.toFixed(3),'TBR',r.TBR70.toFixed(2));return r;});
const baseline=results[0];
for(const r of results)r.delta_vs_baseline={day_rmse:r.day_rmse-baseline.day_rmse,night_rmse:r.night_rmse-baseline.night_rmse,TBR70:r.TBR70-baseline.TBR70,TBR54:r.TBR54-baseline.TBR54,cv:r.cv-baseline.cv,mean:r.mean-baseline.mean};
const payload={generated_at:new Date().toISOString(),protocol:{N,DAYS,seeds:`970001..${970000+N}`,sampling_min:5,state:'bounded uniform rapid-insulin demand/action multiplier, constant within patient block',hold_days:[1,2,3],amp:[0,.03,.05,.075,.10]},source_versions:{engine:'0.94-browser-port',generator:'0.79-browser-port'},target:TARGET,results};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2));console.log(JSON.stringify(payload,null,2));
