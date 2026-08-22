(function(){
'use strict';
const roundUnit=x=>Math.max(0,Math.round(Number(x)||0));
const POC_MIN={night:180,pre_breakfast:465,pre_lunch:765,pre_dinner:1125,bedtime:1320};
function copyOrder(o){return{breakfast_u:roundUnit(o&&o.breakfast_u),lunch_u:roundUnit(o&&o.lunch_u),dinner_u:roundUnit(o&&o.dinner_u),basal_u:roundUnit(o&&o.basal_u)}}
function reducedStart(patient){
 const age=Number(patient&&patient.age_years)||60,egfr=Number(patient&&patient.egfr_ml_min_1_73m2)||90,bmi=Number(patient&&patient.bmi_kg_m2)||25;
 return age>75||(egfr>0&&egfr<=60)||bmi<=22.5;
}
function startingOrder(patient){
 const weight=Math.max(30,Number(patient&&patient.body_weight_kg)||70),ukg=reducedStart(patient)?.20:.25;
 return{breakfast_u:0,lunch_u:0,dinner_u:0,basal_u:roundUnit(ukg*weight)};
}
function startingPrandial(patient){
 const weight=Math.max(30,Number(patient&&patient.body_weight_kg)||70),ukg=reducedStart(patient)?.20:.25,total=roundUnit(ukg*weight),base=Math.floor(total/3),rem=total-base*3;
 return{breakfast_u:base+(rem>0?1:0),lunch_u:base+(rem>1?1:0),dinner_u:base};
}
function correctionTier(bg){
 bg=Number(bg);if(!Number.isFinite(bg)||bg<180)return{base:0,change:0};
 if(bg<=214)return{base:4,change:2};
 if(bg<=286)return{base:6,change:3};
 if(bg<=358)return{base:8,change:4};
 return{base:10,change:6};
}
function supplement(bg,mode='recommended'){
 const t=correctionTier(bg);if(mode==='sensitive')return Math.max(0,t.base-t.change);if(mode==='resistant')return t.base+t.change;return t.base;
}
function pctForSignal(bg,hadHypo=false){
 bg=Number(bg);if(!Number.isFinite(bg))return 0;
 if(bg<54)return-.30;if(bg<70)return-.20;if(bg<100)return-.10;if(bg<=140)return 0;
 if(hadHypo)return 0;
 if(bg<=180)return.10;if(bg<=270)return.20;return.30;
}
function adjustPct(u,pct){return roundUnit(Number(u||0)*(1+pct))}
function observedPoc(record){const s=record&&record.series;if(!s)return null;return{night:Number(s[POC_MIN.night]),pre_breakfast:Number(s[POC_MIN.pre_breakfast]),pre_lunch:Number(s[POC_MIN.pre_lunch]),pre_dinner:Number(s[POC_MIN.pre_dinner]),bedtime:Number(s[POC_MIN.bedtime])}}
function anyObservedHypo(record){const p=observedPoc(record);return !!(p&&Object.values(p).some(x=>Number.isFinite(x)&&x<70))}
function ruleSignal(vals){
 vals=(vals||[]).map(Number).filter(Number.isFinite);if(!vals.length)return NaN;
 const low=vals.filter(x=>x<100);if(low.length)return Math.min(...low);
 return Math.max(...vals);
}
function observedDaytimeHigh(record){const p=observedPoc(record);return !!(p&&[p.pre_lunch,p.pre_dinner,p.bedtime].some(x=>Number(x)>180))}
function titratePoc(order,bg,ctx={},opts={}){
 const o=copyOrder(order),records=ctx.course&&ctx.course.records||[],last=records[records.length-1],poc=observedPoc(last),hadHypo=anyObservedHypo(last);
 const prandialStarted=(o.breakfast_u+o.lunch_u+o.dinner_u)>0;
 if(!prandialStarted){
   const n=Math.max(1,Math.min(2,Math.round(Number(opts.prandial_start_days)||2)));
   let persistent=records.length>=n;
   for(let k=0;k<n&&persistent;k++)persistent=observedDaytimeHigh(records[records.length-1-k]);
   if(persistent){const p=startingPrandial(ctx.patient);o.breakfast_u=p.breakfast_u;o.lunch_u=p.lunch_u;o.dinner_u=p.dinner_u;}
 }
 if(poc){
   const basalSig=ruleSignal([poc.night,poc.pre_breakfast]);
   o.basal_u=adjustPct(o.basal_u,pctForSignal(basalSig,hadHypo));
   if((o.breakfast_u+o.lunch_u+o.dinner_u)>0){
     o.breakfast_u=adjustPct(o.breakfast_u,pctForSignal(poc.pre_lunch,hadHypo));
     o.lunch_u=adjustPct(o.lunch_u,pctForSignal(poc.pre_dinner,hadHypo));
     o.dinner_u=adjustPct(o.dinner_u,pctForSignal(poc.bedtime,hadHypo));
   }
 }
 return o;
}
function correctionModeFromCourse(course){
 const rs=course&&course.records||[];if(rs.length<2)return'recommended';
 const a=rs[rs.length-2].order,b=rs[rs.length-1].order;if(!a||!b)return'recommended';
 let up=false,down=false;for(const k of['basal_u','breakfast_u','lunch_u','dinner_u']){if(Number(b[k])>Number(a[k]))up=true;if(Number(b[k])<Number(a[k]))down=true;}
 if(up&&!down)return'resistant';if(down&&!up)return'sensitive';return'recommended';
}
window.T2DMTreatmentPolicyDiatecPocExp={
 version:'0.2-observable-only-poc-context-exp-2026-08-22',POC_MIN,copyOrder,reducedStart,startingOrder,startingPrandial,correctionTier,supplement,pctForSignal,observedPoc,anyObservedHypo,ruleSignal,observedDaytimeHigh,titratePoc,correctionModeFromCourse,
 note:'Context-specific DIATEC POC-arm policy. Published starting basal 0.25 U/kg or 0.20 U/kg for age>75/eGFR<=60/BMI<=22.5; prandial starts at the same total U/kg after observed daytime POC hyperglycemia for a pre-specified 1- or 2-day sensitivity; correction scale is 4/6/8/10 U with optional trend-guided sensitive/resistant adjustment as a sensitivity only. Basal/prandial titration uses only the five scheduled observable POC points (03:00, premeal, 22:00), rule-of-lowest/extremes, and published +/-10/20/30% steps. No hidden CGM/minute-series value is used for a treatment decision. Home insulin continuation is not represented because patient-level home doses are unavailable.'
};
})();
