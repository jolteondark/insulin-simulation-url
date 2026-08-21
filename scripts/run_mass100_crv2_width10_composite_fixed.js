#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');
let s=fs.readFileSync('scripts/audit_mass100_crv2_width10_composite.js','utf8');
s=s.replace(/^#!.*\n/,'');
const bad="'|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];for(const r of rows){const e=r.external;";
const good="'|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');for(const r of rows){const e=r.external;";
if(!s.includes(bad))throw new Error('expected report-only syntax defect not found');
s=s.replace(bad,good);
vm.runInThisContext(s,{filename:'audit_mass100_crv2_width10_composite.fixed.js'});
