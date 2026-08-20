const fs=require('fs'),vm=require('vm');
function load(path){const src=fs.readFileSync(path,'utf8');vm.runInThisContext('var window=globalThis;'+src,{filename:path});}
load('t2dm_patient_phenotype_v0.js');load('t2dm_game_model_v0.js');
const N=Number(process.env.N||500), vals=[],fpg=[],bmi=[],beta=[],sir=[],hep=[],safe={safe:0,low:0,high:0};
for(let i=0;i<N;i++){
 const seed=1200001+i*7919,g=T2DMGameModelV0.generatePatient(seed),p=g.patient,o=T2DMGameModelV0.suggestOrder(p),r=T2DMGameModelV0.simulateDay(p,o,{},seed,null);
 for(const x of r.series)vals.push(x);fpg.push(p.fasting_setpoint_mg_dl);bmi.push(p.bmi_kg_m2);beta.push(p.beta_cell_reserve);sir.push(p.si_relative);hep.push(p.hepatic_ir);
 if(r.min<70)safe.low++;else if(r.max>400)safe.high++;else safe.safe++;
}
function avg(a){return a.reduce((s,x)=>s+x,0)/a.length}function sd(a){const m=avg(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
const out={N,phenotype:{bmi_mean:avg(bmi),bmi_sd:sd(bmi),fpg_mean:avg(fpg),fpg_sd:sd(fpg),beta_mean:avg(beta),beta_sd:sd(beta),si_relative_mean:avg(sir),hepatic_ir_mean:avg(hep)},glucose:{mean:avg(vals),sd:sd(vals),tir:100*vals.filter(x=>x>=70&&x<=180).length/vals.length,tbr:100*vals.filter(x=>x<70).length/vals.length,tar:100*vals.filter(x=>x>180).length/vals.length},day:{safe_pct:100*safe.safe/N,low_pct:100*safe.low/N,high_pct:100*safe.high/N}};
fs.writeFileSync('t2dm_v0_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));