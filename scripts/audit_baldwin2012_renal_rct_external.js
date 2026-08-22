#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of [
 't2dm_patient_phenotype_v1_shanghai_exp.js',
 't2dm_patient_phenotype_v2_shanghai106_exp.js',
 't2dm_patient_phenotype_v3_inpatient_mix_exp.js',
 't2dm_game_model_v2_order_decomp_exp.js',
 't2dm_inpatient_dynamic_v1_poc_safety_exp.js',
 't2dm_inpatient_course_v1_exp.js',
 't2dm_treatment_policy_baldwin_renal_rct_exp.js',
 'insulin_prandial_pk_prior_ranges_exp.js',
 't2dm_inpatient_trajectory_v1_exp.js',
 'insulin_basal_potency_prior_exp.js',
 't2dm_counterregulation_v2_egp_exp.js',
 't2dm_renal_insulin_modifier_v1_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});

const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,
 D=T2DMInpatientDynamicV1PocSafetyExp,C=T2DMInpatientCourseV1Exp,
 BP=T2DMTreatmentPolicyBaldwinRenalRctExp,PK=InsulinPrandialPkPriorRangesExp,
 T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,
 CR=T2DMCounterregulationV2EgpExp,R=T2DMRenalInsulinModifierV1Exp;

const gp=PK.get('glulisine'),REQUESTED_N=18000;
const POC=[420,720,1080,1260];
// Pooled baseline from randomized arms; outcomes are never used in baseline weighting.
const target={age:64.45,age_sd:11.9,weight:91.80,weight_sd:26.2,egfr:29.97,egfr_sd:9.2,duration:17.53,duration_sd:9.4};
const published={
 high:{n:50,ukg:.50,day1_mean:196.1,days2_6_mean:174.0,any70_pct:30.0,any50_pct:6.0,fasting:151.9,prelunch:193.0,predinner:169.9,bedtime:181.5,target_day1_pct:30,target_last_pct:46,tdd:[33.4,38.6,40.3,39.5,39.9,36.1],basal_day1:21.4,basal_day6:23.6},
 low:{n:57,ukg:.25,day1_mean:196.9,days2_6_mean:174.5,any70_pct:15.8,any50_pct:1.8,fasting:155.1,prelunch:189.2,predinner:184.7,bedtime:178.4,target_day1_pct:33,target_last_pct:56,tdd:[21.1,27.3,30.6,26.7,23.9,33.7],basal_day1:13.1,basal_day6:17.3}
};
const ARMS=[
 {name:'high_0.50_renal_off',dose:'high',renal:false},
 {name:'low_0.25_renal_off',dose:'low',renal:false},
 {name:'high_0.50_renal_on',dose:'high',renal:true},
 {name:'low_0.25_renal_on',dose:'low',renal:true}
];
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function solve(A,b){const n=b.length,X=A.map((r,i)=>r.slice().concat([b[i]]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(X[r][c])>Math.abs(X[p][c]))p=r;if(Math.abs(X[p][c])<1e-12)throw new Error('singular');[X[c],X[p]]=[X[p],X[c]];const q=X[c][c];for(let j=c;j<=n;j++)X[c][j]/=q;for(let r=0;r<n;r++){if(r===c)continue;const f=X[r][c];for(let j=c;j<=n;j++)X[r][j]-=f*X[c][j];}}return X.map(r=>r[n])}
function entropyWeights(xs){
 const k=xs[0].length;let lam=Array(k).fill(0),p=[];
 for(let it=0;it<80;it++){
  const sc=xs.map(x=>dot(lam,x)),mx=Math.max(...sc),raw=sc.map(s=>Math.exp(Math.max(-700,s-mx))),z=raw.reduce((a,b)=>a+b,0);p=raw.map(w=>w/z);
  const mu=Array(k).fill(0);for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)mu[j]+=p[n]*xs[n][j];
  if(Math.max(...mu.map(Math.abs))<1e-8)break;
  const cov=Array.from({length:k},()=>Array(k).fill(0));for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)for(let l=0;l<k;l++)cov[j][l]+=p[n]*(xs[n][j]-mu[j])*(xs[n][l]-mu[l]);
  for(let j=0;j<k;j++)cov[j][j]+=1e-5;
  let step;try{step=solve(cov,mu)}catch{break}
  lam=lam.map((v,j)=>v-step[j]);if(lam.some(x=>!Number.isFinite(x))){lam=Array(k).fill(0);break}
 }
 if(!p.length||p.some(x=>!Number.isFinite(x))){p=Array(xs.length).fill(1/xs.length)}
 return{p,lambda:lam};
}
function frozenPatch(p,renal){
 const s={prandial_mass_action_low_side:true,prandial_mass_action_reference_mg_dl:Number(p.endogenous_insulin&&p.endogenous_insulin.glucose_threshold_mg_dl)||100,...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})};
 if(renal)s.insulin_exposure_multiplier=R.exposureMultiplier(p);
 return s;
}
function correctionPatch(ctx){
 const afterMealShift={breakfast:25,lunch:25,dinner:25}; // default model bolus is -15 min; +25 => +10 min after meal, midpoint of protocol 0-20 min.
 return{
  bolus_shift_min:afterMealShift,
  prandial_safety_adjustment_fn:({poc_glucose_mg_dl,planned_units,order_u})=>BP.mealDose({poc_glucose_mg_dl,planned_units,order_u}),
  bedtime_correction_fn:({glucose_mg_dl,order_u})=>BP.bedtimeDose({glucose_mg_dl,order_u})
 };
}
function simulatePatient(z,arm){
 const p=z.p,pub=published[arm.dose],o=BP.startingOrder(p,pub.ukg),tr=T.choose(z.i);
 const initialOffset=Math.max(0,Number(p.observed_fasting_glucose_mg_dl)-Number(p.dynamic_fasting_setpoint_mg_dl));
 const cfg={days:6,titrate:true,allow_meal_mismatch:false,allow_npo:false,admission_glucose_offset_mg_dl:initialOffset,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,
  titrate_order_fn:(ord,bg)=>BP.titrateProportionally(ord,bg),
  state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,z.i),...B.statePatch(M,.20),...frozenPatch(p,arm.renal),...correctionPatch(ctx)})
 };
 const c=C.simulateCourse(M,D,p,o,cfg,z.i),dayMeans=[],allPoc=[],byTime=[[],[],[],[]],tdd=[],basal=[],targetPct=[];
 let any70=0,any50=0;
 for(const r of c.records){
  const vals=POC.map(t=>Number(r.series[t]));dayMeans.push(mean(vals));for(let j=0;j<vals.length;j++){allPoc.push(vals[j]);byTime[j].push(vals[j]);if(vals[j]<70)any70=1;if(vals[j]<50)any50=1;}
  const extraMeal=(r.prandial_safety_adjustments||[]).reduce((s,x)=>s+(Number(x.given_units)||0)-(Number(x.planned_units)||0),0);
  const extraBed=(r.bedtime_corrections||[]).reduce((s,x)=>s+(Number(x.units)||0),0);
  const scheduled=BP.scheduledTdd(r.order);tdd.push(scheduled+extraMeal+extraBed);basal.push(r.order.basal_u);targetPct.push(100*vals.filter(x=>x>=100&&x<=180).length/vals.length);
 }
 return{day1_mean:dayMeans[0],days2_6_mean:mean(dayMeans.slice(1)),all_mean:mean(allPoc),any70,any50,fasting:mean(byTime[0]),prelunch:mean(byTime[1]),predinner:mean(byTime[2]),bedtime:mean(byTime[3]),target_day1_pct:targetPct[0],target_last_pct:targetPct[targetPct.length-1],tdd,basal,initial_scheduled_tdd:BP.scheduledTdd(o),renal_exposure:R.exposureMultiplier(p)};
}
function summarize(rows,w){
 const wm=k=>rows.reduce((s,r,i)=>s+w[i]*r[k],0),dayArr=k=>Array.from({length:6},(_,d)=>rows.reduce((s,r,i)=>s+w[i]*r[k][d],0));
 return{day1_mean:wm('day1_mean'),days2_6_mean:wm('days2_6_mean'),all_mean:wm('all_mean'),any70_pct:100*wm('any70'),any50_pct:100*wm('any50'),fasting:wm('fasting'),prelunch:wm('prelunch'),predinner:wm('predinner'),bedtime:wm('bedtime'),target_day1_pct:wm('target_day1_pct'),target_last_pct:wm('target_last_pct'),tdd:dayArr('tdd'),basal:dayArr('basal'),initial_scheduled_tdd:wm('initial_scheduled_tdd'),renal_exposure:wm('renal_exposure')};
}
const pts=[];
for(let i=1;i<=REQUESTED_N;i++){
 const p=P.sample(i,{preset:'support_sweep'}),egfr=Number(p.egfr_ml_min_1_73m2),dur=Number(p.duration_years),obs=Number(p.observed_fasting_glucose_mg_dl);
 if(!(egfr<=45&&egfr>=8&&dur>1&&obs>180))continue;
 pts.push({i,p,x:[(p.age_years-target.age)/target.age_sd,(p.body_weight_kg-target.weight)/target.weight_sd,(egfr-target.egfr)/target.egfr_sd,(dur-target.duration)/target.duration_sd]});
}
if(pts.length<100)throw new Error('Insufficient eligible renal phenotype support: '+pts.length);
const ew=entropyWeights(pts.map(z=>z.x)),w=ew.p,ess=1/w.reduce((s,x)=>s+x*x,0);
function weightedBaseline(){const keys={age:z=>z.p.age_years,weight:z=>z.p.body_weight_kg,egfr:z=>z.p.egfr_ml_min_1_73m2,duration:z=>z.p.duration_years,observed_fasting:z=>z.p.observed_fasting_glucose_mg_dl,si:z=>z.p.si_relative};const o={};for(const [k,fn] of Object.entries(keys))o[k]=pts.reduce((s,z,i)=>s+w[i]*fn(z),0);return o}
const results=[];
for(const arm of ARMS){const rows=pts.map(z=>simulatePatient(z,arm));results.push({...arm,summary:summarize(rows,w)});}
function paired(renal){const hi=results.find(x=>x.renal===renal&&x.dose==='high').summary,lo=results.find(x=>x.renal===renal&&x.dose==='low').summary;return{renal,delta_days2_6_high_minus_low:hi.days2_6_mean-lo.days2_6_mean,hypo_ratio_low_over_high:hi.any70_pct>0?lo.any70_pct/hi.any70_pct:NaN,severe_ratio_low_over_high:hi.any50_pct>0?lo.any50_pct/hi.any50_pct:NaN,lower_dose_reduces_hypoglycemia:lo.any70_pct<hi.any70_pct,near_equivalent_mean_bg:Math.abs(hi.days2_6_mean-lo.days2_6_mean)<20};}
const out={
 purpose:'Independent renal-specific external validation of the pre-existing optional renal insulin-exposure modifier using Baldwin et al. 2012. The modifier is tested only at its frozen off/on states; no renal multiplier, physiology, PK, phenotype weight, meal gain, or counterregulation parameter is swept or fitted to trial outcomes.',
 source:{citation:'Baldwin D et al. Diabetes Care. 2012;35(10):1970-1974. doi:10.2337/dc12-0578',protocol:'Main article plus official Supplementary Data; Supplementary Data controls where more detailed.'},
 frozen_candidate:{mass_action_reference_mg_dl:100,cr_width_mg_dl:10,cr_reserve:1,basal_potency:.20,renal_modifier:'existing V1 1.00/1.05/1.10/1.15/1.20 by eGFR; OFF vs ON only'},
 n:{requested:REQUESTED_N,eligible:pts.length,effective_sample_size:ess},baseline_target:target,baseline_matched:weightedBaseline(),
 eligibility_mapping:'Generated support restricted to age>18, diabetes duration>1 y, eGFR<=45 and >8, and observed fasting glucose>180 mg/dL. Dialysis/transplant/steroid/hypopituitarism/adrenal failure/hypoglycemia-unawareness/severe-liver exclusions are not all explicitly represented by the generator.',
 treatment_mapping:{start:'0.50 vs 0.25 U/kg/day; 50% glargine and 50% glulisine across three meals',meal_timing:'protocol 0-20 min after meal after confirming >=half meal; simulator maps to fixed +10 min midpoint',correction:'official supplement TDD-stratified scale beginning 120 mg/dL; bedtime only >170 at 50% scale',titration:'fasting <100 -> -20%; 100-140 unchanged; 140-180 -> +10%; >180 -> +20%, increases only without prior-day POC hypoglycemia; all scheduled components move proportionately',nutrition:'full-meal primary mapping because trial does not publish meal-intake frequency; no NPO stochasticity',hypoglycemia_rescue:'not explicitly specified in trial protocol and therefore not simulated; outcome is four-point POC hypoglycemia',integer_constraint:'external engine rounds scheduled and correction injections to integer units; protocol half-scale bedtime corrections may mathematically yield half-units'},
 published,arms:results,paired:[paired(false),paired(true)],
 guardrails:['Do not tune the renal exposure multiplier magnitude to this trial.','Use this trial to accept/reject or keep uncertain the already-prespecified renal modifier, not to create a new eGFR curve.','Dose trajectory is a treatment-context check: if simulated administered insulin materially departs from reported daily TDD, classify absolute glycemic mismatch as treatment-context sensitive.','Baseline entropy weighting uses age, weight, eGFR, and diabetes duration only; no glycemic outcome enters the weights.','Do not alter mass-action100, CR V2 width10/reserve1, basal potency 0.20, glulisine PK, or phenotype archetype weights to improve Baldwin agreement.']
};
const dir='analysis/baldwin2012_renal_rct_external';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Baldwin 2012 renal RCT external audit','',`Eligible generated N=${pts.length}; entropy-weight ESS=${ess.toFixed(0)}.`,`Matched baseline: age ${out.baseline_matched.age.toFixed(1)} y, weight ${out.baseline_matched.weight.toFixed(1)} kg, eGFR ${out.baseline_matched.egfr.toFixed(1)}, duration ${out.baseline_matched.duration.toFixed(1)} y.`,'','Frozen physiology: mass-action100 + CR V2 width10/reserve1 + basal potency 0.20. Existing renal modifier is tested OFF versus ON without magnitude tuning.','','| arm | day1 mean | days2-6 mean | any<70 | any<50 | fasting | prelunch | predinner | bedtime | target day1 | target last | renal exposure |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of results){const s=r.summary;md.push(`| ${r.name} | ${s.day1_mean.toFixed(1)} | ${s.days2_6_mean.toFixed(1)} | ${s.any70_pct.toFixed(1)}% | ${s.any50_pct.toFixed(1)}% | ${s.fasting.toFixed(1)} | ${s.prelunch.toFixed(1)} | ${s.predinner.toFixed(1)} | ${s.bedtime.toFixed(1)} | ${s.target_day1_pct.toFixed(1)}% | ${s.target_last_pct.toFixed(1)}% | ${s.renal_exposure.toFixed(3)} |`)}
md.push('','Published high-dose anchors: day1 mean 196.1; days2-6 174.0; any<70 30.0%; any<50 6.0%; fasting/prelunch/predinner/bedtime 151.9/193.0/169.9/181.5 mg/dL.','Published low-dose anchors: day1 mean 196.9; days2-6 174.5; any<70 15.8%; any<50 1.8%; fasting/prelunch/predinner/bedtime 155.1/189.2/184.7/178.4 mg/dL.','','## Dose-trajectory context check','','| arm | D1 | D2 | D3 | D4 | D5 | D6 |','|---|---:|---:|---:|---:|---:|---:|'];for(const r of results)md.push(`| ${r.name} | ${r.summary.tdd.map(x=>x.toFixed(1)).join(' | ')} |`);md.push(`| published high | ${published.high.tdd.map(x=>x.toFixed(1)).join(' | ')} |`,`| published low | ${published.low.tdd.map(x=>x.toFixed(1)).join(' | ')} |`,'','## Pre-specified directional checks','');for(const q of out.paired)md.push(`- Renal ${q.renal?'ON':'OFF'}: lower-dose hypoglycemia direction ${q.lower_dose_reduces_hypoglycemia?'PASS':'FAIL'}; high-low days2-6 mean difference ${q.delta_days2_6_high_minus_low.toFixed(1)} mg/dL; low/high hypo ratio ${Number.isFinite(q.hypo_ratio_low_over_high)?q.hypo_ratio_low_over_high.toFixed(2):'NA'}.`);md.push('','Interpretation guardrail: the trial can validate or reject the already-existing renal modifier, but it must not be used to tune a new renal multiplier. If the simulated dose trajectory fails to resemble the reported administered insulin trajectory, keep the renal magnitude uncertain and diagnose the treatment mapping before touching physiology.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
