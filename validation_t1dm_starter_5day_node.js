const fs=require('fs'),vm=require('vm');
function load(path){vm.runInThisContext('var window=globalThis;'+fs.readFileSync(path,'utf8'),{filename:path});}
load('patient_generator.js');load('patient_phenotype_v2.js');load('clinical_modifiers_v2.js');load('t1dm_game_model_v2.js');load('t1dm_game_starter_policy_v2.js');
const N=Number(process.env.N||300),D=5;
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function intake(seed){const r=rng(seed),out={};for(const k of ['breakfast','lunch','dinner']){const u=r();out[k]=u<.46?1:u<.66?.8:u<.76?.6:u<.88?1.2:u<.95?.5:1.4}return out}
const aliveByDay=Array(D).fill(0),death={low:0,high:0},deathDay=Array(D).fill(0);let priorSafe=0;
for(let i=0;i<N;i++){
  const seed=500000+i*7919,game=T1DMGameModelV2.generatePatient(seed),order={...game.case.previous_order_u};
  const prior=T1DMGameModelV2.simulateDay(game.patient,order,{intake_fraction:{breakfast:1,lunch:1,dinner:1}},(seed^0xA5A5A5A5)>>>0,null);
  if(prior.min<70||prior.max>400)continue;priorSafe++;game.state=prior.next_state;
  let alive=true;
  for(let d=0;d<D;d++){
    if(!alive)break;
    const r=T1DMGameModelV2.playDay(game,order,{intake_fraction:intake(seed+d*104729)},(seed+(d+1)*104729)>>>0);
    if(r.min<70){death.low++;deathDay[d]++;alive=false;continue}
    if(r.max>400){death.high++;deathDay[d]++;alive=false;continue}
    aliveByDay[d]++;
  }
}
const pct=x=>priorSafe?100*x/priorSafe:0;
const out={N,prior_safe:priorSafe,prior_safe_pct:100*priorSafe/N,alive_by_day:aliveByDay,alive_pct_by_day:aliveByDay.map(pct),death,death_day:deathDay,starter_scale:T1DMGameStarterPolicyV2.SCALE};
fs.writeFileSync('t1dm_starter_5day_result.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
