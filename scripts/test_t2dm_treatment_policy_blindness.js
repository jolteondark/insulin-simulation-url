#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
vm.runInThisContext(fs.readFileSync('t2dm_treatment_policy_weight_bg_exp.js','utf8'));
const P=T2DMTreatmentPolicyWeightBgExp;
const common={body_weight_kg:80,age_years:55,egfr_ml_min_1_73m2:90,observed_fasting_glucose_mg_dl:240};
const a={...common,si_relative:.35,beta_cell_reserve:.10,hepatic_ir:1.6};
const b={...common,si_relative:1.35,beta_cell_reserve:.85,hepatic_ir:.7};
const oa=P.startingOrder(a),ob=P.startingOrder(b);
if(JSON.stringify(oa)!==JSON.stringify(ob))throw new Error('policy leaked hidden physiology');
const c=P.startingOrder({...common,age_years:75});
if(c.basal_u+c.breakfast_u+c.lunch_u+c.dinner_u>Math.round(.3*80)+2)throw new Error('older-patient reduction failed');
console.log(JSON.stringify({pass:true,hidden_physiology_same_order:oa,older_reduced_order:c},null,2));
