#!/usr/bin/env node
'use strict';

// Standalone local validation runner. No GitHub Actions dependency.
// Run from repository root: node validation/scripts/daytime_phase_lock_screen.js

const fs = require('fs');
const vm = require('vm');

const ENGINE_PATH = 'engine.js';
const GENERATOR_PATH = 'patient_generator.js';
const OUT_PATH = process.env.OUT || 'validation/results/daytime_phase_lock_screen_latest.json';
const N = Number(process.env.N || 40);
const DAYS = Number(process.env.DAYS || 8);
const LAGS = [30, 60, 120, 240];
const BASE_MEALS = [480, 780, 1140];

const TARGET = {
  day: {30: 0.8356734642, 60: 0.5790031609, 120: 0.1024831789, 240: -0.0541005771},
  marginal: {mean: 145.08, cv: 32.47, TIR: 79.09, TBR70: 1.589, TBR54: 0.296, TAR180: 19.32, TAR250: 3.46}
};

const E0 = fs.readFileSync(ENGINE_PATH, 'utf8');
const G = fs.readFileSync(GENERATOR_PATH, 'utf8');

const mealLine = 'const mealEvents=[[MEAL_TIMES[0],mealPlan.breakfast*intake.breakfast],[MEAL_TIMES[1],mealPlan.lunch*intake.lunch],[MEAL_TIMES[2],mealPlan.dinner*intake.dinner]];';
const bolusLine = 'const bolusEvents=[[RAPID_TIMES[0],rapidOrder.breakfast_u],[RAPID_TIMES[1],rapidOrder.lunch_u],[RAPID_TIMES[2],rapidOrder.dinner_u]];';

function patchEngine(peak, duration) {
  let e = E0;
  if (!e.includes(mealLine) || !e.includes(bolusLine)) throw new Error('engine timing signature changed');
  e = e.replace(
    mealLine,
    "const __mt=ctx.meal_times_min||MEAL_TIMES,__rt=ctx.rapid_times_min||RAPID_TIMES;const mealEvents=[[__mt[0],mealPlan.breakfast*intake.breakfast],[__mt[1],mealPlan.lunch*intake.lunch],[__mt[2],mealPlan.dinner*intake.dinner]];"
  ).replace(
    bolusLine,
    'const bolusEvents=[[__rt[0],rapidOrder.breakfast_u],[__rt[1],rapidOrder.lunch_u],[__rt[2],rapidOrder.dinner_u]];'
  );
  if (peak !== 105 || duration !== 300) {
    const sig = "return shiftedGammaTaper(15,105,300,h,3)";
    if (!e.includes(sig)) throw new Error('aspart profile signature changed');
    e = e.replace(sig, `return shiftedGammaTaper(15,${peak},${duration},h,3)`);
  }
  return e;
}

function context(src) {
  const c = {console, Float64Array, Math, Number, String, Object, Array, JSON, Date, Set, Map};
  c.window = c;
  c.globalThis = c;
  vm.createContext(c);
  vm.runInContext(src, c);
  return c;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function corr(a, b) {
  const n = a.length;
  if (n < 50) return NaN;
  let sx=0, sy=0, sxx=0, syy=0, sxy=0;
  for (let i=0; i<n; i++) {
    const x=a[i], y=b[i];
    sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y;
  }
  return (n*sxy-sx*sy) / Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));
}

function median(a) {
  a = a.filter(Number.isFinite).sort((x,y)=>x-y);
  return a.length % 2 ? a[(a.length-1)/2] : (a[a.length/2-1]+a[a.length/2])/2;
}

const base = context(E0);
vm.runInContext(G, base);
const cohort = [];
for (let i=0; i<N; i++) {
  const seed = 960001+i;
  const x = base.PatientGenerator.generate(seed);
  cohort.push({seed, p: structuredClone(x.patient), c: structuredClone(x.case)});
}

function dailyMultipliers(mode, amplitude, seed, day) {
  if (amplitude === 0) return [1,1,1];
  const r = rng((seed + day*10007 + Math.round(amplitude*100000)) >>> 0);
  if (mode === 'shared') {
    const m = 1-amplitude+r()*(2*amplitude);
    return [m,m,m];
  }
  return [0,1,2].map(() => 1-amplitude+r()*(2*amplitude));
}

