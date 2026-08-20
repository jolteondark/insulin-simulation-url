const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1Exp;
const N=5000;
const target={mean:176.1,cv:32,tbr:4.5,tir:53.5,tar:42.2};
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length}
function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function metrics(series){const x=[];for(let i=0;i<series.length;i+=15)x.push(series[i]);const m=mean(x),s=sd(x);return{mean:m,sd:s,cv:100*s/m,tbr:100*x.filter(v=>v<70).length/x.length,tir:100*x.filter(v=>v>=70&&v<=180).length/x.length,tar:100*x.filter(v=>v>180).length/x.length}}
function hit(i,salt,pct){let x=(Math.imul((i^salt)>>>0,2654435761)>>>0)%10000;return x<pct*10000}
function pattern(i,vals,mul){return vals[(i*mul)%vals.length]}
function stateFor(i,name){
 const stress=hit(i,17,.41)?[{start_min:360,end_min:840,severity:1}]:[];
 const mildIntake={breakfast:pattern(i,[.75,1,1,1],1),lunch:pattern(i,[.75,1,1,1],3),dinner:pattern(i,[.75,1,1,1],7)};
 const mildMealShift={breakfast:pattern(i,[-30,0,30,0],1),lunch:pattern(i,[-30,0,30,0],3),dinner:pattern(i,[-30,0,30,0],7)};
 const bolusFraction={breakfast:1,lunch:1,dinner:1};
 if(hit(i,31,.25)){const k=['breakfast','lunch','dinner'][(i*5)%3];bolusFraction[k]=.5;}
 if(name==='baseline')return{};
 if(name==='stress41')return{stress_blocks:stress};
 if(name==='stress_timing')return{stress_blocks:stress,intake_fraction:mildIntake,meal_shift_min:mildMealShift};
 if(name==='stress_timing_under')return{stress_blocks:stress,intake_fraction:mildIntake,meal_shift_min:mildMealShift,bolus_fraction:bolusFraction};
 if(name==='plus_admission50_100')return{stress_blocks:stress,intake_fraction:mildIntake,meal_shift_min:mildMealShift,bolus_fraction:bolusFraction,admission_glucose_offset_mg_dl:hit(i,53,.50)?100:0};
 if(name==='plus_admission75_150')return{stress_blocks:stress,intake_fraction:mildIntake,meal_shift_min:mildMealShift,bolus_fraction:bolusFraction,admission_glucose_offset_mg_dl:hit(i,53,.75)?150:0};
 return{};
}
const names=['baseline','stress41','stress_timing','stress_timing_under','plus_admission50_100','plus_admission75_150'];
const rows=[];
for(const name of names){const mm=[];for(let i=1;i<=N;i++){const g=M.generatePatient(i),p=g.patient,order=M.suggestOrder(p);mm.push(metrics(D.simulateDay(M,p,order,stateFor(i,name),i,null).series));}const z={name};for(const k of ['mean','sd','cv','tbr','tir','tar'])z[k]=mean(mm.map(x=>x[k]));rows.push(z);}
let md=['# Dynamic inpatient-state external sensitivity sweep','',`N per scenario: **${N}**`,'','External benchmark: Emory general-ward T2DM basal-bolus CGM; mean 176.1 mg/dL, CV 32%, TBR<70 4.5%, TIR70-180 53.5%, TAR>180 42.2%.','', 'No scenario below is a calibrated or accepted parameter set. The purpose is mechanism attribution only.','', '| scenario | mean | within-day SD | CV% | TBR% | TIR% | TAR% |','|---|---:|---:|---:|---:|---:|---:|'];
for(const r of rows)md.push(`| ${r.name} | ${r.mean.toFixed(1)} | ${r.sd.toFixed(1)} | ${r.cv.toFixed(1)} | ${r.tbr.toFixed(2)} | ${r.tir.toFixed(1)} | ${r.tar.toFixed(1)} |`);
md.push('','Interpretation rule: do not tune physiology to match this table. A mechanism is retained for further study only if it moves the intended residual without creating a worse opposing residual.');
fs.mkdirSync('analysis/inpatient_dynamic_external_sweep',{recursive:true});fs.writeFileSync('analysis/inpatient_dynamic_external_sweep/report.md',md.join('\n')+'\n');fs.writeFileSync('analysis/inpatient_dynamic_external_sweep/results.json',JSON.stringify({target,rows},null,2));console.log(md.join('\n'));
