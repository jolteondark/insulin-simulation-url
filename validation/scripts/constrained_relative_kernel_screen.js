#!/usr/bin/env node
'use strict';

// Local validation-only runner. No GitHub Actions dependency.
// Production files are read but never modified.
// Run from repository root:
//   node validation/scripts/constrained_relative_kernel_screen.js

const fs=require('fs'),vm=require('vm'),path=require('path');
const E0=fs.readFileSync('engine.js','utf8');
const G=fs.readFileSync('patient_generator.js','utf8');
const OUT=process.env.OUT||'validation/results/constrained_relative_kernel_screen_latest.json';
const LAGS=[30,60,120,240],POC=[420,720,1080,1260],BASE_MEALS=[50,70,60];
const TARGET={acf:{30:.8356734642,60:.5790031609,120:.1024831789,240:-.0541005771}};

function context(src){const c={console,Float64Array,Math,Number,String,Object,Array,JSON,Date,Set,Map};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(src,c);return c}
function patchEngine(peak,duration){const sig='return shiftedGammaTaper(15,105,300,h,3)';if(!E0.includes(sig))throw Error('rapid signature changed');return E0.replace(sig,`return shiftedGammaTaper(15,${peak},${duration},h,3)`)}
function median(a){a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function quantile(a,q){a=a.filter(Number.isFinite).sort((x,y)=>x-y);const p=(a.length-1)*q,i=Math.floor(p),f=p-i;return a[i]+f*((a[i+1]??a[i])-a[i])}
function corr(a,b){const n=a.length;if(n<50)return NaN;let sx=0,sy=0,sxx=0,syy=0,sxy=0;for(let i=0;i<n;i++){const x=a[i],y=b[i];sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y}return(n*sxy-sx*sy)/Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy))}

function gamma2(t50,h=1200){const th=Math.max(Number(t50)/1.67835,2),k=new Float64Array(h);let s=0;for(let i=0;i<h;i++){const t=i+.5,v=t/(th*th)*Math.exp(-t/th);k[i]=v;s+=v}for(let i=0;i<h;i++)k[i]/=s;return k}
function mealKernel(p,c){const f=gamma2(p.meal_t50_fast_min*c.fastScale),s=gamma2(p.meal_t50_slow_min*c.slowScale),q=Math.max(.05,Math.min(.95,p.meal_fast_fraction+c.qDelta)),k=new Float64Array(f.length);for(let i=0;i<k.length;i++)k[i]=q*f[i]+(1-q)*s[i];return k}
function rapidKernel(peak,duration,h=1200){const onset=15,shape=3,theta=Math.max((peak-onset)/(shape-1),1),k=new Float64Array(h);let sum=0,taperStart=Math.max(peak,.8*duration);for(let i=0;i<h;i++){const t=i+.5,x=Math.max(t-onset,0);let v=x>0?Math.pow(x,shape-1)*Math.exp(-x/theta):0,taper=1;if(t>taperStart&&t<duration)taper=.5*(1+Math.cos(Math.PI*(t-taperStart)/(duration-taperStart)));if(t>=duration)taper=0;k[i]=v*taper;sum+=k[i]}for(let i=0;i<h;i++)k[i]/=sum;return k}

const base=context(E0);vm.runInContext(G,base);
function makeCohort(N){const out=[];for(let i=0;i<N;i++){const seed=970001+i,x=base.PatientGenerator.generate(seed);out.push({seed,p:structuredClone(x.patient),c:structuredClone(x.case)})}return out}
function crossing(z,c){const mk=mealKernel(z.p,c),rk=rapidKernel(c.peak,c.duration),units=[z.c.previous_order_u.breakfast_u,z.c.previous_order_u.lunch_u,z.c.previous_order_u.dinner_u],xs=[];for(let m=0;m<3;m++){let cr=240;for(let u=15;u<=240;u++){const meal=(BASE_MEALS[m]/z.p.icr_g_u)*mk[u],ins=units[m]*rk[u+15];if(meal-ins<0){cr=u;break}}xs.push(cr)}return xs}

