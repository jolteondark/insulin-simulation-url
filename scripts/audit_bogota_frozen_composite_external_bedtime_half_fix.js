#!/usr/bin/env node
'use strict';
const fs=require('fs'),Module=require('module');
const srcPath='scripts/audit_bogota_frozen_composite_external.js';
let src=fs.readFileSync(srcPath,'utf8');
const old="bedtime_correction_fn:({glucose_mg_dl})=>{const u=BP.supplement(glucose_mg_dl,'usual');counter.bedtime_supplement_u+=u;return u;}";
const neu="bedtime_correction_fn:({glucose_mg_dl})=>{const u=BP.bedtimeSupplement(glucose_mg_dl,'usual');counter.bedtime_supplement_u+=u;return u;}";
if(!src.includes(old))throw new Error('Expected Bogotá bedtime full-scale callback not found');
src=src.replace(old,neu);
if(src.includes(old))throw new Error('Unexpected duplicate Bogotá bedtime callback remained');
const m=new Module(srcPath,module);
m.filename=srcPath;m.paths=module.paths;
m._compile(src,srcPath);