function run(config) {
  const q = context(patchEngine(config.peak, config.duration));
  const acfByLag = Object.fromEntries(LAGS.map(l => [l, []]));
  let n=0, sum=0, sum2=0, tir=0, lo=0, lo54=0, hi=0, hi250=0;

  for (const z of cohort) {
    let start = z.c.previous_day_end_glucose_mg_dl;
    const series = [];
    for (let d=0; d<DAYS; d++) {
      const mult = dailyMultipliers(config.mode, config.carbAmp, z.seed, d);
      const cc = structuredClone(z.c);
      cc.meal_plan_carb_g = {breakfast:50*mult[0], lunch:70*mult[1], dinner:60*mult[2]};
      const o = cc.previous_order_u;
      const res = q.GlucoseEngine.simulate(
        z.p, cc,
        {breakfast_u:o.breakfast_u, lunch_u:o.lunch_u, dinner_u:o.dinner_u},
        o.basal_u, z.seed+d*997, start
      );
      start = res.end;
      for (let t=0; t<1440; t+=5) series.push({g:res.series[t], tod:t});
    }

    for (const lag of LAGS) {
      const k = lag/5, a=[], b=[];
      for (let i=0; i+k<series.length; i++) {
        const x=series[i], y=series[i+k];
        if (x.tod>=360 && y.tod>=360) { a.push(x.g); b.push(y.g); }
      }
      acfByLag[lag].push(corr(a,b));
    }

    for (const x of series) {
      const g=x.g;
      n++; sum+=g; sum2+=g*g;
      if (g>=70 && g<=180) tir++;
      if (g<70) lo++;
      if (g<54) lo54++;
      if (g>180) hi++;
      if (g>250) hi250++;
    }
  }

  const mean=sum/n;
  const sd=Math.sqrt((sum2-sum*sum/n)/(n-1));
  const acf=Object.fromEntries(LAGS.map(l => [l, median(acfByLag[l])]));
  const rmse=Math.sqrt(LAGS.reduce((s,l)=>s+(acf[l]-TARGET.day[l])**2,0)/LAGS.length);
  return {
    ...config, acf, day_acf_rmse:rmse, mean, cv:100*sd/mean,
    TIR:100*tir/n, TBR70:100*lo/n, TBR54:100*lo54/n,
    TAR180:100*hi/n, TAR250:100*hi250/n
  };
}

const configs = [{peak:105,duration:300,carbAmp:0,mode:'independent'}];
for (const peak of [110,120,130]) {
  for (const duration of [330,360,390]) {
    for (const carbAmp of [0.05,0.10,0.15]) configs.push({peak,duration,carbAmp,mode:'independent'});
  }
}
for (const mode of ['shared','independent']) {
  for (const [peak,duration] of [[105,300],[110,390]]) {
    for (const carbAmp of [0.05,0.10,0.15,0.20]) configs.push({peak,duration,carbAmp,mode});
  }
}

const seen = new Set();
const unique = configs.filter(c => {
  const k=JSON.stringify(c);
  if (seen.has(k)) return false;
  seen.add(k); return true;
});

const results = unique.map((c,i) => {
  const r=run(c);
  console.error(`${i+1}/${unique.length}`, c, 'RMSE=',r.day_acf_rmse.toFixed(3),'TBR70=',r.TBR70.toFixed(2));
  return r;
});
results.sort((a,b)=>a.day_acf_rmse-b.day_acf_rmse);

const payload = {
  generated_at: new Date().toISOString(),
  protocol: {N,DAYS,seeds:`960001..${960000+N}`,sampling_min:5,daytime:'06:00-24:00'},
  source_versions: {engine:'0.94-browser-port',generator:'0.79-browser-port'},
  target: TARGET,
  results
};
fs.mkdirSync(require('path').dirname(OUT_PATH), {recursive:true});
fs.writeFileSync(OUT_PATH, JSON.stringify(payload,null,2));
console.log(JSON.stringify(payload,null,2));
