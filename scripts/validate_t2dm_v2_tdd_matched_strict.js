const fs=require('fs'),vm=require('vm');
global.window=global;
vm.runInThisContext(fs.readFileSync('t2dm_patient_phenotype_v1_shanghai_exp.js','utf8'));
vm.runInThisContext(fs.readFileSync('t2dm_patient_phenotype_v2_shanghai106_exp.js','utf8'));
vm.runInThisContext(fs.readFileSync('t2dm_game_model_v2_order_decomp_exp.js','utf8'));
const P=global.T2DMPatientPhenotypeV2Shanghai106Exp,M=global.T2DMGameModelV2OrderDecompExp;
const SCALE={age:13.71,bmi:3.255,dur:8.454,cpep:0.2811};
const targets=[
 {id:'2021_0_20211013',age:78,bmi:19.0274,dur:16,cpep:.16,w:47.5,basalkg:(6+6+7)/3/47.5,prkg:(10+11+18)/3/47.5},
 {id:'2025_0_20210506',age:63,bmi:21.7776,dur:20,cpep:.42,w:69,basalkg:18/69,prkg:36/69},
 {id:'2035_0_20210629',age:78,bmi:24.3141,dur:20,cpep:.48,w:67,basalkg:16/67,prkg:25/67},
 {id:'2074_0_20210707',age:31,bmi:26.2346,dur:.58,cpep:.72,w:85,basalkg:14.5/85,prkg:(341/12)/85}
];
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
const pool=[];
for(let i=1;i<=100000;i++){
 const p=P.sample(i),o=M.suggestOrder(p),w=p.body_weight_kg,pr=o.breakfast_u+o.lunch_u+o.dinner_u;
 pool.push({seed:i,p,o,basalkg:o.basal_u/w,prkg:pr/w,tddkg:(pr+o.basal_u)/w});
}
function dist(x,t){const p=x.p;return Math.sqrt(((p.age_years-t.age)/SCALE.age)**2+((p.bmi_kg_m2-t.bmi)/SCALE.bmi)**2+((p.duration_years-t.dur)/SCALE.dur)**2+((p.fasting_c_peptide_nmol_l-t.cpep)/SCALE.cpep)**2)}
const out=[];let md=['# T2DM v2 strict-phenotype matched insulin requirement','', 'Nearest-neighbour matching on age, BMI, diabetes duration, and fasting C-peptide; 500 generated neighbours per strict session from 100,000 generated patients.',''];
for(const t of targets){
 const near=pool.map(x=>[dist(x,t),x]).sort((a,b)=>a[0]-b[0]).slice(0,500).map(z=>z[1]);
 const b=near.map(x=>x.basalkg),pr=near.map(x=>x.prkg),tt=near.map(x=>x.tddkg);
 const r={id:t.id,target_basalkg:t.basalkg,target_prkg:t.prkg,target_tddkg:t.basalkg+t.prkg,model_basalkg:mean(b),model_basalkg_sd:sd(b),model_prkg:mean(pr),model_prkg_sd:sd(pr),model_tddkg:mean(tt),model_tddkg_sd:sd(tt)};out.push(r);
 md.push(`## ${t.id}`);
 md.push(`- target basal/prandial/TDD: ${r.target_basalkg.toFixed(3)} / ${r.target_prkg.toFixed(3)} / ${r.target_tddkg.toFixed(3)} U/kg/day`);
 md.push(`- matched model basal/prandial/TDD: ${r.model_basalkg.toFixed(3)}±${r.model_basalkg_sd.toFixed(3)} / ${r.model_prkg.toFixed(3)}±${r.model_prkg_sd.toFixed(3)} / ${r.model_tddkg.toFixed(3)}±${r.model_tddkg_sd.toFixed(3)}`);
 md.push(`- prandial model/target ratio: ${(r.model_prkg/r.target_prkg).toFixed(3)}`,'');
}
const mb=mean(out.map(x=>x.model_basalkg)),mp=mean(out.map(x=>x.model_prkg)),mt=mean(out.map(x=>x.model_tddkg));const tb=mean(out.map(x=>x.target_basalkg)),tp=mean(out.map(x=>x.target_prkg)),tt=mean(out.map(x=>x.target_tddkg));
md.push('## Session-equal summary');
md.push(`- target basal/prandial/TDD: ${tb.toFixed(3)} / ${tp.toFixed(3)} / ${tt.toFixed(3)}`);
md.push(`- matched model basal/prandial/TDD: ${mb.toFixed(3)} / ${mp.toFixed(3)} / ${mt.toFixed(3)}`);
md.push(`- matched model/target ratios: basal ${(mb/tb).toFixed(3)}, prandial ${(mp/tp).toFixed(3)}, TDD ${(mt/tt).toFixed(3)}`);
md.push('','Caution: n=4 observed sessions; matching controls phenotype selection better than an unconditional comparison but does not identify true carbohydrate intake or correction-dose policy.');
fs.mkdirSync('analysis/t2dm_v2_tdd_matched_strict',{recursive:true});fs.writeFileSync('analysis/t2dm_v2_tdd_matched_strict/report.md',md.join('\n')+'\n');fs.writeFileSync('analysis/t2dm_v2_tdd_matched_strict/results.json',JSON.stringify(out,null,2));console.log(md.join('\n'));
