#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');global.window=global;
vm.runInThisContext(fs.readFileSync('t2dm_inpatient_trajectory_v1_exp.js','utf8'),{filename:'t2dm_inpatient_trajectory_v1_exp.js'});
const T=T2DMInpatientTrajectoryV1Exp;
const seed=101,rows=[];
for(const k of Object.keys(T.PROFILES))rows.push({trajectory:k,stress:Array.from({length:8},(_,i)=>T.stressFor(k,i+1,seed)),admission:T.admissionOffset(k,seed)});
const by=Object.fromEntries(rows.map(x=>[x.trajectory,x]));
const checks=[
 ['persistent remains stressed at day 8',by.persistent_inflammatory.stress[7]>=.25],
 ['resolving is near baseline by day 8',by.resolving_acute.stress[7]<=.08],
 ['stable starts below resolving',by.moderate_stable.stress[0]<by.resolving_acute.stress[0]],
 ['persistent exceeds resolving from day 4 onward',by.persistent_inflammatory.stress.slice(3).every((x,i)=>x>by.resolving_acute.stress[i+3])],
 ['all profiles bounded 0 to 1',rows.every(r=>r.stress.every(x=>x>=0&&x<=1))]
];
const dir='analysis/t2dm_inpatient_trajectory_profiles';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/results.json',JSON.stringify({version:T.version,weights:T.DEFAULT_WEIGHTS,rows,checks},null,2));
let md=['# T2DM inpatient trajectory profile audit','','Pre-specified structural audit. This does not use glucose outcomes.','','| trajectory | admission offset | day1 | day2 | day3 | day4 | day5 | day6 | day7 | day8 |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];for(const r of rows)md.push(`| ${r.trajectory} | ${r.admission.toFixed(1)} | ${r.stress.map(x=>x.toFixed(2)).join(' | ')} |`);md+=['','## Checks'];for(const [n,ok] of checks)md.push(`- ${ok?'PASS':'FAIL'} — ${n}`);md+=['','## Guardrails','- No glucose metrics are used to define or test these profiles.','- DEFAULT_WEIGHTS are sensitivity anchors, not prevalence estimates.','- Do not alter trajectory shape after seeing Emory fit without independent clinical justification.'];fs.writeFileSync(dir+'/report.md',md.join('\n')+'\n');console.log(md.join('\n'));if(checks.some(x=>!x[1]))process.exitCode=2;
