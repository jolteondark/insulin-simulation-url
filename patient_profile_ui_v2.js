(function(){
'use strict';
function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash32(seed);return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function publicProfile(p,seed){
  const r=rng(`public-profile:${seed}:${p.candidate_id||''}`);
  const age=Math.max(18,Math.min(85,Math.round(18+58*Math.pow(r(),.82))));
  const maxDuration=Math.max(1,age-4);
  const duration=Math.max(1,Math.min(maxDuration,Math.round(1+Math.pow(r(),1.15)*Math.min(35,maxDuration))));
  return{
    age_years:age,
    sex:p.sex==='female'?'女性':'男性',
    height_cm:Math.round(Number(p.height_cm)),
    weight_kg:Math.round(Number(p.body_weight_kg)*10)/10,
    bmi:Math.round(Number(p.bmi_kg_m2)*10)/10,
    t1dm_duration_years:duration
  };
}
function renderProfile(){
  if(typeof state==='undefined'||!state||!state.p)return;
  const card=document.querySelector('.patient-card');
  if(!card)return;
  let box=document.getElementById('patientProfileV2');
  if(!box){
    box=document.createElement('div');
    box.id='patientProfileV2';
    box.style.cssText='margin-top:12px;padding-top:11px;border-top:1px solid #eceef2;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px 10px';
    const rule=card.querySelector('.rule-line');
    if(rule)card.insertBefore(box,rule);else card.appendChild(box);
  }
  const q=publicProfile(state.p,state.seed);
  const cells=[['年齢',`${q.age_years}歳`],['性別',q.sex],['身長',`${q.height_cm} cm`],['体重',`${q.weight_kg} kg`],['BMI',q.bmi.toFixed(1)],['T1DM歴',`${q.t1dm_duration_years}年`]];
  box.innerHTML=cells.map(([k,v])=>`<div style="min-width:0"><div style="font-size:9px;color:#8b919a;margin-bottom:2px">${k}</div><div style="font-size:14px;font-weight:760;color:#262a31">${v}</div></div>`).join('');
}
const originalRender=render;
render=function(){originalRender();renderProfile();};
renderProfile();
})();
