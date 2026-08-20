const fs=require('fs'),vm=require('vm');
global.window=global;
const files=fs.readdirSync('.').filter(x=>x.endsWith('.js'));
for(const f of files){
 const s=fs.readFileSync(f,'utf8');
 if(s.includes('window.T2DMPatientPhenotypeV1ShanghaiExp=')){vm.runInThisContext(s,{filename:f});break;}
}
if(!global.T2DMPatientPhenotypeV1ShanghaiExp)throw new Error('v1 phenotype not found');
vm.runInThisContext(fs.readFileSync('t2dm_patient_phenotype_v2_shanghai106_exp.js','utf8'));
vm.runInThisContext(fs.readFileSync('t2dm_game_model_v2_order_decomp_exp.js','utf8'));
const M=global.T2DMGameModelV2OrderDecompExp,P=global.T2DMPatientPhenotypeV2Shanghai106Exp;
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
function q(a,p){const x=[...a].sort((a,b)=>a-b),i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return x[l]+(x[h]-x[l])*(i-l)}
const rows=[];
for(let i=1;i<=20000;i++){
 const p=P.sample(i),o=M.suggestOrder(p),w=p.body_weight_kg;
 const pr=o.breakfast_u+o.lunch_u+o.dinner_u,tdd=pr+o.basal_u;
 rows.push({w,tddkg:tdd/w,basalkg:o.basal_u/w,prkg:pr/w,b:o.breakfast_u,l:o.lunch_u,d:o.dinner_u,tdd});
}
const target=[
 {session:'2021_0_20211013',weight:47.5,tddkg:19.3333333333/47.5},
 {session:'2025_0_20210506',weight:69,tddkg:54/69},
 {session:'2035_0_20210629',weight:67,tddkg:41/67},
 {session:'2074_0_20210707',weight:85,tddkg:42.9166666667/85}
];
const a=rows.map(r=>r.tddkg),ba=rows.map(r=>r.basalkg),pa=rows.map(r=>r.prkg),ta=target.map(r=>r.tddkg);
const md=[];
md.push('# T2DM v2 insulin requirement scale validation','');
md.push('## Current model suggested orders (n=20,000 generated patients)');
md.push(`- TDD/kg: ${mean(a).toFixed(3)} ± ${sd(a).toFixed(3)} U/kg/day; p05 ${q(a,.05).toFixed(3)}, median ${q(a,.5).toFixed(3)}, p95 ${q(a,.95).toFixed(3)}`);
md.push(`- basal/kg: ${mean(ba).toFixed(3)} ± ${sd(ba).toFixed(3)}`);
md.push(`- prandial/kg: ${mean(pa).toFixed(3)} ± ${sd(pa).toFixed(3)}`);
md.push('','## Shanghai strict Basal+Regular session-equal target (4 sessions)');
for(const x of target)md.push(`- ${x.session}: ${x.tddkg.toFixed(3)} U/kg/day`);
md.push(`- session-equal mean: ${mean(ta).toFixed(3)} ± ${sd(ta).toFixed(3)} U/kg/day`);
md.push('','## Interpretation');
const ratio=mean(a)/mean(ta);
md.push(`- model/target mean TDD/kg ratio: ${ratio.toFixed(3)}`);
md.push('- Target is a calibration clue only: n=4 sessions, treatment evolved during admission, and observed TDD may include correction dosing.');
fs.mkdirSync('analysis/t2dm_v2_tdd_per_kg',{recursive:true});
fs.writeFileSync('analysis/t2dm_v2_tdd_per_kg/report.md',md.join('\n')+'\n');
fs.writeFileSync('analysis/t2dm_v2_tdd_per_kg/results.json',JSON.stringify({model:{n:rows.length,tddkg_mean:mean(a),tddkg_sd:sd(a),tddkg_p05:q(a,.05),tddkg_median:q(a,.5),tddkg_p95:q(a,.95),basalkg_mean:mean(ba),prandialkg_mean:mean(pa)},target:{sessions:target,mean:mean(ta),sd:sd(ta)},model_target_ratio:ratio},null,2));
console.log(md.join('\n'));