function run(c,C,DAYS){const q=context(patchEngine(c.peak,c.duration));vm.runInContext(G,q);const acfByLag=Object.fromEntries(LAGS.map(l=>[l,[]])),poc=POC.map(()=>[]),cross=[];let n=0,sum=0,sum2=0,tir=0,l70=0,l54=0,h180=0,h250=0;
  for(const z of C){let start=z.c.previous_day_end_glucose_mg_dl,series=[];cross.push(...crossing(z,c));for(let d=0;d<DAYS;d++){const p=structuredClone(z.p);p.meal_t50_fast_min*=c.fastScale;p.meal_t50_slow_min*=c.slowScale;p.meal_fast_fraction=Math.max(.05,Math.min(.95,p.meal_fast_fraction+c.qDelta));const o=z.c.previous_order_u,res=q.GlucoseEngine.simulate(p,z.c,{breakfast_u:o.breakfast_u,lunch_u:o.lunch_u,dinner_u:o.dinner_u},o.basal_u,z.seed+d*997,start);start=res.end;for(let t=0;t<1440;t+=5){const g=res.series[t];series.push({g,tod:t});n++;sum+=g;sum2+=g*g;if(g>=70&&g<=180)tir++;if(g<70)l70++;if(g<54)l54++;if(g>180)h180++;if(g>250)h250++}for(let j=0;j<POC.length;j++)poc[j].push(res.series[POC[j]])}
    for(const lag of LAGS){const k=lag/5,a=[],b=[];for(let i=0;i+k<series.length;i++){const x=series[i],y=series[i+k];if(x.tod>=360&&y.tod>=360){a.push(x.g);b.push(y.g)}}acfByLag[lag].push(corr(a,b))}}
  const mean=sum/n,sd=Math.sqrt((sum2-sum*sum/n)/(n-1)),acf=Object.fromEntries(LAGS.map(l=>[l,median(acfByLag[l])])),rmse=Math.sqrt(LAGS.reduce((s,l)=>s+(acf[l]-TARGET.acf[l])**2,0)/LAGS.length);
  return{...c,acf,rmse,mean,cv:100*sd/mean,TIR:100*tir/n,TBR70:100*l70/n,TBR54:100*l54/n,TAR180:100*h180/n,TAR250:100*h250/n,crossing_median:median(cross),poc:poc.map(a=>({q10:quantile(a,.1),q50:quantile(a,.5),q90:quantile(a,.9)}))};
}

const meals=[
{name:'M0',fastScale:1,slowScale:1,qDelta:0},
{name:'S060',fastScale:1,slowScale:.60,qDelta:0},
{name:'S080',fastScale:1,slowScale:.80,qDelta:0},
{name:'S060Q+10',fastScale:1,slowScale:.60,qDelta:.10},
{name:'S080Q+10',fastScale:1,slowScale:.80,qDelta:.10},
{name:'F080S080',fastScale:.80,slowScale:.80,qDelta:0}
];
const rapid=[[95,285],[100,300],[105,300],[110,315]];
const N=Number(process.env.N||25),DAYS=Number(process.env.DAYS||5),C=makeCohort(N),coarse=[];
for(const [peak,duration] of rapid)for(const m of meals){const r=run({peak,duration,...m},C,DAYS);coarse.push(r);console.error(m.name,peak,duration,'r120',r.acf[120].toFixed(3),'RMSE',r.rmse.toFixed(3),'TBR70',r.TBR70.toFixed(2),'cross',r.crossing_median)}
coarse.sort((a,b)=>a.rmse-b.rmse);
const confirmN=Number(process.env.CONFIRM_N||50),confirmDays=Number(process.env.CONFIRM_DAYS||8),CC=makeCohort(confirmN),safe=coarse.filter(r=>r.TBR70<=3&&r.TBR54<=.5&&r.cv<=38),confirm=[];
for(const c of safe.slice(0,4))confirm.push(run(c,CC,confirmDays));
const baseline=run({peak:105,duration:300,...meals[0]},CC,confirmDays);
const payload={generated_at:new Date().toISOString(),protocol:{coarse:{N,DAYS},confirm:{N:confirmN,DAYS:confirmDays},sampling_min:5,daytime:'06:00-24:00',rapid_area_normalized:true,meal_area_normalized:true,production_changed:false},target:TARGET,baseline,coarse,confirm:confirm.sort((a,b)=>a.rmse-b.rmse)};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2));console.log(JSON.stringify(payload,null,2));
