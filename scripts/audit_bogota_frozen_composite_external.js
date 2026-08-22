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
 't2dm_treatment_policy_bogota_rabbit_exp.js',
 'insulin_prandial_pk_prior_ranges_exp.js',
 't2dm_inpatient_trajectory_v1_exp.js',
 'insulin_basal_potency_prior_exp.js',
 't2dm_counterregulation_v2_egp_exp.js'
])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const P=T2DMPatientPhenotypeV3InpatientMixExp,M=T2DMGameModelV2OrderDecompExp,
 D=T2DMInpatientDynamicV1PocSafetyExp,C=T2DMInpatientCourseV1Exp,
 BP=T2DMTreatmentPolicyBogotaRabbitExp,PK=InsulinPrandialPkPriorRangesExp,
 T=T2DMInpatientTrajectoryV1Exp,B=InsulinBasalPotencyPriorExp,CR=T2DMCounterregulationV2EgpExp;
const gp=PK.get('glulisine'),REQUESTED_N=8000;
const BOGOTA_POC=new Set([180,420,600,720,900,1080,1260]);
const target={
 age:66.1,age_sd:8.6,bmi:26.5,bmi_sd:4.9,duration:14.7,duration_sd:8.9,
 weight:69.6,weight_sd:14.1,admission_bg:254.6,admission_bg_sd:153
};
const ARMS=[
 {name:'age_start_standardized_meals',renal_mode:'age_only',meal_match:false,primary:true},
 {name:'age_or_egfr60_start_standardized_meals',renal_mode:'age_or_egfr60',meal_match:false,primary:false},
 {name:'age_start_existing_meal_match_sensitivity',renal_mode:'age_only',meal_match:true,primary:false},
 {name:'age_or_egfr60_existing_meal_match_sensitivity',renal_mode:'age_or_egfr60',meal_match:true,primary:false}
];
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN}
function sd(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function solve(A,b){const n=b.length,X=A.map((r,i)=>r.slice().concat([b[i]]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(X[r][c])>Math.abs(X[p][c]))p=r;if(Math.abs(X[p][c])<1e-12)throw new Error('singular');[X[c],X[p]]=[X[p],X[c]];const q=X[c][c];for(let j=c;j<=n;j++)X[c][j]/=q;for(let r=0;r<n;r++){if(r===c)continue;const f=X[r][c];for(let j=c;j<=n;j++)X[r][j]-=f*X[c][j];}}return X.map(r=>r[n])}
function entropyWeights(xs){const k=xs[0].length;let lam=Array(k).fill(0),p=[];for(let it=0;it<60;it++){const sc=xs.map(x=>dot(lam,x)),mx=Math.max(...sc),raw=sc.map(s=>Math.exp(s-mx)),z=raw.reduce((a,b)=>a+b,0);p=raw.map(w=>w/z);const mu=Array(k).fill(0);for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)mu[j]+=p[n]*xs[n][j];if(Math.max(...mu.map(Math.abs))<1e-9)break;const cov=Array.from({length:k},()=>Array(k).fill(0));for(let n=0;n<xs.length;n++)for(let j=0;j<k;j++)for(let l=0;l<k;l++)cov[j][l]+=p[n]*(xs[n][j]-mu[j])*(xs[n][l]-mu[l]);for(let j=0;j<k;j++)cov[j][j]+=1e-6;const step=solve(cov,mu);lam=lam.map((v,j)=>v-step[j]);}return{p,lambda:lam}}
function monitorDays(seed){const u=rng('bogota-monitor-duration:'+seed)();if(u<12/34)return 3;if(u<20/34)return 4;if(u<30/34)return 5;return 6}
function frozenPatch(p){return{
 prandial_mass_action_low_side:true,
 prandial_mass_action_reference_mg_dl:Number(p.endogenous_insulin&&p.endogenous_insulin.glucose_threshold_mg_dl)||100,
 ...CR.statePatch(M,{reserve:1,activation_width_mg_dl:10})
};}
function protocolPocRescue({t,glucose_mg_dl,prior_rescues}){const g=Number(glucose_mg_dl);if(!(g<70))return 0;const rs=prior_rescues||[],last=rs.length?rs[rs.length-1]:null;const scheduled=BOGOTA_POC.has(t),repeat=!!(last&&last.label==='bogota_poc_15g'&&t===last.minute+15);if(!(scheduled||repeat))return 0;return{carbs_g:15,cooldown_min:15,label:'bogota_poc_15g'};}
function treatmentPatch(ctx,arm,counter){
 const s=ctx.state||{},mealShift={breakfast:0,lunch:0,dinner:0,...(s.meal_shift_min||{})},intake={breakfast:1,lunch:1,dinner:1,...(s.intake_fraction||{})};
 const bolusShift={...mealShift},bolusFraction={breakfast:1,lunch:1,dinner:1};
 const mealFn=({meal,poc_glucose_mg_dl,planned_units})=>{
   const f=Number(intake[meal]);const fraction=Number.isFinite(f)?f:1;
   const supp=BP.supplement(poc_glucose_mg_dl,'usual');
   const planned=Math.max(0,Math.round(Number(planned_units)||0));
   const sched=arm.meal_match&&fraction<.85?Math.max(0,Math.round(planned*Math.max(0,Math.min(1,fraction)))):planned;
   counter.premeal_supplement_u+=supp;counter.scheduled_prandial_given_u+=sched;
   return sched+supp;
 };
 return{
   bolus_shift_min:bolusShift,bolus_fraction:bolusFraction,
   prandial_safety_adjustment_fn:mealFn,
   bedtime_correction_fn:({glucose_mg_dl})=>{const u=BP.supplement(glucose_mg_dl,'usual');counter.bedtime_supplement_u+=u;return u;},
   hypoglycemia_rescue_fn:protocolPocRescue
 };
}
function rawEvents(samples,thr){const ev=[];let inRun=false;for(let i=0;i<samples.length;i++){const low=samples[i].x<thr;if(low&&!inRun){ev.push({t:samples[i].t,day:samples[i].day});inRun=true}else if(!low)inRun=false;}return ev}
function sustainedEvents(samples,thr){
 const ev=[];let active=false,belowStreak=0,aboveStreak=0,startIdx=-1;
 for(let i=0;i<samples.length;i++){
   const low=samples[i].x<thr;
   if(!active){
     if(low){belowStreak++;if(belowStreak===3){startIdx=i-2;ev.push({t:samples[startIdx].t,day:samples[startIdx].day});active=true;aboveStreak=0;}}
     else belowStreak=0;
   }else{
     if(low)aboveStreak=0;
     else{aboveStreak++;if(aboveStreak>=3){active=false;belowStreak=0;aboveStreak=0;startIdx=-1;}}
   }
 }
 return ev;
}
function isNoctEvent(e){return e.t>=1080||e.t<360}
function dayMetrics(series){
 const vals=[];let l54=0,l70=0,h180=0,tir140=0;
 for(let t=0;t<1440;t+=5){const x=series[t];vals.push(x);if(x<54)l54++;if(x<70)l70++;if(x>180)h180++;if(x>=140&&x<=180)tir140++;}
 const m=mean(vals),s=sd(vals);return{mean:m,sd:s,cv:m>0?100*s/m:NaN,tbr70:100*l70/vals.length,tbr54:100*l54/vals.length,tar180:100*h180/vals.length,tir140180:100*tir140/vals.length};
}
function simulatePatient(z,arm){
 const {i,p,adm}=z,tr=T.choose(i),o=BP.startingOrder(p,{admission_bg_mg_dl:adm},{renal_mode:arm.renal_mode}),counter={premeal_supplement_u:0,bedtime_supplement_u:0,scheduled_prandial_given_u:0};
 const cfg={days:7,titrate:true,allow_meal_mismatch:arm.meal_match,partial_meal_probability:.14,meal_shift_max_min:25,bolus_delay_max_min:0,underbolus_probability:0,allow_npo:false,bolus_tau_min:gp.candidate.tau_min,bolus_duration_min:gp.candidate.duration_min,
  titrate_order_fn:(ord,bg)=>BP.titrateBasal(ord,bg),
  state_modifier_fn:(ctx)=>({...T.statePatch(tr,ctx.day,i),...B.statePatch(M,.20),...frozenPatch(p),...treatmentPatch(ctx,arm,counter)})
 };
 const c=C.simulateCourse(M,D,p,o,cfg,i),dur=monitorDays(i),samples=[],poc=[],days=[];
 let basalSum=0,scheduledOrderPrandial=0;
 for(let k=0;k<dur;k++){
   const r=c.records[k+1],dm=dayMetrics(r.series);days.push(dm);
   basalSum+=r.order.basal_u;scheduledOrderPrandial+=r.order.breakfast_u+r.order.lunch_u+r.order.dinner_u;
   for(let t=0;t<1440;t+=5)samples.push({x:r.series[t],t,day:k+1});
   for(const t of BOGOTA_POC)poc.push(r.series[t]);
 }
 const vals=samples.map(s=>s.x),m=mean(vals),sdev=sd(vals);
 const raw70=rawEvents(samples,70),raw60=rawEvents(samples,60),raw40=rawEvents(samples,40),sus70=sustainedEvents(samples,70),sus54=sustainedEvents(samples,54);
 let l54=0,l70=0,h180=0,tir140=0;for(const x of vals){if(x<54)l54++;if(x<70)l70++;if(x>180)h180++;if(x>=140&&x<=180)tir140++;}
 return{
   monitor_days:dur,mean_bg:m,cv:m>0?100*sdev/m:NaN,tbr70:100*l70/vals.length,tbr54:100*l54/vals.length,tar180:100*h180/vals.length,tir140180:100*tir140/vals.length,
   raw_any70:raw70.length>0?1:0,raw_any60:raw60.length>0?1:0,raw_any40:raw40.length>0?1:0,raw_events70:raw70.length,raw_events60:raw60.length,raw_noct70:raw70.filter(isNoctEvent).length,
   sustained_any70:sus70.length>0?1:0,sustained_any54:sus54.length>0?1:0,sustained_events70:sus70.length,sustained_events54:sus54.length,sustained_noct70:sus70.filter(isNoctEvent).length,
   poc_mean:mean(poc),poc_low_observations:poc.filter(x=>x<70).length,
   first_tdd_ukg:(o.basal_u+o.breakfast_u+o.lunch_u+o.dinner_u)/p.body_weight_kg,
   mean_basal_u:basalSum/dur,mean_sched_order_prandial_u:scheduledOrderPrandial/dur,
   supplement_u_per_day:(counter.premeal_supplement_u+counter.bedtime_supplement_u)/dur,
   rescues_per_day:c.records.slice(1,1+dur).reduce((s,r)=>s+(r.hypoglycemia_rescues||[]).length,0)/dur,
   days
 };
}
const pts=[];
for(let i=1;i<=REQUESTED_N;i++){
 const p=P.sample(i,{preset:'support_sweep'}),age=Number(p.age_years),egfr=Number(p.egfr_ml_min_1_73m2);
 if(age<18||age>80||egfr<30)continue;
 const adm=Math.max(140,Math.min(400,Number(p.observed_fasting_glucose_mg_dl)||180));
 pts.push({i,p,adm,x:[(age-target.age)/target.age_sd,(p.bmi_kg_m2-target.bmi)/target.bmi_sd,(p.duration_years-target.duration)/target.duration_sd,(p.body_weight_kg-target.weight)/target.weight_sd,(adm-target.admission_bg)/target.admission_bg_sd]});
}
const ew=entropyWeights(pts.map(z=>z.x)),w=ew.p,ess=1/w.reduce((s,x)=>s+x*x,0);
function weightedBaseline(){
 const keys={age:z=>z.p.age_years,bmi:z=>z.p.bmi_kg_m2,duration:z=>z.p.duration_years,weight:z=>z.p.body_weight_kg,admission_bg:z=>z.adm,egfr:z=>z.p.egfr_ml_min_1_73m2,si:z=>z.p.si_relative};
 const o={};for(const [k,fn] of Object.entries(keys)){let s=0;for(let i=0;i<pts.length;i++)s+=w[i]*fn(pts[i]);o[k]=s;}return o;
}
function summarize(rows){
 const wm=k=>rows.reduce((s,r,i)=>s+w[i]*r[k],0);
 let rawNoctNum=0,rawNoctDen=0,susNoctNum=0,susNoctDen=0;for(let i=0;i<rows.length;i++){rawNoctNum+=w[i]*rows[i].raw_noct70;rawNoctDen+=w[i]*rows[i].raw_events70;susNoctNum+=w[i]*rows[i].sustained_noct70;susNoctDen+=w[i]*rows[i].sustained_events70;}
 const day=[];
 for(let d=0;d<6;d++){
   let zw=0;const sums={mean:0,sd:0,cv:0,tbr70:0,tbr54:0,tar180:0,tir140180:0};
   for(let i=0;i<rows.length;i++){if(rows[i].days.length<=d)continue;zw+=w[i];for(const k of Object.keys(sums))sums[k]+=w[i]*rows[i].days[d][k];}
   const out={day:d+1,n_weight:zw};for(const k of Object.keys(sums))out[k]=zw>0?sums[k]/zw:NaN;day.push(out);
 }
 return{
  mean_bg:wm('mean_bg'),cv_pct:wm('cv'),tbr70_pct:wm('tbr70'),tbr54_pct:wm('tbr54'),tar180_pct:wm('tar180'),tir140180_pct:wm('tir140180'),
  raw_any70_pct:100*wm('raw_any70'),raw_any60_pct:100*wm('raw_any60'),raw_any40_pct:100*wm('raw_any40'),raw_events70_per_patient:wm('raw_events70'),raw_events60_per_patient:wm('raw_events60'),raw_noct70_fraction_pct:rawNoctDen>0?100*rawNoctNum/rawNoctDen:0,
  sustained_any70_pct:100*wm('sustained_any70'),sustained_any54_pct:100*wm('sustained_any54'),sustained_events70_per_patient:wm('sustained_events70'),sustained_events54_per_patient:wm('sustained_events54'),sustained_noct70_fraction_pct:susNoctDen>0?100*susNoctNum/susNoctDen:0,
  poc_mean_bg:wm('poc_mean'),poc_low_observations_per_patient:wm('poc_low_observations'),
  first_tdd_ukg:wm('first_tdd_ukg'),mean_basal_u:wm('mean_basal_u'),mean_sched_order_prandial_u:wm('mean_sched_order_prandial_u'),supplement_u_per_day:wm('supplement_u_per_day'),rescues_per_day:wm('rescues_per_day'),day
 };
}
const armResults=[];
for(const arm of ARMS){
 const rows=[];for(const z of pts)rows.push(simulatePatient(z,arm));
 armResults.push({...arm,summary:summarize(rows)});
}
const out={
 purpose:'Independent Bogotá inpatient T2DM external validation of the frozen mass-action100 + CR V2 width10/reserve1 physiology. Treatment context is the single-center Gómez/RABBIT basal-bolus protocol. No Bogotá glycemic outcome is used to alter physiology, PK, basal potency, stress, phenotype weights, correction thresholds, rescue amount, or meal-match threshold.',
 frozen_candidate:{mass_action_reference_mg_dl:100,cr_width_mg_dl:10,cr_reserve:1,freeze_commit:'71c967785233763fe1522014004050dd2cdc38c7'},
 n:{requested:REQUESTED_N,eligible:pts.length,effective_sample_size:ess},baseline_target:target,baseline_matched:weightedBaseline(),monitoring_duration_model:{day3_only:12/34,through_day4:8/34,through_day5:10/34,through_day6:4/34,note:'Reproduces observed 34-patient CGM completion counts; CGM Day 1 maps to hospital treatment Day 2 because sensor insertion began on hospital Day 2.'},
 treatment_context:{start:'0.4 U/kg for admission BG 140-200, 0.5 U/kg for >200; primary age>=70 ->0.3 U/kg; eGFR<60 renal mapping is sensitivity only',split:'50% glargine / 50% glulisine divided across 3 meals',correction:'RABBIT usual scale 4/6/8/10/12/14/16 U for BG 141-180/181-220/221-260/261-300/301-350/351-400/>400; same usual scale at bedtime',daily_basal:'fasting 140-180 +10%; >180 +20%; observed POC <70 -> basal -20%',poc_rescue:'15 g oral glucose when scheduled POC <70, repeat POC at 15 min until >=70; hidden CGM never triggers rescue',poc_schedule:'03:00; premeal; 2 h postmeal; bedtime',nutrition:'standardized meals primary; existing 0.85 proportional meal-match structure is environment sensitivity only'},
 targets:{gomez2015:{cgm_mean_bg:176.2,poc_mean_bg:176.6,raw_any70_pct:26.3,raw_events70_per_patient:55/38,raw_events60_per_patient:30/38,raw_any40_pct:0,raw_noct70_fraction_pct:60,cgm_tar180_pct:36.8,poc_events70_per_patient:12/38},gomez2020_sustained15min:{sustained_any70_pct:14.7,sustained_any54_pct:5.8,sustained_events70_per_patient:.323,sustained_events54_per_patient:.059,noct70_fraction_pct:60,day1_sd:35.0,day1_cv:20.4,day_tbr70_pct:[.58,.26,.26,.28,.31,.26],day_tbr54_pct:[.06,.09,.09,.04,.06,.06]}},
 arms:armResults,
 guardrails:['Do not select an arm by closeness to Bogotá outcomes.','Age-only 0.3 U/kg mapping is primary because serum creatinine is not represented; age-or-eGFR60 is a renal-proxy sensitivity.','Standardized meal administration is primary; existing meal-match is an environment sensitivity.','No NPO, steroids, surgery, enteral/parenteral nutrition, ICU, or eGFR<30 patients.','Default trajectory weights are not tuned; their persistent-inflammatory weight 0.41 happens to be close to the independently reported 41.2% infection admission fraction but is not refit.','No hidden CGM rescue.','Any <40 is retained as a deep-safety diagnostic; observed Bogotá cohort had zero <40 episodes.']
};
const dir='analysis/bogota_frozen_composite_external';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify(out,null,2));
let md=['# Bogotá frozen-composite external validation','',`Eligible generated N=${pts.length}; entropy-weight ESS=${ess.toFixed(0)}.`,'',`Matched baseline: age ${out.baseline_matched.age.toFixed(1)}, BMI ${out.baseline_matched.bmi.toFixed(1)}, duration ${out.baseline_matched.duration.toFixed(1)}, weight ${out.baseline_matched.weight.toFixed(1)} kg, admission BG ${out.baseline_matched.admission_bg.toFixed(1)} mg/dL.`,'','Frozen physiology: mass-action100 + CR V2 width10/reserve1. No Bogotá outcome modifies it.','','| arm | mean | POC mean | >180 | raw any<70 | raw events<70/pt | raw events<60/pt | any<40 | sustained any<70 | sustained any<54 | sustained events<70/pt | events<54/pt | noct raw | first TDD/kg |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of armResults){const s=r.summary;md.push(`| ${r.name} | ${s.mean_bg.toFixed(1)} | ${s.poc_mean_bg.toFixed(1)} | ${s.tar180_pct.toFixed(1)}% | ${s.raw_any70_pct.toFixed(1)}% | ${s.raw_events70_per_patient.toFixed(2)} | ${s.raw_events60_per_patient.toFixed(2)} | ${s.raw_any40_pct.toFixed(2)}% | ${s.sustained_any70_pct.toFixed(1)}% | ${s.sustained_any54_pct.toFixed(1)}% | ${s.sustained_events70_per_patient.toFixed(3)} | ${s.sustained_events54_per_patient.toFixed(3)} | ${s.raw_noct70_fraction_pct.toFixed(1)}% | ${s.first_tdd_ukg.toFixed(3)} |`);}
md.push('','Published anchors: 2015 CGM mean 176.2, POC mean 176.6, CGM >180 36.8%, raw any<70 26.3%, raw events<70 1.45/patient, raw events<60 0.79/patient, no <40, 60% of hypo events dinner-to-06:00.','2020 stricter >=15-min anchors: any<70 14.7%, any<54 5.8%, events<70 0.323/patient, events<54 0.059/patient, 60% nocturnal.','','## Per-CGM-day low exposure (primary arm)','', '| CGM day | sim <70 | target <70 | sim <54 | target <54 | sim mean | sim CV |','|---|---:|---:|---:|---:|---:|---:|');
const primary=armResults.find(r=>r.primary).summary;const t70=out.targets.gomez2020_sustained15min.day_tbr70_pct,t54=out.targets.gomez2020_sustained15min.day_tbr54_pct;
for(let d=0;d<6;d++){const x=primary.day[d];md.push(`| ${d+1} | ${x.tbr70.toFixed(2)}% | ${t70[d].toFixed(2)}% | ${x.tbr54.toFixed(2)}% | ${t54[d].toFixed(2)}% | ${x.mean.toFixed(1)} | ${x.cv.toFixed(1)}% |`);}
md.push('','Interpretation guardrail: report all pre-specified arms. If conclusions depend strongly on renal mapping or oral-intake assumptions, classify the dataset as context-sensitive rather than tuning the frozen candidate.');
fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));
