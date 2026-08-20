const fs=require('fs'),vm=require('vm');
function load(path){const src=fs.readFileSync(path,'utf8');vm.runInThisContext('var window=globalThis;'+src,{filename:path});}
load('patient_generator.js');load('patient_phenotype_v2.js');load('clinical_modifiers_v2.js');load('t1dm_game_model_v2.js');load('t1dm_game_admission_v2.js');
const N=Number(process.env.N||500);
function classify(r){return r.min<70?'low':r.max>400?'high':'survive'}
function mealFractions(seed,cv=.2){function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}let a=hash32(seed);function rr(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}function rn(){let u=0,v=0;while(!u)u=rr();while(!v)v=rr();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}const s=Math.sqrt(Math.log(1+cv*cv)),mu=-.5*s*s;return{breakfast:Math.max(.45,Math.min(1.35,Math.exp(mu+s*rn()))),lunch:Math.max(.45,Math.min(1.35,Math.exp(mu+s*rn()))),dinner:Math.max(.45,Math.min(1.35,Math.exp(mu+s*rn())))}}
const strategies={
  continue:(o,m,p)=>({...o}),
  meal_matched:(o,m,p)=>T1DMGameModelV2.suggestOrder(p,{breakfast:50*m.breakfast,lunch:70*m.lunch,dinner:60*m.dinner}),
  plus1_all:(o,m,p)=>({breakfast_u:o.breakfast_u+1,lunch_u:o.lunch_u+1,dinner_u:o.dinner_u+1,basal_u:o.basal_u+1}),
  minus1_all:(o,m,p)=>({breakfast_u:Math.max(0,o.breakfast_u-1),lunch_u:Math.max(0,o.lunch_u-1),dinner_u:Math.max(0,o.dinner_u-1),basal_u:Math.max(0,o.basal_u-1)}),
  bolus_plus1:(o,m,p)=>({breakfast_u:o.breakfast_u+1,lunch_u:o.lunch_u+1,dinner_u:o.dinner_u+1,basal_u:o.basal_u}),
  basal_plus2:(o,m,p)=>({...o,basal_u:o.basal_u+2})
};
const out={protocol:{N,days:1,meal_cv:.20,timing:'freeze default',admission_gate:'3 stable reference days'},strategies:{}};
for(const name of Object.keys(strategies))out.strategies[name]={survive:0,low:0,high:0,min:[],max:[]};
let priorUnsafe=0,attempts=[];
for(let i=0;i<N;i++){
  const seed=100000+i*7919;
  const base=T1DMGameModelV2.generatePatient(seed);attempts.push(base.case.admission_gate?.attempts||1);
  const starter={...base.case.previous_order_u};
  const prior=T1DMGameModelV2.playDay(base,starter,{intake_fraction:{breakfast:1,lunch:1,dinner:1},meal_timing_sd_min:15,bolus_timing_sd_min:15,poc_timing_sd_min:15},(seed^0xA5A5A5A5)>>>0);
  if(prior.min<70||prior.max>400){priorUnsafe++;continue;}
  const meal=mealFractions(seed+2,.20);
  for(const [name,fn] of Object.entries(strategies)){
    const game=T1DMGameModelV2.generatePatient(seed);
    T1DMGameModelV2.playDay(game,starter,{intake_fraction:{breakfast:1,lunch:1,dinner:1},meal_timing_sd_min:15,bolus_timing_sd_min:15,poc_timing_sd_min:15},(seed^0xA5A5A5A5)>>>0);
    const order=fn(starter,meal,game.patient);
    const r=T1DMGameModelV2.playDay(game,order,{intake_fraction:meal},seed+3);
    const k=classify(r),x=out.strategies[name];x[k]++;x.min.push(r.min);x.max.push(r.max);
  }
}
const used=N-priorUnsafe;function pct(n){return used?100*n/used:0}function avg(a){return a.reduce((x,y)=>x+y,0)/a.length}for(const x of Object.values(out.strategies)){x.survive_pct=pct(x.survive);x.low_pct=pct(x.low);x.high_pct=pct(x.high);x.mean_min=avg(x.min);x.mean_max=avg(x.max);delete x.min;delete x.max}out.prior_unsafe_excluded=priorUnsafe;out.used=used;out.admission_attempts_mean=avg(attempts);out.admission_attempts_max=Math.max(...attempts);fs.writeFileSync('t1dm_gameplay_balance_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));