const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const M=global.T2DMGameModelV2OrderDecompExp;
const N=5000;
const patient=[]; let pooled={n:0,sum:0,sum2:0,tbr:0,tbr54:0,tir:0,tar:0,tar250:0};
function pct(n,d){return 100*n/d}
for(let i=1;i<=N;i++){
 const x=M.generatePatient(i), p=x.patient, o=M.suggestOrder(p), d=M.simulateDay(p,o,{},i,null), g=d.series;
 let s=0,s2=0,b70=0,b54=0,ir=0,a180=0,a250=0,n=0;
 // sample every 15 min to match CGM cadence; include 00:00 through 23:45
 for(let t=0;t<1440;t+=15){const v=g[t];n++;s+=v;s2+=v*v;if(v<70)b70++;if(v<54)b54++;if(v>=70&&v<=180)ir++;if(v>180)a180++;if(v>250)a250++;}
 const mean=s/n, sd=Math.sqrt(Math.max(0,s2/n-mean*mean));
 patient.push({mean,sd,tbr:pct(b70,n),tbr54:pct(b54,n),tir:pct(ir,n),tar:pct(a180,n),tar250:pct(a250,n)});
 pooled.n+=n;pooled.sum+=s;pooled.sum2+=s2;pooled.tbr+=b70;pooled.tbr54+=b54;pooled.tir+=ir;pooled.tar+=a180;pooled.tar250+=a250;
}
function mean(k){return patient.reduce((a,x)=>a+x[k],0)/patient.length}
function sd(k){const m=mean(k);return Math.sqrt(patient.reduce((a,x)=>a+(x[k]-m)**2,0)/(patient.length-1))}
const pm=pooled.sum/pooled.n, psd=Math.sqrt(pooled.sum2/pooled.n-pm*pm);
const target={mean:176.1,sd_patient_mean:46.9,tir:53.5,tbr:4.5,tbr54:1.58,tar:42.2,tar250:16.1,cv:32.0};
const out=[];
out.push('# External validation: Emory inpatient T2DM basal-bolus CGM');
out.push('');out.push('Frozen Shanghai model. No parameter was changed for this comparison.');out.push('');
out.push(`Generated patients: **${N}**; one simulated day each; metrics sampled every 15 min.`);out.push('');
out.push('| Metric | Frozen model patient mean ± SD | Emory CGM target |');out.push('|---|---:|---:|');
for(const [k,label] of [['mean','Mean glucose (mg/dL)'],['tir','TIR 70-180 (%)'],['tbr','TBR <70 (%)'],['tbr54','TBR <54 (%)'],['tar','TAR >180 (%)'],['tar250','TAR >250 (%)']])out.push(`| ${label} | ${mean(k).toFixed(2)} ± ${sd(k).toFixed(2)} | ${target[k]} |`);
out.push(`| Within-day SD (mg/dL) | ${mean('sd').toFixed(2)} ± ${sd('sd').toFixed(2)} | not directly reported |`);
out.push(`| CV (%) | ${(100*mean('sd')/mean('mean')).toFixed(2)} | ${target.cv} |`);
out.push('');out.push('## Pooled generated CGM');
out.push(`- mean ${pm.toFixed(2)} mg/dL; SD ${psd.toFixed(2)} mg/dL`);
out.push(`- TBR<70 ${pct(pooled.tbr,pooled.n).toFixed(2)}%; TBR<54 ${pct(pooled.tbr54,pooled.n).toFixed(2)}%; TIR ${pct(pooled.tir,pooled.n).toFixed(2)}%; TAR>180 ${pct(pooled.tar,pooled.n).toFixed(2)}%; TAR>250 ${pct(pooled.tar250,pooled.n).toFixed(2)}%`);
out.push('');out.push('## Source target');
out.push('- Galindo RJ et al., Diabetes Care 2020; hospitalized adults with T2DM treated with basal-bolus insulin, FreeStyle Libre Pro CGM.');
out.push('- CGM: mean daily glucose 176.1 ± 46.9 mg/dL; TIR 53.5 ± 25.8%; TAR>180 42.2 ± 27.7%; TAR>250 16.1 ± 20.2%; TBR<70 4.5 ± 6.9%; TBR<54 1.58 ± 3.3%; CV ~32%.');
fs.mkdirSync('analysis/external_emory_basal_bolus',{recursive:true});
fs.writeFileSync('analysis/external_emory_basal_bolus/report.md',out.join('\n')+'\n');
console.log(out.join('\n'));
