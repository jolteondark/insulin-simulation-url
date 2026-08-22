#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
vm.runInThisContext(fs.readFileSync('t2dm_patient_phenotype_v1_shanghai_exp.js','utf8'),{filename:'t2dm_patient_phenotype_v1_shanghai_exp.js'});
vm.runInThisContext(fs.readFileSync('t2dm_patient_phenotype_v2_shanghai106_exp.js','utf8'),{filename:'t2dm_patient_phenotype_v2_shanghai106_exp.js'});
require('./audit_glargine_time_profile_sensitivity.js');
