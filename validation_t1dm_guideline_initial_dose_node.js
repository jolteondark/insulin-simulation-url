const fs=require('fs'),vm=require('vm');
function load(path){const src=fs.readFileSync(path,'utf8');vm.runInThisContext('var window=globalThis;'+src,{filename:path});}
load('patient_generator.js');load('patient_phenotype_v2.js');load('clinical_modifiers_v2.js');load('t1dm_game_model_v2.js');
const N=Number(process.env.N||500), MEALS={breakfast:50,lunch:70,dinner:60}, CARB_TOTAL=180;
function guidelineOrder(p,ukg){const tdd=ukg*p.body_weight_kg, basal=Math.round(.5*tdd), nut=.5*tdd;return{breakfast_u:Math.max(0,Math.round(nut*MEALS.breakfast/CARB_TOTAL)),lunch_u:Math.max(0,Math.round(nut*MEALS.lunch/CARB_TOTAL)),dinner_u:Math.max(0,Math.round(nut*MEALS.dinner/CARB_TOTAL)),basal_u:Math.max(0,basal)};}
function classify(r){return r.min<70?'low':r.max>400?'high':'safe'}
const doses=[.3,.4,.5,.6],out={N,protocol:{source:'ADA 2026 inpatient usual starting TDD 0.3-0.6 U/kg/day; 50% basal, 50% nutritional; standard meals 50/70/60 g; no correction insulin',timing_sd_min:15,intake_fraction:1},doses:{}};
for(const d of doses)out.doses[d]={safe:0,low:0,high:0,mean:0,sd:0,tir:0,tbr:0,tar:0,mins:[],maxs:[],means:[],all:[],orders:[]};
for(let i=0;i<N;i++){
 const seed=900001+i*7919;
 for(const d of doses){const game=T1DMGameModelV2.generatePatient(seed),o=guidelineOrder(game.patient,d),r=T1DMGameModelV2.simulateDay(game.patient,o,{meal_plan_carb_g:MEALS,intake_fraction:{breakfast:1,lunch:1,dinner:1},meal_timing_sd_min:15,bolus_timing_sd_min:15,poc_timing_sd_min:15},(seed^0xBADC0DE)>>>0,null),x=out.doses[d],k=classify(r);x[k]++;x.mins.push(r.min);x.maxs.push(r.max);x.orders.push(o);let s=0;for(const g of r.series){s+=g;x.all.push(g)}x.means.push(s/r.series.length);}
}
function avg(a){return a.reduce((x,y)=>x+y,0)/a.length}function sd(a,m=avg(a)){return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
for(const d of doses){const x=out.doses[d],m=avg(x.all),n=x.all.length;x.safe_pct=100*x.safe/N;x.low_pct=100*x.low/N;x.high_pct=100*x.high/N;x.mean=m;x.sd=sd(x.all,m);x.tir=100*x.all.filter(v=>v>=70&&v<=180).length/n;x.tbr=100*x.all.filter(v=>v<70).length/n;x.tar=100*x.all.filter(v=>v>180).length/n;x.mean_min=avg(x.mins);x.mean_max=avg(x.maxs);x.mean_order={breakfast_u:avg(x.orders.map(o=>o.breakfast_u)),lunch_u:avg(x.orders.map(o=>o.lunch_u)),dinner_u:avg(x.orders.map(o=>o.dinner_u)),basal_u:avg(x.orders.map(o=>o.basal_u))};delete x.mins;delete x.maxs;delete x.means;delete x.all;delete x.orders;}
fs.writeFileSync('t1dm_guideline_initial_dose_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));