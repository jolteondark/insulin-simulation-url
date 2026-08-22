#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of[
 't2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js',
 't2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_scheduled_correction_exp.js','t2dm_inpatient_course_v1_exp.js',
 't2dm_treatment_policy_diatec_poc_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js',
 'insulin_basal_potency_prior_exp.js','t2dm_counterregulation_v2_egp_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1ScheduledCorrectionExp,C=T2DMInpatientCourseV1Exp,TP=T2DMTreatmentPolicyDiatecPocExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,CR=T2DMCounterregulationV2EgpExp;
const asp=PK.get('aspart'),N=3000,DAYS=8,CORR_MIN=[180,465,765,1125,1320];
const target={age:76.1,age_sd:9.8,duration:13.1,duration_sd:8.7};
const arms=[
 {name:'current_start1',start_days:1},
 {name:'current_start2',start_days:2},
 {name:'start1_no_prandial_retitration',start_days:1,freeze_prandial_after_start:true},
 {name:'start2_no_prandial_retitration',start_days:2,freeze_prandial_after_start:true},
 {name:'start1_no_basal_retitration',start_days:1,freeze_basal:true},
 {name:'no_prandial_diagnostic',start_days:99,no_prandial:true}
];
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function solve(A,b){const n=b.length,X=A.map((r,i)=>r.slice().concat([b[i]]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(X[r][c])>Math.abs(X[p][c]))p=r;if(Math.abs(X[p][c])<1e-12)throw new Error('singular');[X[c],X[p]]=[X[p],X[c]];const q=X[c][c];for(let j=c;j<=n;j++)X[c][j]/=q;for(let r=0;r<n;r++){if(r===c)continue;const f=X[r][c];for(let j=c;j<=n;j++)X[r][j]-=f*X[c][j]}}return X.map(r=>r[n])}
function entropyWeights(xs){const k=xs[0].length;let lam=Array(k).fill(0),p=[];for(let it=0;it<60;it++){const sc=xs.map(x=>dot(lam,x)),mx=Math.max(...sc),raw=sc.map(s=>Math.exp(s-mx)),z=raw.reduce((a,b)=>a+b,0);p=raw.map(w=>w/z);const mu=Array(k).fill(0);for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)mu[j]+=p[n]*xs[n][j];if(Math.max(...mu.map(Math.abs))<1e-9)break;const cov=Array.from({length:k},()=>Array(k).fill(0));for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)for(let l=0;l<k;l++)cov[j][l]+=p[n]*(xs[n][j]-mu[j])*(xs[n][l]-mu[l]);for(let j=0;j<k;j++)cov[j][j]+=1e-6;const step=solve(cov,mu);lam=lam.map((v,j)=>v-step[j])}return p}
function wquant(v,w,q){const a=v.map((x,i)=>[x,w[i]]).sort((a,b)=>a[0]-b[0]);let c=0;for(const [x,ww] of a){c+=ww;if(c>=q)return x}return a[a.length-1][0]}
function frozenPatch(p){return{prandial_mass_action_low_side:true,prandial_mass_action_reference_mg_dl:Number(p.endogenous_insulin&&p.endogenous_insulin.glucose_threshold_mg_dl)||100,...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})}}
function copy(o){return{breakfast_u:Math.round(o.breakfast_u||0),lunch_u:Math.round(o.lunch_u||0),dinner_u:Math.round(o.dinner_u||0),basal_u:Math.round(o.basal_u||0)}}
function patient(z,arm){
 const {i,p}=z,tr=T.choose(i),o=TP.startingOrder(p),counter={corr:0};
 const titrate=(ord,bg,ctx)=>{
  const before=copy(ord),next=TP.titratePoc(before,bg,ctx,{prandial_start_days:arm.start_days});
  if(arm.no_prandial){next.breakfast_u=next.lunch_u=next.dinner_u=0;}
  if(arm.freeze_basal)next.basal_u=before.basal_u;
  if(arm.freeze_prandial_after_start){
   const was=before.breakfast_u+before.lunch_u+before.dinner_u,now=next.breakfast_u+next.lunch_u+next.dinner_u;
   if(was>0){next.breakfast_u=before.breakfast_u;next.lunch_u=before.lunch_u;next.dinner_u=before.dinner_u;}
   else if(now===0){next.breakfast_u=next.lunch_u=next.dinner_u=0;}
  }
  return next;
 };
 const cfg={days:DAYS,titrate:true,allow_meal_mismatch:false,allow_npo:false,bolus_tau_min:asp.candidate.tau_min,bolus_duration_min:asp.candidate.duration_min,titrate_order_fn:titrate,state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,i),...B.statePatch(M,.20),...frozenPatch(p),prandial_poc_min:{breakfast:465,lunch:765,dinner:1125},prandial_safety_adjustment_fn:({poc_glucose_mg_dl,planned_units})=>Number(poc_glucose_mg_dl)<70?0:planned_units,scheduled_correction_minutes:CORR_MIN,scheduled_correction_fn:({glucose_mg_dl})=>{const u=TP.supplement(glucose_mg_dl,'recommended');counter.corr+=u;return{units:u,label:'diatec_recommended'}}})};
 const c=C.simulateCourse(M,D,p,o,cfg,i),vals=[];let basal=0,pr=0,held=0;
 for(const r of c.records){basal+=r.order.basal_u;pr+=r.order.breakfast_u+r.order.lunch_u+r.order.dinner_u;for(const a of r.prandial_safety_adjustments||[])held+=Math.max(0,Number(a.planned_units)-Number(a.given_units));for(let t=0;t<1440;t+=5)vals.push(Number(r.series[t]));}
 return{tir:100*vals.filter(x=>x>=70&&x<=180).length/vals.length,tar:100*vals.filter(x=>x>180).length/vals.length,tbr:100*vals.filter(x=>x<70).length/vals.length,mean_bg:mean(vals),basal_day:basal/DAYS,prandial_day:(pr-held)/DAYS,correction_day:counter.corr/DAYS,total_day:(basal+pr-held+counter.corr)/DAYS,final_order:c.final_order};
}
const pts=[];for(let i=1;i<=N;i++){const p=P.sample(i,{preset:'support_sweep'});if(Number(p.egfr_ml_min_1_73m2)<15)continue;pts.push({i,p,x:[(Number(p.age_years)-target.age)/target.age_sd,(Number(p.duration_years)-target.duration)/target.duration_sd]})}
const w=entropyWeights(pts.map(z=>z.x)),ess=1/w.reduce((s,x)=>s+x*x,0),results=[];
for(const arm of arms){const rows=pts.map(z=>patient(z,arm)),wm=k=>rows.reduce((s,r,i)=>s+w[i]*r[k],0);results.push({...arm,summary:{tir_median:wquant(rows.map(r=>r.tir),w,.5),tar_median:wquant(rows.map(r=>r.tar),w,.5),tbr_median:wquant(rows.map(r=>r.tbr),w,.5),mean_bg:wm('mean_bg'),basal_day:wm('basal_day'),prandial_day:wm('prandial_day'),correction_day:wm('correction_day'),total_day:wm('total_day')}})}
const out={purpose:'Causal attribution of excess DIATEC simulated insulin exposure. Diagnostic ablations only; no arm is a candidate or selected by closeness to outcomes.',n:{requested:N,eligible:pts.length,ess},frozen_candidate:{mass_action_reference_mg_dl:100,cr_width_mg_dl:10,cr_reserve:1,basal_potency:.20},target_total_insulin_u_day:29.3,results,guardrails:['No frozen physiology changes.','No hidden CGM treatment input.','Ablation arms diagnose exposure sources only and must not be selected as final policy by outcome closeness.']};
const dir='analysis/diatec_treatment_exposure_ablation';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));let md=['# DIATEC treatment-exposure causal ablation','',`Eligible N=${pts.length}; ESS=${ess.toFixed(0)}.`,`Published POC total insulin anchor: 29.3 U/day.`,'','| arm | TIR median | TAR median | mean BG | basal | prandial | correction | total |','|---|---:|---:|---:|---:|---:|---:|---:|'];for(const r of results){const s=r.summary;md.push(`| ${r.name} | ${s.tir_median.toFixed(1)}% | ${s.tar_median.toFixed(1)}% | ${s.mean_bg.toFixed(1)} | ${s.basal_day.toFixed(1)} | ${s.prandial_day.toFixed(1)} | ${s.correction_day.toFixed(1)} | ${s.total_day.toFixed(1)} |`)}md.push('','Interpretation: use exposure deltas to locate treatment-context mismatch. Do not select an ablation by glycemic closeness.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
