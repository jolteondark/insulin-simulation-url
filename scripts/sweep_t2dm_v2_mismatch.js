global.window=global;
const fs=require('fs');
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js']) eval(fs.readFileSync(f,'utf8'));
const M=T2DMGameModelV2OrderDecompExp,P=T2DMPatientPhenotypeV2Shanghai106Exp;
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(seed){const r=rng(seed);let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function lnorm1(sd,z){return Math.exp(-0.5*sd*sd+sd*z)}
function metrics(xs){const n=xs.length,m=xs.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/n);return{n,mean:m,sd,tbr:100*xs.filter(x=>x<70).length/n,tir:100*xs.filter(x=>x>=70&&x<=180).length/n,tar:100*xs.filter(x=>x>180).length/n}}
const TARGET={mean:138.9854,sd:49.6216,tbr:2.3155,tir:79.5993,tar:18.0852};
const orderSigmas=[0,.10,.20,.30,.40,.50],siSigmas=[0,.05,.10,.15,.20,.25,.30];
const out=[];
for(const os of orderSigmas) for(const ss of siSigmas){
 let all=[],slots={pre_breakfast:[],pre_lunch:[],pre_dinner:[],bedtime:[]};
 for(let i=1;i<=300;i++){
  const base=P.sample(i); let state=null;
  for(let d=0;d<5;d++){
   const p={...base,si_relative:Math.max(.2,Math.min(2,base.si_relative*lnorm1(ss,randn(`si:${i}:${d}`))))};
   const ideal=M.suggestOrder(p);
   const ord={...ideal};
   for(const k of ['breakfast_u','lunch_u','dinner_u']) ord[k]=Math.max(0,Math.round(ideal[k]*lnorm1(os,randn(`ord:${k}:${i}:${d}`))));
   const r=M.simulateDay(p,ord,{},i*100+d,state); state=r.next_state;
   all.push(...r.series); for(const k in slots)slots[k].push(r.bg[k]);
  }
 }
 const m=metrics(all); const score=((m.mean-TARGET.mean)/5)**2+((m.sd-TARGET.sd)/5)**2+((m.tbr-TARGET.tbr)/1.5)**2+((m.tar-TARGET.tar)/4)**2;
 out.push({order_sigma:os,si_sigma:ss,score,...m,slots:Object.fromEntries(Object.entries(slots).map(([k,v])=>[k,metrics(v)]))});
}
out.sort((a,b)=>a.score-b.score);
fs.mkdirSync('analysis_out',{recursive:true});fs.writeFileSync('analysis_out/t2dm_v2_mismatch_sweep.json',JSON.stringify({target:TARGET,best:out.slice(0,12),all:out},null,2));
console.log(JSON.stringify(out.slice(0,12),null,2));
// trigger marker 2026-08-20T12:44+09:00
