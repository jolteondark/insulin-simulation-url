#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync('scripts/audit_counterregulation_v2_egp.js','utf8').replace(/^#!.*\n/,'');
const broken="Emory.','','| arm | Shanghai";
const fixed="Emory.`,'','| arm | Shanghai";
if(!src.includes(broken))throw new Error('Expected report-template typo not found');
src=src.replace(broken,fixed);
vm.runInThisContext(src,{filename:'scripts/audit_counterregulation_v2_egp.js'});
