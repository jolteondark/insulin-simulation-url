#!/usr/bin/env node
'use strict';

// Validation-only decomposition of the frozen engine's glucose increment.
// No production source file is changed. The engine source is instrumented in
// memory to expose per-minute meal, rapid-bolus, basal-delta, restore,
// counterregulation and hepatic contributions.
// Run from repository root:
//   node validation/scripts/daytime_component_decomposition.js

const fs=require('fs'),vm=require('vm'),path=require('path');
const OUT=process.env.OUT||'validation/results/daytime_component_decomposition_latest.json';
let E=fs.readFileSync('engine.js','utf8');
const G=fs.readFileSync('patient_generator.js','utf8');
const N=Number(process.env.N||60),DAYS=Number(process.env.DAYS||7),MEALS=[480,780,1140];

const sig1="const g=new Float64Array(n);g[0]=startG==null?p.fasting_setpoint_mg_dl:Number(startG);let mn=g[0],mx=g[0];";
const rep1="const g=new Float64Array(n);g[0]=startG==null?p.fasting_setpoint_mg_dl:Number(startG);let mn=g[0],mx=g[0];const comp={meal:new Float64Array(n),bolus:new Float64Array(n),basal:new Float64Array(n),restore:new Float64Array(n),counter:new Float64Array(n),hepatic:new Float64Array(n)};";
const sig2="const insulinScale=infScale*steroidSensitivity(t,prednisone,response),restore=-kh*(g[t]-p.fasting_setpoint_mg_dl),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t]));\n    g[t+1]=g[t]+cg*meal[t]-ig*insulinScale*bol[t]-ig*insulinScale*basalDelta[t]+restore+counter+hepatic;";
const rep2="const insulinScale=infScale*steroidSensitivity(t,prednisone,response),restore=-kh*(g[t]-p.fasting_setpoint_mg_dl),counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t]));const mt=cg*meal[t],bt=-ig*insulinScale*bol[t],bd=-ig*insulinScale*basalDelta[t];comp.meal[t]=mt;comp.bolus[t]=bt;comp.basal[t]=bd;comp.restore[t]=restore;comp.counter[t]=counter;comp.hepatic[t]=hepatic;\n    g[t+1]=g[t]+mt+bt+bd+restore+counter+hepatic;";
const sig3="return{bg,min:mn,max:mx,end:g[n-1],series:g};";
const rep3="return{bg,min:mn,max:mx,end:g[n-1],series:g,components:comp};";
if(!E.includes(sig1)||!E.includes(sig2)||!E.includes(sig3))throw new Error('engine signature changed');
E=E.replace(sig1,rep1).replace(sig2,rep2).replace(sig3,rep3);

function context(src){const c={console,Float64Array,Math,Number,String,Object,Array,JSON,Date,Set,Map};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(src,c);return c;}
function median(a){a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length;}

const q=context(E);vm.runInContext(G,q);
const keys=['meal','bolus','basal','restore','counter','hepatic'];
const rows=[],curves=Array.from({length:181},()=>({meal:[],bolus:[],restore:[],net:[]}));
for(let i=0;i<N;i++){
  const seed=980001+i,x=q.PatientGenerator.generate(seed);let start=x.case.previous_day_end_glucose_mg_dl;
  for(let d=0;d<DAYS;d++){
    const o=x.case.previous_order_u;
    const res=q.GlucoseEngine.simulate(x.patient,x.case,{breakfast_u:o.breakfast_u,lunch_u:o.lunch_u,dinner_u:o.dinner_u},o.basal_u,seed+d*997,start);start=res.end;
    for(const mt of MEALS){
      for(let u=0;u<=180;u++){
        const meal=res.components.meal[mt+u]||0,bolus=res.components.bolus[mt+u]||0,restore=res.components.restore[mt+u]||0;
        curves[u].meal.push(meal);curves[u].bolus.push(bolus);curves[u].restore.push(restore);curves[u].net.push(meal+bolus+restore);
      }
      const row={meal_time:mt,dg60:res.series[mt+60]-res.series[mt],dg120:res.series[mt+120]-res.series[mt],dg180:res.series[mt+180]-res.series[mt]};
      for(const k of keys){
        for(const [name,a,b] of [['w0_60',mt,mt+60],['w60_120',mt+60,mt+120],['w120_180',mt+120,mt+180],['cum0_120',mt,mt+120],['cum0_180',mt,mt+180]]){
          let s=0;for(let t=a;t<b;t++)s+=res.components[k][t];row[`${k}_${name}`]=s;
        }
      }
      rows.push(row);
    }
  }
}
const out={protocol:{N,DAYS,events:rows.length,seeds:`980001..${980000+N}`,engine:'0.94-browser-port',generator:'0.79-browser-port'},summary:{}};
for(const period of ['w0_60','w60_120','w120_180','cum0_120','cum0_180']){
  out.summary[period]={};
  for(const k of keys){const a=rows.map(r=>r[`${k}_${period}`]);out.summary[period][k]={median:median(a),mean:mean(a)};}
}
out.curves=curves.map((c,u)=>({u,meal:median(c.meal),bolus:median(c.bolus),restore:median(c.restore),net:median(c.net)}));
out.first_median_net_negative_after_meal=out.curves.find(c=>c.u>=15&&c.net<0)||null;
out.glucose={dg60:{median:median(rows.map(r=>r.dg60)),mean:mean(rows.map(r=>r.dg60))},dg120:{median:median(rows.map(r=>r.dg120)),mean:mean(rows.map(r=>r.dg120))},dg180:{median:median(rows.map(r=>r.dg180)),mean:mean(rows.map(r=>r.dg180))}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
