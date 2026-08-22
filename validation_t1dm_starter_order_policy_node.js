const fs=require('fs'),vm=require('vm');
function load(path){const src=fs.readFileSync(path,'utf8');vm.runInThisContext('var window=globalThis;'+src,{filename:path});}
load('patient_generator.js');load('patient_phenotype_v2.js');load('clinical_modifiers_v2.js');load('t1dm_game_model_v2.js');
const N=Number(process.env.N||300);
const policies={
 base:o=>({...o}),
 minus1_all:o=>({breakfast_u:Math.max(0,o.breakfast_u-1),lunch_u:Math.max(0,o.lunch_u-1),dinner_u:Math.max(0,o.dinner_u-1),basal_u:Math.max(0,o.basal_u-1)}),
 minus2_all:o=>({breakfast_u:Math.max(0,o.breakfast_u-2),lunch_u:Math.max(0,o.lunch_u-2),dinner_u:Math.max(0,o.dinner_u-2),basal_u:Math.max(0,o.basal_u-2)}),
 minus1_bolus:o=>({breakfast_u:Math.max(0,o.breakfast_u-1),lunch_u:Math.max(0,o.lunch_u-1),dinner_u:Math.max(0,o.dinner_u-1),basal_u:o.basal_u}),
 minus1_basal:o=>({...o,basal_u:Math.max(0,o.basal_u-1)}),
 pct90:o=>({breakfast_u:Math.max(0,Math.round(o.breakfast_u*.9)),lunch_u:Math.max(0,Math.round(o.lunch_u*.9)),dinner_u:Math.max(0,Math.round(o.dinner_u*.9)),basal_u:Math.max(0,Math.round(o.basal_u*.9))}),
 pct85:o=>({breakfast_u:Math.max(0,Math.round(o.breakfast_u*.85)),lunch_u:Math.max(0,Math.round(o.lunch_u*.85)),dinner_u:Math.max(0,Math.round(o.dinner_u*.85)),basal_u:Math.max(0,Math.round(o.basal_u*.85))})
};
function mealFrac(seed){let a=(seed>>>0)||1;function r(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}function rn(){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}const cv=.2,s=Math.sqrt(Math.log(1+cv*cv)),mu=-.5*s*s;const f=()=>Math.max(.45,Math.min(1.35,Math.exp(mu+s*rn())));return{breakfast:f(),lunch:f(),dinner:f()}}
const out={N,policies:{}};for(const k of Object.keys(policies))out.policies[k]={prior_safe:0,day1_safe:0,low:0,high:0,prior_low:0,prior_high:0};
for(let i=0;i<N;i++){const seed=200000+i*3571,raw=T1DMGameModelV2.generatePatient(seed),base={...raw.case.previous_order_u},meal=mealFrac(seed+9);for(const [name,fn] of Object.entries(policies)){const game=T1DMGameModelV2.generatePatient(seed),o=fn(base),prior=T1DMGameModelV2.playDay(game,o,{intake_fraction:{breakfast:1,lunch:1,dinner:1}},(seed^0xA5A5A5A5)>>>0),x=out.policies[name];if(prior.min<70){x.prior_low++;continue}if(prior.max>400){x.prior_high++;continue}x.prior_safe++;const matched=T1DMGameModelV2.suggestOrder(game.patient,{breakfast:50*meal.breakfast,lunch:70*meal.lunch,dinner:60*meal.dinner});matched.basal_u=o.basal_u;const r=T1DMGameModelV2.playDay(game,matched,{intake_fraction:meal},seed+123);if(r.min<70)x.low++;else if(r.max>400)x.high++;else{x.day1_safe++}}}
for(const x of Object.values(out.policies)){x.prior_safe_pct=100*x.prior_safe/N;x.day1_safe_cond_pct=x.prior_safe?100*x.day1_safe/x.prior_safe:0;x.day1_safe_total_pct=100*x.day1_safe/N}
fs.writeFileSync('t1dm_starter_order_policy_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));