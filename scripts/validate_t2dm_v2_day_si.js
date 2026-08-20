const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js']) vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const M=global.T2DMGameModelV2OrderDecompExp;
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function logMult(r,cv){if(cv<=0)return 1;const s2=Math.log(1+cv*cv),s=Math.sqrt(s2),mu=-.5*s2;return Math.exp(mu+s*randn(r))}
const PROXY_CV={breakfast:75.98621722681969/115.40601503759399,lunch:100.68674533159886/121.1217162872154,dinner:80.71613119459934/109.88185654008439};
const BASECFG={breakfast:0.45,lunch:0.20,dinner:0.20,mismatch_sd:0.10};
fs.mkdirSync('analysis/t2dm_v2_day_si',{recursive:true});
const p0=T2DMPatientPhenotypeV2Shanghai106Exp.sample(1),nom={...M.DEFAULT_MEALS},base=M.suggestOrder(p0,nom),r=rng('diag');
const meal={};for(const k of ['breakfast','lunch','dinner'])meal[k]=nom[k]*logMult(r,PROXY_CV[k]*BASECFG[k]);
const order={...base};for(const k of ['breakfast','lunch','dinner']){const key=k+'_u';order[key]=Math.max(0,Math.round(order[key]*(1+BASECFG.mismatch_sd*randn(r))))}
const p={...p0,si_relative:Math.max(0.20,Math.min(1.80,p0.si_relative))};
const out=M.simulateDay(p,order,{meal_plan_carb_g:meal},1,null);
const diag={default_meals:M.DEFAULT_MEALS,nom,base,p0_si:p0.si_relative,eq:p0.dynamic_fasting_setpoint_mg_dl,meal,order,mr:M.mealResponseMultiplier(p),reference:M.suggestOrder(p,meal),end:out.end,bg:out.bg,finite:Number.isFinite(out.end),first:[...out.series.slice(0,10)]};
fs.writeFileSync('analysis/t2dm_v2_day_si/diagnostic.json',JSON.stringify(diag,null,2));
console.log(JSON.stringify(diag,null,2));
