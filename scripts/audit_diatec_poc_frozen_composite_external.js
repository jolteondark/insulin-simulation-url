#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
for(const f of[
 't2dm_patient_phenotype_v1_shanghai_exp.js','t2dm_patient_phenotype_v2_shanghai106_exp.js','t2dm_patient_phenotype_v3_inpatient_mix_exp.js',
 't2dm_game_model_v2_order_decomp_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
// Audit-local, behavior-off-by-default extension: allow more than one non-meal POC correction time.
let dyn=fs.readFileSync('t2dm_inpatient_dynamic_v1_poc_safety_exp.js','utf8');
dyn=dyn.replace(
 "const bedtimeCorrectionFn=typeof state.bedtime_correction_fn==='function'?state.bedtime_correction_fn:null;",
 "const bedtimeCorrectionFn=typeof state.bedtime_correction_fn==='function'?state.bedtime_correction_fn:null;\n const scheduledCorrectionFn=typeof state.scheduled_correction_fn==='function'?state.scheduled_correction_fn:null;\n const scheduledCorrectionTimes=Array.isArray(state.scheduled_correction_times)?state.scheduled_correction_times.map(x=>Math.max(0,Math.min(1439,Math.round(Number(x))))).filter(Number.isFinite):[];"
);
dyn=dyn.replace(
 "const bedtimeCorrections=[],hypoglycemiaRescues=[],rescueCarbEvents=[];",
 "const bedtimeCorrections=[],scheduledCorrections=[],hypoglycemiaRescues=[],rescueCarbEvents=[];"
);
dyn=dyn.replace(
 "if(bedtimeCorrectionFn&&t===bedtimeCorrectionMin){",
 "if(scheduledCorrectionFn&&scheduledCorrectionTimes.includes(t)){\n     const raw=scheduledCorrectionFn({t,glucose_mg_dl:g[t],patient:p,order_u:dose,si_relative:si,effective_insulin_sensitivity:effectiveInsulinSensitivity,state});\n     const u=Math.max(0,Math.round(Number(raw)||0));\n     if(u>0){bolus.push([t,u]);scheduledCorrections.push({minute:t,glucose_mg_dl:g[t],units:u});}\n   }\n   if(bedtimeCorrectionFn&&t===bedtimeCorrectionMin){"
);
dyn=dyn.replace(
 "bedtime_corrections:bedtimeCorrections,prandial_safety_adjustments:prandialSafetyAdjustments,",
 "bedtime_corrections:bedtimeCorrections,scheduled_corrections:scheduledCorrections,prandial_safety_adjustments:prandialSafetyAdjustments,"
);
if(!dyn.includes('scheduledCorrectionTimes')||!dyn.includes('scheduledCorrections.push'))throw new Error('dynamic audit patch failed');
vm.runInThisContext(dyn,{filename:'t2dm_inpatient_dynamic_v1_poc_safety_exp.js[diatec-multicorrection-audit]'});
for(const f of[
 't2dm_inpatient_course_v1_exp.js','t2dm_treatment_policy_diatec_poc_exp.js','insulin_prandial_pk_prior_ranges_exp.js',
 't2dm_inpatient_trajectory_v1_exp.js','insulin_basal_potency_prior_exp.js','t2dm_counterregulation_v2_egp_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,D=T2DMInpatientDynamicV1PocSafetyExp,C=T2DMInpatientCourseV1Exp,
 TP=T2DMTreatmentPolicyDiatecPocExp,PK=InsulinPrandialPkPriorRangesExp,T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,CR=T2DMCounterregulationV2EgpExp;
const aspart=PK.get('aspart'),N=6000,DAYS=8;
const target={age:76.1,age_sd:9.8,duration:13.1,duration_sd:8.7,hba1c_mmol_mol:53.6,hba1c_sd:13.9};
const POC_TIMES=[180,420,720,1080,1320];
const ARMS=[
 {name:'strict_poc_recommended_daytime_high_2d_primary',start_days:2,scale_mode:'recommended',primary:true},
 {name:'strict_poc_recommended_daytime_high_1d_sensitivity',start_days:1,scale_mode:'recommended',primary:false},
 {name:'strict_poc_trend_scale_daytime_high_2d_sensitivity',start_days:2,scale_mode:'trend',primary:false},
 {name:'strict_poc_basal_correction_only_no_prandial_sensitivity',start_days:Infinity,scale_mode:'recommended',primary:false}
];
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function solve(A,b){const n=b.length,X=A.map((r,i)=>r.slice().concat([b[i]]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(X[r][c])>Math.abs(X[p][c]))p=r;if(Math.abs(X[p][c])<1e-12)throw new Error('singular');[X[c],X[p]]=[X[p],X[c]];const q=X[c][c];for(let j=c;j<=n;j++)X[c][j]/=q;for(let r=0;r<n;r++){if(r===c)continue;const f=X[r][c];for(let j=c;j<=n;j++)X[r][j]-=f*X[c][j];}}return X.map(r=>r[n])}
function entropyWeights(xs){const k=xs[0].length;let lam=Array(k).fill(0),p=[];for(let it=0;it<60;it++){const sc=xs.map(x=>dot(lam,x)),mx=Math.max(...sc),raw=sc.map(s=>Math.exp(s-mx)),z=raw.reduce((a,b)=>a+b,0);p=raw.map(w=>w/z);const mu=Array(k).fill(0);for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)mu[j]+=p[n]*xs[n][j];if(Math.max(...mu.map(Math.abs))<1e-9)break;const cov=Array.from({length:k},()=>Array(k).fill(0));for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)for(let l=0;l<k;l++)cov[j][l]+=p[n]*(xs[n][j]-mu[j])*(xs[n][l]-mu[l]);for(let j=0;j<k;j++)cov[j][j]+=1e-6;const step=solve(cov,mu);lam=lam.map((v,j)=>v-step[j]);}return{p,lambda:lam}}
function weightedMean(rows,w,key){let s=0;for(let i=0;i<rows.length;i++)s+=w[i]*rows[i][key];return s}
function weightedMedian(rows,w,key){const a=rows.map((r,i)=>({x:r[key],w:w[i]})).filter(z=>Number.isFinite(z.x)).sort((a,b)=>a.x-b.x);let c=0;for(const z of a){c+=z.w;if(c>=.5)return z.x}return a.length?a[a.length-1].x:NaN}
function frozenPatch(p){return{prandial_mass_action_low_side:true,prandial_mass_action_reference_mg_dl:Number(p.endogenous_insulin&&p.endogenous_insulin.glucose_threshold_mg_dl)||100,...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})}}
function pctForSignal(bg,hadObservedHypo){bg=Number(bg);if(!Number.isFinite(bg))return 0;if(bg<54)return-.30;if(bg<70)return-.20;if(bg<100)return-.10;if(bg<=140)return 0;if(hadObservedHypo)return 0;if(bg<=180)return.10;if(bg<=270)return.20;return.30}
function signalFromValues(vals){vals=vals.map(Number).filter(Number.isFinite);if(!vals.length)return NaN;const lows=vals.filter(x=>x<100);if(lows.length)return Math.min(...lows);return Math.max(...vals)}
function observedPocs(record){if(!record||!record.series)return[];return POC_TIMES.map(t=>Number(record.series[t])).filter(Number.isFinite)}
function daytimeObservedHigh(record){if(!record||!record.series)return false;return [720,1080,1320].some(t=>Number(record.series[t])>180)}
function adjust(u,pct){return Math.max(0,Math.round(Number(u||0)*(1+pct)))}
function titrateStrictPoc(order,bg,ctx,arm){
 const o=TP.copyOrder(order),records=ctx.course&&ctx.course.records||[],last=records[records.length-1];if(!last||!last.series)return o;
 const pocs=observedPocs(last),hadObservedHypo=pocs.some(x=>x<70),s=last.series;
 // DIATEC POC arm: basal from observed overnight POC only; prandial from subsequent premeal/22:00 POC only.
 o.basal_u=adjust(o.basal_u,pctForSignal(signalFromValues([s[180],s[420]]),hadObservedHypo));
 const hasPrandial=(o.breakfast_u+o.lunch_u+o.dinner_u)>0;
 if(hasPrandial){o.breakfast_u=adjust(o.breakfast_u,pctForSignal(s[720],hadObservedHypo));o.lunch_u=adjust(o.lunch_u,pctForSignal(s[1080],hadObservedHypo));o.dinner_u=adjust(o.dinner_u,pctForSignal(s[1320],hadObservedHypo));}
 if(!hasPrandial&&Number.isFinite(arm.start_days)){
   const n=Math.max(1,Math.round(arm.start_days));let persistent=records.length>=n;
   for(let k=0;k<n&&persistent;k++)persistent=daytimeObservedHigh(records[records.length-1-k]);
   if(persistent){const pr=TP.startingPrandial(ctx.patient);o.breakfast_u=pr.breakfast_u;o.lunch_u=pr.lunch_u;o.dinner_u=pr.dinner_u;}
 }
 return o;
}
function patientMetrics(course,counter,initialOrder){
 const vals=[];let basal=0;for(const r of course.records){basal+=Number(r.order.basal_u)||0;for(let t=0;t<1440;t+=5)vals.push(Number(r.series[t]));}
 const m=mean(vals),s=sd(vals),n=vals.length;let l70=0,l54=0,h180=0,h250=0,tir=0;for(const x of vals){if(x<70)l70++;if(x<54)l54++;if(x>180)h180++;if(x>250)h250++;if(x>=70&&x<=180)tir++;}
 let prolonged70=0,inEvent=false,streak=0,clear=0;for(const x of vals){if(x<70){clear=0;streak++;if(!inEvent&&streak>=3){prolonged70++;inEvent=true}}else{streak=0;if(inEvent){clear++;if(clear>=3){inEvent=false;clear=0}}}}
 const days=course.records.length,totalIns=(basal+counter.scheduled_prandial_u+counter.premeal_correction_u+counter.nonmeal_correction_u)/days;
 return{mean_bg:m,cv_pct:m>0?100*s/m:NaN,tir_pct:100*tir/n,tar180_pct:100*h180/n,tar250_pct:100*h250/n,tbr70_pct:100*l70/n,tbr54_pct:100*l54/n,total_insulin_u_day:totalIns,basal_u_day:basal/days,scheduled_prandial_u_day:counter.scheduled_prandial_u/days,correction_u_day:(counter.premeal_correction_u+counter.nonmeal_correction_u)/days,prolonged70_events:prolonged70,first_basal_u:initialOrder.basal_u};
}
function simulate(z,arm){
 const p=z.p,tr=T.choose(z.i),initial=TP.startingOrder(p),counter={scheduled_prandial_u:0,premeal_correction_u:0,nonmeal_correction_u:0};
 const cfg={days:DAYS,titrate:true,allow_meal_mismatch:false,allow_npo:false,bolus_tau_min:aspart.candidate.tau_min,bolus_duration_min:aspart.candidate.duration_min,
  titrate_order_fn:(ord,bg,ctx)=>titrateStrictPoc(ord,bg,ctx,arm),
  state_modifier_fn:(ctx)=>{
   const scale=arm.scale_mode==='trend'?TP.correctionModeFromCourse(ctx.course):'recommended';
   return{...T.statePatch(tr,ctx.day,z.i),...B.statePatch(M,.20),...frozenPatch(p),scheduled_correction_times:[180,1320],
    prandial_safety_adjustment_fn:({poc_glucose_mg_dl,planned_units})=>{const bg=Number(poc_glucose_mg_dl),planned=Math.max(0,Math.round(Number(planned_units)||0));if(bg<70)return 0;const corr=TP.supplement(bg,scale);counter.scheduled_prandial_u+=planned;counter.premeal_correction_u+=corr;return planned+corr;},
    scheduled_correction_fn:({glucose_mg_dl})=>{const u=TP.supplement(glucose_mg_dl,scale);counter.nonmeal_correction_u+=u;return u;},
    hypoglycemia_rescue_fn:({t,glucose_mg_dl,prior_rescues})=>{if(!(Number(glucose_mg_dl)<70))return 0;const rs=prior_rescues||[],last=rs.length?rs[rs.length-1]:null;const scheduled=POC_TIMES.includes(t),repeat=!!(last&&last.label==='diatec_poc_15g'&&t===last.minute+15);if(!(scheduled||repeat))return 0;return{carbs_g:15,cooldown_min:15,label:'diatec_poc_15g'};}
   };
  }
 };
 const course=C.simulateCourse(M,D,p,initial,cfg,z.i);return patientMetrics(course,counter,initial);
}
const pts=[];for(let i=1;i<=N;i++){const p=P.sample(i,{preset:'support_sweep'}),age=Number(p.age_years),dur=Number(p.duration_years),egfr=Number(p.egfr_ml_min_1_73m2);if(age<18||egfr<15)continue;pts.push({i,p,x:[(age-target.age)/target.age_sd,(dur-target.duration)/target.duration_sd]});}
const ew=entropyWeights(pts.map(z=>z.x)),w=ew.p,ess=1/w.reduce((s,x)=>s+x*x,0);
function baseline(){const fn={age:z=>z.p.age_years,duration:z=>z.p.duration_years,bmi:z=>z.p.bmi_kg_m2,weight:z=>z.p.body_weight_kg,egfr:z=>z.p.egfr_ml_min_1_73m2,si:z=>z.p.si_relative};const o={};for(const[k,f]of Object.entries(fn)){let s=0;for(let i=0;i<pts.length;i++)s+=w[i]*f(pts[i]);o[k]=s;}return o;}
const results=[];for(const arm of ARMS){const rows=pts.map(z=>simulate(z,arm));const s={};for(const key of['mean_bg','cv_pct','tir_pct','tar180_pct','tar250_pct','tbr70_pct','tbr54_pct','total_insulin_u_day','basal_u_day','scheduled_prandial_u_day','correction_u_day','prolonged70_events'])s[key+'_mean']=weightedMean(rows,w,key);for(const key of['tir_pct','tar180_pct','tbr70_pct','tbr54_pct'])s[key+'_median']=weightedMedian(rows,w,key);results.push({...arm,summary:s});}
const out={purpose:'Strictly POC-only DIATEC external audit of frozen mass-action100 + CR V2 width10/reserve1 physiology. Blinded CGM is outcome-only. Treatment decisions use only the five scheduled POC samples (03:00, premeal x3, 22:00).',frozen_candidate:{mass_action_reference_mg_dl:100,cr_width_mg_dl:10,cr_reserve:1,basal_potency:.20,freeze_commit:'71c967785233763fe1522014004050dd2cdc38c7'},n:{requested:N,eligible:pts.length,ess},baseline_target:target,baseline_matched:baseline(),targets:{poc_arm:{tir_median_pct:62.7,tar180_median_pct:36.5,cv_mean_pct:28.0,total_insulin_mean_u_day:29.3}},arms:results,protocol_fidelity:{poc_times_min:POC_TIMES,correction_times:'03:00, premeal breakfast/lunch/dinner, 22:00',prior_day_hypoglycemia:'scheduled POC only; hidden CGM/latent series never used',basal_titration:'03:00 and prebreakfast POC with rule-of-lowest/extremes',prandial_titration:'subsequent premeal POC; dinner by 22:00 POC',hypoglycemia_rescue:'15 g at observed POC <70 with 15-min repeat if still <70'},limitations:['Generator lacks HbA1c, so published HbA1c 53.6±13.9 mmol/mol cannot be used for baseline weighting.','24.7% of DIATEC participants used insulin before admission; patient-level home doses are unavailable and are not invented.','Prandial initiation criterion (>180 postprandially for 1-2 days) is discretionary while routine POC is five-times daily. Primary therefore uses two consecutive days of observed daytime POC hyperglycemia as an explicitly labeled observable proxy; one-day and no-prandial arms bracket this uncertainty. Do not select by outcome closeness.','Correction-scale sensitive/resistant adjustment was discretionary; fixed recommended scale is primary and trend-guided adjustment is sensitivity only.','Basal was administered at lunch in DIATEC so morning titration could affect same-day basal; the generic course engine applies the updated order on the following simulated day. If exposure/distribution remains materially mismatched, same-day lunch basal timing must be represented before judging physiology.','Home insulin, perioperative fasting/GIK, and meal-intake heterogeneity are not invented in this first identifiable POC audit.'],invalidated_prior_run:{run_id:32538648778,reason:'Prior audit used hidden latent-series hypoglycemia/postprandial signals and omitted either 03:00 or 22:00 correction. Its values are diagnostic only and not external-validation evidence.'}};
const dir='analysis/diatec_poc_frozen_composite_external';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# DIATEC strict POC-only frozen-composite external audit','',`Eligible N=${pts.length}; entropy-weight ESS=${ess.toFixed(0)}.`,'',`Matched age ${out.baseline_matched.age.toFixed(1)} y, duration ${out.baseline_matched.duration.toFixed(1)} y, BMI ${out.baseline_matched.bmi.toFixed(1)}, weight ${out.baseline_matched.weight.toFixed(1)} kg, eGFR ${out.baseline_matched.egfr.toFixed(1)}, SI ${out.baseline_matched.si.toFixed(3)}.`,'','Published POC anchors: median TIR 62.7%, median TAR>180 36.5%, mean CV 28.0%, mean total insulin 29.3 U/day.','','| arm | TIR median | TAR>180 median | TBR<70 median | mean BG | CV mean | insulin U/day | basal | sched prandial | correction |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];for(const r of results){const s=r.summary;md.push(`| ${r.name} | ${s.tir_pct_median.toFixed(1)}% | ${s.tar180_pct_median.toFixed(1)}% | ${s.tbr70_pct_median.toFixed(2)}% | ${s.mean_bg_mean.toFixed(1)} | ${s.cv_pct_mean.toFixed(1)}% | ${s.total_insulin_u_day_mean.toFixed(1)} | ${s.basal_u_day_mean.toFixed(1)} | ${s.scheduled_prandial_u_day_mean.toFixed(1)} | ${s.correction_u_day_mean.toFixed(1)} |`);}md.push('','This supersedes run 32538648778 for validation purposes. Guardrail: do not choose a prandial-initiation or correction-scale sensitivity arm by closeness to DIATEC outcomes.');fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
