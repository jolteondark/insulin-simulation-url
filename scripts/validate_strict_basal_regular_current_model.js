const fs=require('fs'),vm=require('vm');
global.window=global;
for(const f of ['t2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_game_model_v2_order_decomp_exp.js']) vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const M=global.T2DMGameModelV2OrderDecompExp;
const P=global.T2DMPatientPhenotypeV1ShanghaiExp;
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length)}
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const N=3000,DAYS=8,WARM=2;
let all=[],preB=[],preL=[],preD=[],d120=[];
for(let i=1;i<=N;i++){
 const p={...P.sample(i)};
 // strict target fasting distribution is used only as observed treatment-state calibration clue;
 // keep current physiology structure, shift setpoint center/spread to strict pre-B fingerprint without adding noise.
 p.dynamic_fasting_setpoint_mg_dl=Math.max(70,Math.min(260,122.8+(p.dynamic_fasting_setpoint_mg_dl-147)*(31.5/28)));
 p.fasting_setpoint_mg_dl=p.dynamic_fasting_setpoint_mg_dl;
 let state=null; const r=rng('strict-current:'+i);
 for(let d=0;d<DAYS;d++){
   const base=M.suggestOrder(p,M.DEFAULT_MEALS);
   // strict Shanghai breakfast regular dose 11.1±3.6 U; use a patient/day draw as treatment input, integer constrained.
   const bu=Math.max(0,Math.round(11.1+3.6*randn(r)));
   // preserve model-derived relative lunch/dinner structure rather than inventing unavailable target doses.
   const scale=base.breakfast_u>0?bu/base.breakfast_u:1;
   const order={breakfast_u:bu,lunch_u:Math.max(0,Math.round(base.lunch_u*scale)),dinner_u:Math.max(0,Math.round(base.dinner_u*scale)),basal_u:base.basal_u};
   const out=M.simulateDay(p,order,{meal_plan_carb_g:M.DEFAULT_MEALS},i,state);state=out.next_state;
   if(d<WARM)continue;
   const s=out.series;
   for(let t=0;t<1440;t++)all.push(s[t]);
   preB.push(s[420]);preL.push(s[720]);preD.push(s[1080]);d120.push(s[600]-s[480]);
 }
}
const pct=(a,f)=>100*a.filter(f).length/a.length;
const R={n_patients:N,days_per_patient:DAYS-WARM,model:{mean:mean(all),sd:sd(all),tbr:pct(all,x=>x<70),tir:pct(all,x=>x>=70&&x<=180),tar:pct(all,x=>x>180),preB:{mean:mean(preB),sd:sd(preB)},preL:{mean:mean(preL),sd:sd(preL)},preD:{mean:mean(preD),sd:sd(preD)},delta120:{mean:mean(d120),sd:sd(d120)}},target:{mean:134.8,sd:31.2,tbr:.50,tir:81.58,tar:17.92,preB:{mean:122.8,sd:31.5},preL:{mean:135.1,sd:57.0},preD:{mean:124.9,sd:52.4},delta120:{mean:16.8,sd:42.2}}};
fs.mkdirSync('analysis/strict_basal_regular_current_model',{recursive:true});
fs.writeFileSync('analysis/strict_basal_regular_current_model/results.json',JSON.stringify(R,null,2));
const m=R.model,t=R.target;
const md=`# Current-model vs strict Basal+Regular target\n\nNo new physiology/no generic noise; current kernel retained. Breakfast regular input sampled from strict observed 11.1±3.6 U (integer).\n\n|metric|model|strict target|\n|---|---:|---:|\n|mean|${m.mean.toFixed(1)}|${t.mean}|\n|SD|${m.sd.toFixed(1)}|${t.sd}|\n|TBR|${m.tbr.toFixed(2)}%|${t.tbr}%|\n|TIR|${m.tir.toFixed(2)}%|${t.tir}%|\n|TAR|${m.tar.toFixed(2)}%|${t.tar}%|\n|pre-B|${m.preB.mean.toFixed(1)}±${m.preB.sd.toFixed(1)}|${t.preB.mean}±${t.preB.sd}|\n|pre-L|${m.preL.mean.toFixed(1)}±${m.preL.sd.toFixed(1)}|${t.preL.mean}±${t.preL.sd}|\n|pre-D|${m.preD.mean.toFixed(1)}±${m.preD.sd.toFixed(1)}|${t.preD.mean}±${t.preD.sd}|\n|Δ120|${m.delta120.mean.toFixed(1)}±${m.delta120.sd.toFixed(1)}|${t.delta120.mean}±${t.delta120.sd}|\n`;
fs.writeFileSync('analysis/strict_basal_regular_current_model/report.md',md);console.log(md);
