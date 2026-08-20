const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_state_v1_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const M=T2DMGameModelV2OrderDecompExp,S=T2DMInpatientStateV1Exp;
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function metrics(series){const x=[];for(let i=0;i<series.length;i+=15)x.push(series[i]);const m=mean(x),s=sd(x);return{mean:m,sd:s,cv:100*s/m,tbr:100*x.filter(v=>v<70).length/x.length,tir:100*x.filter(v=>v>=70&&v<=180).length/x.length,tar:100*x.filter(v=>v>180).length/x.length}}
const scenarios=[
 {name:'baseline',stress_prev:0,stress:0,intake:false},
 {name:'stress41_s05',stress_prev:.41,stress:.5,intake:false},
 {name:'stress41_s10',stress_prev:.41,stress:1,intake:false},
 {name:'stress41_s05_intake',stress_prev:.41,stress:.5,intake:true},
 {name:'stress41_s10_intake',stress_prev:.41,stress:1,intake:true}
];
const N=5000;
let out=[];
for(const sc of scenarios){let patient=[];for(let i=1;i<=N;i++){
 const g=M.generatePatient(i),p=g.patient,order=M.suggestOrder(p);
 const stressed=((i*2654435761>>>0)%10000)<sc.stress_prev*10000;
 let intake={breakfast:1,lunch:1,dinner:1};
 if(sc.intake){const vals=[.5,.75,1,1];intake={breakfast:vals[i%4],lunch:vals[(i*3)%4],dinner:vals[(i*7)%4]};}
 const state={acute_stress:stressed,stress_severity:stressed?sc.stress:0,intake_fraction:intake};
 const r=S.simulateDay(M,p,order,state,i,null);patient.push(metrics(r.series));
 }
 const z={name:sc.name};for(const k of ['mean','sd','cv','tbr','tir','tar'])z[k]=mean(patient.map(x=>x[k]));out.push(z);
}
const target={mean:176.1,cv:32,tbr:4.5,tir:53.5,tar:42.2};
let md=['# Inpatient state external sensitivity sweep','',`N per scenario: ${N}`,'','Emory external target: mean 176.1 mg/dL; CV 32%; TBR<70 4.5%; TIR70-180 53.5%; TAR>180 42.2%.','', '| scenario | mean | within-day SD | CV% | TBR% | TIR% | TAR% |','|---|---:|---:|---:|---:|---:|---:|'];
for(const x of out)md.push(`| ${x.name} | ${x.mean.toFixed(1)} | ${x.sd.toFixed(1)} | ${x.cv.toFixed(1)} | ${x.tbr.toFixed(2)} | ${x.tir.toFixed(1)} | ${x.tar.toFixed(1)} |`);
md.push('','Interpretation: exploratory mechanism sensitivity only; no scenario is a fitted parameter set.');
fs.mkdirSync('analysis/inpatient_state_external_sweep',{recursive:true});fs.writeFileSync('analysis/inpatient_state_external_sweep/report.md',md.join('\n')+'\n');fs.writeFileSync('analysis/inpatient_state_external_sweep/results.json',JSON.stringify({target,scenarios:out},null,2));console.log(md.join('\n'));
