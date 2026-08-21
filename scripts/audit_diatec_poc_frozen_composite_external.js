#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of[
 't2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js',
 't2dm_game_model_v2_order_decomp_exp.js','t2dm_inpatient_dynamic_v1_poc_safety_exp.js','t2dm_inpatient_course_v1_exp.js',
 't2dm_treatment_policy_diatec_poc_exp.js','insulin_prandial_pk_prior_ranges_exp.js','t2dm_inpatient_trajectory_v1_exp.js',
 'insulin_basal_potency_prior_exp.js','t2dm_counterregulation_v2_egp_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1PocSafetyExp,C=T2DMInpatientCourseV1Exp,
 TP=T2DMTreatmentPolicyDiatecPocExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,CR=T2DMCounterregulationV2EgpExp;
const aspart=PK.get('aspart'),N=6000,DAYS=8;
const target={age:76.1,age_sd:9.8,duration:13.1,duration_sd:8.7,hba1c_mmol_mol:53.6,hba1c_sd:13.9};
const ARMS=[
 {name:'recommended_scale_prandial_after_2d_bedtime22_primary',prandial_start_days:2,scale_mode:'recommended',extra_slot:1320,primary:true},
 {name:'recommended_scale_prandial_after_2d_night03_sensitivity',prandial_start_days:2,scale_mode:'recommended',extra_slot:180,primary:false},
 {name:'recommended_scale_prandial_after_1d_bedtime22_sensitivity',prandial_start_days:1,scale_mode:'recommended',extra_slot:1320,primary:false},
 {name:'trend_adjusted_scale_prandial_after_2d_bedtime22_sensitivity',prandial_start_days:2,scale_mode:'trend',extra_slot:1320,primary:false}
];
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function solve(A,b){const n=b.length,X=A.map((r,i)=>r.slice().concat([b[i]]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(X[r][c])>Math.abs(X[p][c]))p=r;if(Math.abs(X[p][c])<1e-12)throw new Error('singular');[X[c],X[p]]=[X[p],X[c]];const q=X[c][c];for(let j=c;j<=n;j++)X[c][j]/=q;for(let r=0;r<n;r++){if(r===c)continue;const f=X[r][c];for(let j=c;j<=n;j++)X[r][j]-=f*X[c][j];} }return X.map(r=>r[n])}
function entropyWeights(xs){const k=xs[0].length;let lam=Array(k).fill(0),p=[];for(let it=0;it<60;it++){const sc=xs.map(x=>dot(lam,x)),mx=Math.max(...sc),raw=sc.map(s=>Math.exp(s-mx)),z=raw.reduce((a,b)=>a+b,0);p=raw.map(w=>w/z);const mu=Array(k).fill(0);for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)mu[j]+=p[n]*xs[n][j];if(Math.max(...mu.map(Math.abs))<1e-9)break;const cov=Array.from({length:k},()=>Array(k).fill(0));for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)for(let l=0;l<k;l++)cov[j][l]+=p[n]*(xs[n][j]-mu[j])*(xs[n][l]-mu[l]);for(let j=0;j<k;j++)cov[j][j]+=1e-6;const step=solve(cov,mu);lam=lam.map((v,j)=>v-step[j]);}return{p,lambda:lam}}
function weightedMean(rows,w,key){let s=0;for(let i=0;i<rows.length;i++)s+=w[i]*rows[i][key];return s}
function weightedMedian(rows,w,key){const a=rows.map((r,i)=>({x:r[key],w:w[i]})).filter(z=>Number.isFinite(z.x)).sort((a,b)=>a.x-b.x);let c=0;for(const z of a){c+=z.w;if(c>=.5)return z.x}return a.length?a[a.length-1].x:NaN}
function frozenPatch(p){return{prandial_mass_action_low_side:true,prandial_mass_action_reference_mg_dl:Number(p.endogenous_insulin&&p.endogenous_insulin.glucose_threshold_mg_dl)||100,...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})}}
const POC_RESCUE_BASE=new Set([420,720,1080,1260]);
function patientMetrics(course,counter,initialOrder){
 const vals=[];let basal=0;for(const r of course.records){basal+=Number(r.order.basal_u)||0;for(let t=0;t<1440;t+=5)vals.push(Number(r.series[t]));}
 const m=mean(vals),s=sd(vals),n=vals.length;let l70=0,l54=0,h180=0,h250=0,tir=0;for(const x of vals){if(x<70)l70++;if(x<54)l54++;if(x>180)h180++;if(x>250)h250++;if(x>=70&&x<=180)tir++;}
 let prolonged70=0,inEvent=false,streak=0,clear=0;for(const x of vals){if(x<70){clear=0;streak++;if(!inEvent&&streak>=3){prolonged70++;inEvent=true}}else{streak=0;if(inEvent){clear++;if(clear>=3){inEvent=false;clear=0}}}}
 const totalIns=(basal+counter.scheduled_prandial_u+counter.premeal_correction_u+counter.extra_slot_correction_u)/course.records.length;
 return{mean_bg:m,cv_pct:m>0?100*s/m:NaN,tir_pct:100*tir/n,tar180_pct:100*h180/n,tar250_pct:100*h250/n,tbr70_pct:100*l70/n,tbr54_pct:100*l54/n,total_insulin_u_day:totalIns,basal_u_day:basal/course.records.length,scheduled_prandial_u_day:counter.scheduled_prandial_u/course.records.length,correction_u_day:(counter.premeal_correction_u+counter.extra_slot_correction_u)/course.records.length,prolonged70_events:prolonged70,first_basal_u:initialOrder.basal_u};
}
function simulate(z,arm){
 const p=z.p,tr=T.choose(z.i),initial=TP.startingOrder(p),counter={scheduled_prandial_u:0,premeal_correction_u:0,extra_slot_correction_u:0};
 const cfg={days:DAYS,titrate:true,allow_meal_mismatch:false,allow_npo:false,bolus_tau_min:aspart.candidate.tau_min,bolus_duration_min:aspart.candidate.duration_min,
  titrate_order_fn:(ord,bg,ctx)=>TP.titratePoc(ord,bg,ctx,{prandial_start_days:arm.prandial_start_days}),
  state_modifier_fn:(ctx)=>{
   const scale=arm.scale_mode==='trend'?TP.correctionModeFromCourse(ctx.course):'recommended';
   const rescueSlots=new Set([...POC_RESCUE_BASE,arm.extra_slot]);
   return{...T.statePatch(tr,ctx.day,z.i),...B.statePatch(M,.20),...frozenPatch(p),bedtime_correction_min:arm.extra_slot,
    prandial_safety_adjustment_fn:({poc_glucose_mg_dl,planned_units})=>{const bg=Number(poc_glucose_mg_dl),planned=Math.max(0,Math.round(Number(planned_units)||0));if(bg<70)return 0;const corr=TP.supplement(bg,scale);counter.scheduled_prandial_u+=planned;counter.premeal_correction_u+=corr;return planned+corr;},
    bedtime_correction_fn:({glucose_mg_dl})=>{const u=TP.supplement(glucose_mg_dl,scale);counter.extra_slot_correction_u+=u;return u;},
    hypoglycemia_rescue_fn:({t,glucose_mg_dl,prior_rescues})=>{if(!(Number(glucose_mg_dl)<70)||!rescueSlots.has(t))return 0;const rs=prior_rescues||[],last=rs.length?rs[rs.length-1]:null;if(last&&last.label==='diatec_poc_15g'&&t===last.minute+15)return{carbs_g:15,cooldown_min:15,label:'diatec_poc_15g'};return{carbs_g:15,cooldown_min:15,label:'diatec_poc_15g'};}
   };
  }
 };
 const course=C.simulateCourse(M,D,p,initial,cfg,z.i);return patientMetrics(course,counter,initial);
}
const pts=[];for(let i=1;i<=N;i++){const p=P.sample(i,{preset:'support_sweep'}),age=Number(p.age_years),dur=Number(p.duration_years),egfr=Number(p.egfr_ml_min_1_73m2);if(age<18||egfr<15)continue;pts.push({i,p,x:[(age-target.age)/target.age_sd,(dur-target.duration)/target.duration_sd]});}
const ew=entropyWeights(pts.map(z=>z.x)),w=ew.p,ess=1/w.reduce((s,x)=>s+x*x,0);
function baseline(){const fn={age:z=>z.p.age_years,duration:z=>z.p.duration_years,bmi:z=>z.p.bmi_kg_m2,weight:z=>z.p.body_weight_kg,egfr:z=>z.p.egfr_ml_min_1_73m2,si:z=>z.p.si_relative};const o={};for(const[k,f]of Object.entries(fn)){let s=0;for(let i=0;i<pts.length;i++)s+=w[i]*f(pts[i]);o[k]=s;}return o;}
const results=[];for(const arm of ARMS){const rows=pts.map(z=>simulate(z,arm));const s={};for(const key of['mean_bg','cv_pct','tir_pct','tar180_pct','tar250_pct','tbr70_pct','tbr54_pct','total_insulin_u_day','basal_u_day','scheduled_prandial_u_day','correction_u_day','prolonged70_events'])s[key+'_mean']=weightedMean(rows,w,key);for(const key of['tir_pct','tar180_pct','tbr70_pct','tbr54_pct'])s[key+'_median']=weightedMedian(rows,w,key);results.push({...arm,summary:s});}
const out={purpose:'DIATEC POC-arm external validation feasibility for frozen mass-action100 + CR V2 width10/reserve1 physiology. Blinded CGM is outcome-only; treatment uses scheduled POC values. No DIATEC glycemic outcome changes physiology.',frozen_candidate:{mass_action_reference_mg_dl:100,cr_width_mg_dl:10,cr_reserve:1,basal_potency:.20,freeze_commit:'71c967785233763fe1522014004050dd2cdc38c7'},n:{requested:N,eligible:pts.length,ess},baseline_target:target,baseline_matched:baseline(),targets:{poc_arm:{tir_median_pct:62.7,tar180_median_pct:36.5,cv_mean_pct:28.0,total_insulin_mean_u_day:29.3},notes:'Published TBR absolute value not exposed in the abstract/registry result table used here; do not infer it from the CGM-vs-POC relative ratio.'},arms:results,limitations:['Generator lacks HbA1c, so published HbA1c 53.6±13.9 mmol/mol cannot be used for baseline weighting.','Approximately 21-25% of DIATEC participants used insulin before admission; patient-level home doses are unavailable and are not invented here. All generated patients therefore use published weight-based starting doses.','Current dynamic engine supports premeal plus one additional correction time. DIATEC used both 03:00 and 22:00 correction. Primary includes 22:00 and omits 03:00; a pre-specified sensitivity includes 03:00 and omits 22:00. If conclusions depend on this choice, extend the engine before interpreting physiology.','Prandial initiation after 1 versus 2 days of postprandial >180 mg/dL was discretionary in the protocol; both are pre-specified, not selected by outcome.','Correctional scale insulin-sensitive/resistant adjustment was discretionary; fixed recommended scale is primary and a trend-guided sensitivity is reported.','Standardized meals are used; perioperative fasting/GIK and meal intake heterogeneity are excluded in this first identifiability audit.'],source_context:{trial:'DIATEC NCT05803473',poc_arm:'POC-guided management with blinded Dexcom G6 outcome',starting_basal:'0.25 U/kg; 0.20 U/kg if age>75 and/or eGFR<=60 and/or BMI<=22.5',prandial:'0.25 or 0.20 U/kg total divided equally after postprandial >180 for 1-2 days',correction:'<180 0; 180-214 4; 215-286 6; 287-358 8; >358 10 U; optional insulin-sensitive/resistant shifts',titration:'published +/-10/20/30% POC algorithm with rule of lowest/extremes'}};
const dir='analysis/diatec_poc_frozen_composite_external';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# DIATEC POC frozen-composite external audit','',`Eligible N=${pts.length}; entropy-weight ESS=${ess.toFixed(0)}.`,'',`Matched age ${out.baseline_matched.age.toFixed(1)} y, duration ${out.baseline_matched.duration.toFixed(1)} y, BMI ${out.baseline_matched.bmi.toFixed(1)}, weight ${out.baseline_matched.weight.toFixed(1)} kg, eGFR ${out.baseline_matched.egfr.toFixed(1)}, SI ${out.baseline_matched.si.toFixed(3)}.`,'','Published POC anchors: median TIR 62.7%, median TAR>180 36.5%, mean CV 28.0%, mean total insulin 29.3 U/day.','','| arm | TIR median | TAR>180 median | TBR<70 median | mean BG | CV mean | insulin U/day | basal | sched prandial | correction |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of results){const s=r.summary;md.push(`| ${r.name} | ${s.tir_pct_median.toFixed(1)}% | ${s.tar180_pct_median.toFixed(1)}% | ${s.tbr70_pct_median.toFixed(2)}% | ${s.mean_bg_mean.toFixed(1)} | ${s.cv_pct_mean.toFixed(1)}% | ${s.total_insulin_u_day_mean.toFixed(1)} | ${s.basal_u_day_mean.toFixed(1)} | ${s.scheduled_prandial_u_day_mean.toFixed(1)} | ${s.correction_u_day_mean.toFixed(1)} |`);}
md.push('','Guardrail: do not choose among ambiguity arms by closeness to DIATEC outcomes. If the omitted 03:00 vs omitted 22:00 correction materially changes conclusions, extend the engine to represent both before judging physiology.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
