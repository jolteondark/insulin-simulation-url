const fs=require('fs'),vm=require('vm');
function load(path){const src=fs.readFileSync(path,'utf8');vm.runInThisContext('var window=globalThis;'+src,{filename:path});}
load('patient_generator.js');load('patient_phenotype_v2.js');load('clinical_modifiers_v2.js');load('t1dm_game_model_v2.js');
const N=Number(process.env.N||500),MEALS={breakfast:50,lunch:70,dinner:60},TOTAL=180;
const full={breakfast:1,lunch:1,dinner:1};
function rU(x){return Math.max(0,Math.round(x));}
function weightOrder(p,ukg=.4){const tdd=ukg*p.body_weight_kg,b=.5*tdd,n=.5*tdd;return{breakfast_u:rU(n*50/TOTAL),lunch_u:rU(n*70/TOTAL),dinner_u:rU(n*60/TOTAL),basal_u:rU(b)}}
function bmiTier(p){const bmi=p.bmi_kg_m2;return bmi<20?.3:bmi<25?.4:bmi<30?.5:.6}
function statsOrder(p){return weightOrder(p,bmiTier(p))}
function fourPointAdjust(base,bg){const o={...base};const pairs=[['basal_u',bg.pre_breakfast],['breakfast_u',bg.pre_lunch],['lunch_u',bg.pre_dinner],['dinner_u',bg.bedtime]];for(const [k,g] of pairs){if(g<100)o[k]=Math.max(0,o[k]-1);else if(g>180)o[k]+=1;}return o}
function hiddenReference(p){const q=T1DMGameModelV2.suggestOrder(p,MEALS);return{breakfast_u:rU(.9*q.breakfast_u),lunch_u:rU(.9*q.lunch_u),dinner_u:rU(.9*q.dinner_u),basal_u:rU(.9*q.basal_u)}}
function classify(r){return r.min<70?'low':r.max>400?'high':'safe'}
function init(){return{safe:0,low:0,high:0,all:[],orders:[],abs_tdd_err:[]}}
const out={N,protocol:{prior_day:'same hidden-phenotype 90% reference order for all policies; next-day comparison from identical hidden state',meal_plan_g:MEALS,timing_sd_min:15,notes:'stats policy uses BMI to choose 0.3/0.4/0.5/0.6 U/kg. four-point policy starts from stats order and adjusts corresponding basal/bolus by ±1 U for prior BG <100 or >180. hidden reference uses internal phenotype and is not clinically observable.'},policies:{weight_only_0p4:init(),visible_stats_bmi:init(),visible_stats_plus_4point:init(),hidden_phenotype_reference:init()}};
for(let i=0;i<N;i++){
 const seed=1200001+i*7919,game0=T1DMGameModelV2.generatePatient(seed),p=game0.patient;
 const priorO=hiddenReference(p);
 const prior=T1DMGameModelV2.simulateDay(p,priorO,{meal_plan_carb_g:MEALS,intake_fraction:full,meal_timing_sd_min:15,bolus_timing_sd_min:15,poc_timing_sd_min:15},(seed^0x11111111)>>>0,null);
 const trueTdd=p.tdd_u_day;
 const orders={weight_only_0p4:weightOrder(p,.4),visible_stats_bmi:statsOrder(p),visible_stats_plus_4point:fourPointAdjust(statsOrder(p),prior.bg),hidden_phenotype_reference:hiddenReference(p)};
 for(const [name,o] of Object.entries(orders)){
   const r=T1DMGameModelV2.simulateDay(p,o,{meal_plan_carb_g:MEALS,intake_fraction:full,meal_timing_sd_min:15,bolus_timing_sd_min:15,poc_timing_sd_min:15},(seed^0x22222222)>>>0,prior.next_state),x=out.policies[name];
   x[classify(r)]++; for(const g of r.series)x.all.push(g); x.orders.push(o); x.abs_tdd_err.push(Math.abs((o.breakfast_u+o.lunch_u+o.dinner_u+o.basal_u)-trueTdd));
 }
}
function avg(a){return a.reduce((s,x)=>s+x,0)/a.length}function sd(a,m=avg(a)){return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
for(const x of Object.values(out.policies)){const m=avg(x.all),n=x.all.length;x.safe_pct=100*x.safe/N;x.low_pct=100*x.low/N;x.high_pct=100*x.high/N;x.mean=m;x.sd=sd(x.all,m);x.tir=100*x.all.filter(g=>g>=70&&g<=180).length/n;x.tbr=100*x.all.filter(g=>g<70).length/n;x.tar=100*x.all.filter(g=>g>180).length/n;x.mean_abs_tdd_error_u=avg(x.abs_tdd_err);x.mean_order={breakfast_u:avg(x.orders.map(o=>o.breakfast_u)),lunch_u:avg(x.orders.map(o=>o.lunch_u)),dinner_u:avg(x.orders.map(o=>o.dinner_u)),basal_u:avg(x.orders.map(o=>o.basal_u))};delete x.all;delete x.orders;delete x.abs_tdd_err;}
fs.writeFileSync('t1dm_information_value_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));