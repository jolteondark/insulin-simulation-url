#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
vm.runInThisContext(fs.readFileSync('t2dm_treatment_policy_weight_bg_exp.js','utf8'));
const TP=T2DMTreatmentPolicyWeightBgExp;
function tdd(o){return o.breakfast_u+o.lunch_u+o.dinner_u+o.basal_u}
function make(egfr,age=55){return{body_weight_kg:100,age_years:age,egfr_ml_min_1_73m2:egfr,observed_fasting_glucose_mg_dl:250}}
const rows=[25,45,60,75].map(e=>{const o=TP.startingOrder(make(e),{admission_bg_mg_dl:250});return{egfr:e,order:o,tdd:tdd(o)}});
const old75=TP.startingOrder(make(75),{admission_bg_mg_dl:250});
const elderly=TP.startingOrder(make(75,78),{admission_bg_mg_dl:250});
const checks=[
 ['eGFR25 uses renal-reduced start',rows[0].tdd>=28&&rows[0].tdd<=32],
 ['eGFR45 uses renal-reduced start',rows[1].tdd>=28&&rows[1].tdd<=32],
 ['eGFR60 uses renal-reduced start',rows[2].tdd>=28&&rows[2].tdd<=32],
 ['eGFR75 uses standard high-BG start',tdd(old75)>=48&&tdd(old75)<=52],
 ['age>70 remains conservative independent of normal eGFR',tdd(elderly)>=28&&tdd(elderly)<=32]
];
console.log(JSON.stringify({rows,elderly,checks},null,2));
if(checks.some(x=>!x[1]))process.exitCode=2;
