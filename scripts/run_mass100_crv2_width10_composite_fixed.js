#!/usr/bin/env node
'use strict';
const fs=require('fs'),Module=require('module'),path=require('path');
const filename=path.resolve('scripts/audit_mass100_crv2_width10_composite.fixed.js');
let s=fs.readFileSync('scripts/audit_mass100_crv2_width10_composite.js','utf8');
s=s.replace(/^#!.*\n/,'');
const bad="'|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];for(const r of rows){const e=r.external;";
const good="'|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');for(const r of rows){const e=r.external;";
if(!s.includes(bad))throw new Error('expected report-only syntax defect not found');
s=s.replace(bad,good);
const m=new Module(filename,module);
m.filename=filename;
m.paths=Module._nodeModulePaths(path.dirname(filename));
m._compile(s,filename);
