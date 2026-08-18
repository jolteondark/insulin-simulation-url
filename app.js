const labels={pre_breakfast:'朝前',pre_lunch:'昼前',pre_dinner:'夕前',bedtime:'眠前'};
const doseLabels={breakfast_u:'朝 rapid',lunch_u:'昼 rapid',dinner_u:'夕 rapid',basal_u:'眠前 basal'};
const mealLabels={breakfast:'朝食',lunch:'昼食',dinner:'夕食'};
let state,runCounter=0;
const $=s=>document.querySelector(s);

function rng(seed){let a=seed>>>0;return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function newSeed(){runCounter++;let x=(Date.now()^(runCounter*2654435761))>>>0;try{const a=new Uint32Array(1);crypto.getRandomValues(a);x^=a[0]}catch{}return x>>>0}
function fmt(x){return Number(x).toFixed(Number(x)%1?1:0)}
function mealClass(v){return v<=.5?'low':v<.9?'reduced':''}
function bgStyle(v){return v<70?'color:#c53a3a':v>180?'color:#b86b15':''}
function clock(minute){const m=((Math.round(minute)%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}

function sampleVisibleIntake(day){
  const r=rng((state.seed+day*7919+71)>>>0),out={};
  for(const k of ['breakfast','lunch','dinner']){
    const base=state.case.intake_fraction[k]??1;
    if(base>=.95){const u=r();out[k]=u<.50?1:u<.74?.8:u<.84?.6:u<.94?1.2:.5}
    else{const shift=Math.round((r()-.5)*4)/10;out[k]=clamp(Math.round((base+shift)*10)/10,.2,1.2)}
  }
  return out;
}

function simulatePriorPhysicianDay(c,p,seed){
  const rapid={breakfast_u:c.previous_order_u.breakfast_u,lunch_u:c.previous_order_u.lunch_u,dinner_u:c.previous_order_u.dinner_u};
  return GlucoseEngine.simulate(p,c,rapid,c.previous_order_u.basal_u,seed,p.fasting_setpoint_mg_dl);
}

function startGenerated(seed=newSeed()){
  let bundle;
  try{bundle=PatientGenerator.generate(seed)}catch(e){console.error(e);bundle=PatientGenerator.generate((seed+0x9E3779B9)>>>0)}
  const c=bundle.case,p=bundle.patient;
  const prior=simulatePriorPhysicianDay(c,p,seed);
  state={seed,case:c,p,day:1,bg:{...c.previous_day_4point_bg_mg_dl},prevOrder:{...c.previous_order_u},prevIntake:{...c.intake_fraction},previousBasal:c.previous_order_u.basal_u,lastEnd:prior.end,over:false,history:[],generatorAttempts:bundle.attempts,currentIntake:null};
  state.currentIntake=sampleVisibleIntake(state.day);
  render();
}

function context(c){
  const b=[];
  b.push(`<span class="badge">eGFR ${Math.round(c.egfr_ml_min_1_73m2)}</span>`);
  if(c.infection_severity>0)b.push(`<span class="badge warn">感染 / ${c.fever_c.toFixed(1)}℃</span>`);
  if(c.prednisone_mg>0)b.push(`<span class="badge warn">PSL ${Math.round(c.prednisone_mg)} mg</span>`);
  if(b.length===1)b.push('<span class="badge">病態変化なし</span>');
  return b.join('');
}

function mealCards(intake){
  return Object.entries(intake).map(([k,v])=>`<div class="meal-card ${mealClass(v)}"><div class="name">${mealLabels[k]}</div><div class="pct">${Math.round(v*10)}割</div></div>`).join('');
}

function historyCell(label,value,sub='',style=''){
  return `<div style="min-width:0;text-align:center;padding:8px 4px"><div style="font-size:9px;color:#8b919a;margin-bottom:3px">${label}</div><div style="font-size:15px;font-weight:760;${style}">${value}</div>${sub?`<div style="font-size:8px;color:#a0a5ad;margin-top:1px">${sub}</div>`:''}</div>`;
}

function renderHistory(){
  const body=$('#runHistoryBody');
  if(!body)return;
  if(!state.history.length){body.innerHTML='<div style="font-size:11px;color:#8b919a;padding:2px 0 4px">まだあなたの処方記録はありません。</div>';return}
  body.innerHTML=state.history.map(rec=>{
    const o=rec.order,i=rec.intake,b=rec.result.bg;
    return `<div style="background:#fff;border:1px solid #e6e8ed;border-radius:17px;padding:12px;margin-bottom:10px;box-shadow:0 5px 18px rgba(25,30,40,.035)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px"><div style="font-size:11px;font-weight:800;letter-spacing:.06em">DAY ${rec.day}</div><div style="font-size:9px;color:#8b919a">食事確認 → 処方 → 結果</div></div>
      <div style="font-size:9px;font-weight:750;color:#6c727c;margin:5px 0 2px">食事量</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:#f6f7f9;border-radius:11px">${historyCell('朝食',Math.round(i.breakfast*10)+'割')}${historyCell('昼食',Math.round(i.lunch*10)+'割')}${historyCell('夕食',Math.round(i.dinner*10)+'割')}</div>
      <div style="font-size:9px;font-weight:750;color:#6c727c;margin:9px 0 2px">処方</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:#f6f7f9;border-radius:11px">${historyCell('朝',fmt(o.breakfast_u),'U')}${historyCell('昼',fmt(o.lunch_u),'U')}${historyCell('夕',fmt(o.dinner_u),'U')}${historyCell('眠前',fmt(o.basal_u),'U basal')}</div>
      <div style="font-size:9px;font-weight:750;color:#6c727c;margin:9px 0 2px">結果4検</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:#f6f7f9;border-radius:11px">${historyCell('朝前',Math.round(b.pre_breakfast),'mg/dL',bgStyle(b.pre_breakfast))}${historyCell('昼前',Math.round(b.pre_lrelunch),'mg/dL',bgStyle(b.pre_lunch))}${historyCell('夕前',Math.round(b.pre_dinner),'mg/dL',bgStyle(b.pre_dinner))}${historyCell('眠前',Math.round(b.bedtime),'mg/dL',bgStyle(b.bedtime))}</div>
    </div>`;
  }).join('');
}

function render(){
  const s=state,c=s.case;
  $('#dayNo').textContent=s.day;
  $('#caseId').textContent=c.case_id;
  $('#phenotype').textContent='1型糖尿病';
  $('#contextBadges').innerHTML=context(c);
  $('#bgGrid').innerHTML=Object.entries(s.bg).map(([k,v])=>`<div class="bg-card ${v<70?'low':v>180?'high':''}"><div class="bg-label">${labels[k]}</div><div class="bg-value">${Math.round(v)}</div><div class="bg-unit">mg/dL</div></div>`).join('');
  $('#mealGrid').innerHTML=mealCards(s.prevIntake);
  $('#todayMealGrid').innerHTML=mealCards(s.currentIntake);
  $('#prevDoseGrid').innerHTML=Object.entries(s.prevOrder).map(([k,v])=>`<div class="prev-dose"><div class="name">${doseLabels[k]}</div><div class="value">${fmt(v)} U</div></div>`).join('');
  $('#doseGrid').innerHTML=Object.entries(s.prevOrder).map(([k,v])=>`<div class="dose-input-card"><label>${doseLabels[k]}</label><div class="input-wrap"><input inputmode="numeric" type="number" min="0" max="80" step="1" id="dose_${k}" value="${Math.round(v)}"><span class="unit-u">U</span></div></div>`).join('');
  $('#resultPanel').className='result-panel hidden';
  $('#submitBtn').disabled=s.over;
  renderHistory();
}

function readOrder(){
  const o={};
  for(const k of Object.keys(state.prevOrder)){
    let v=Number($('#dose_'+k).value);
    if(!Number.isFinite(v)||v<0)v=0;
    o[k]=Math.round(v);
    $('#dose_'+k).value=String(o[k]);
  }
  return o;
}

function intakeText(x){return `朝 ${Math.round(x.breakfast*10)}割 / 昼 ${Math.round(x.lunch*10)}割 / 夕 ${Math.round(x.dinner*10)}割`}

function gameOverFeedback(kind,rec){
  const pts=[],c=state.case,p=state.p;
  const series=rec.result.series;
  let minI=0,maxI=0;
  for(let i=1;i<series.length;i++){if(series[i]<series[minI])minI=i;if(series[i]>series[maxI])maxI=i}
  const eventI=kind==='low'?minI:maxI;
  const eventValue=kind==='low'?rec.result.min:rec.result.max;
  const expected={breakfast_u:50*rec.intake.breakfast/p.icr_g_u,lunch_u:70*rec.intake.lunch/p.icr_g_u,dinner_u:60*rec.intake.dinner/p.icr_g_u};
  const activeBasalDelta=state.previousBasal-p.basal_u_day;
  let focus='basal';
  if(eventI>=420&&eventI<720)focus='breakfast_u';
  else if(eventI>=720&&eventI<1080)focus='lunch_u';
  else if(eventI>=1080&&eventI<1320)focus='dinner_u';
  const focusName={basal:'前夜basal',breakfast_u:'朝rapid',lunch_u:'昼rapid',dinner_u:'夕rapid'}[focus];

  pts.push(`${kind==='low'?'最低':'最高'}血糖は ${Math.round(eventValue)} mg/dL（約 ${clock(eventI)}）でした。`);
  pts.push(`時刻対応からは、まず ${focusName} を見直す場面です。`);
  if(kind==='low'){
    if(focus==='basal'&&activeBasalDelta>1)pts.push(`実効中の前夜basalは患者基準より ${fmt(activeBasalDelta)} U多い設定でした。`);
    if(focus!=='basal'&&rec.order[focus]>expected[focus]+1)pts.push(`${focusName}は当日の食事量からみた基準量より多めでした。`);
  }else{
    if(focus==='basal'&&activeBasalDelta<-1)pts.push(`実効中の前夜basalは患者基準より ${fmt(-activeBasalDelta)} U少ない設定でした。`);
    if(focus!=='basal'&&rec.order[focus]<Math.max(0,expected[focus]-1))pts.push(`${focusName}は当日の食事量からみた基準量より少なめでした。`);
    if(c.infection_severity>0)pts.push('感染によるインスリン抵抗性上昇も高血糖方向に作用しています。');
    if(c.prednisone_mg>0)pts.push('ステロイドも日中〜夕方の高血糖方向に作用しています。');
  }
  return `<div class="feedback-box"><div class="feedback-title">ゲームオーバー振り返り</div><ul class="feedback-list">${pts.slice(0,4).map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
}

$('#newCaseBtn').onclick=()=>startGenerated();

$('#submitBtn').onclick=()=>{
  if(state.over)return;
  const o=readOrder();
  const intake={...state.currentIntake};
  const ctx={...state.case,intake_fraction:intake};
  const rapid={breakfast_u:o.breakfast_u,lunch_u:o.lunch_u,dinner_u:o.dinner_u};
  const activeBasal=state.previousBasal;
  const r=GlucoseEngine.simulate(state.p,ctx,rapid,activeBasal,(state.seed+state.day)>>>0,state.lastEnd);
  const fatalLow=r.min<70,fatalHigh=r.max>400;
  const rec={day:state.day,previousBg:{...state.bg},previousOrder:{...state.prevOrder},activeBasal,order:{...o},intake:{...intake},result:r};
  state.history.push(rec);
  state.bg=r.bg;
  state.lastEnd=r.end;
  state.prevOrder=o;
  state.prevIntake=intake;
  renderHistory();

  const panel=$('#resultPanel');
  panel.className='result-panel '+((fatalLow||fatalHigh)?'fail':'ok');
  if(fatalLow||fatalHigh){
    const kind=fatalLow?'low':'high';
    const title=fatalLow?'低血糖で終了':'400超で終了';
    const text=fatalLow?`hidden glucose が ${Math.round(r.min)} mg/dL まで低下しました。`:`hidden glucose が ${Math.round(r.max)} mg/dL まで上昇しました。`;
    panel.innerHTML=`<div class="result-kicker">GAME OVER</div><div class="result-title">${title}</div><div class="result-text">${text}</div><div class="result-text" style="margin-top:7px">本日の食事：${intakeText(intake)}</div>${gameOverFeedback(kind,rec)}<button class="next-btn" id="restartBtn">新しい患者へ</button>`;
    state.over=true;
    $('#submitBtn').disabled=true;
    $('#restartBtn').onclick=()=>startGenerated();
  }else{
    panel.innerHTML=`<div class="result-kicker">DAY ${state.day} RESULT</div><div class="result-title">本日の4検結果</div><div class="result-text">朝前 ${Math.round(r.bg.pre_breakfast)} / 昼前 ${Math.round(r.bg.pre_lunch)} / 夕前 ${Math.round(r.bg.pre_dinner)} / 眠前 ${Math.round(r.bg.bedtime)} mg/dL</div><button class="next-btn" id="nextDayBtn">翌日の処方へ</button>`;
    $('#submitBtn').disabled=true;
    $('#nextDayBtn').onclick=()=>{
      state.previousBasal=o.basal_u;
      state.day++;
      state.currentIntake=sampleVisibleIntake(state.day);
      render();
      window.scrollTo({top:0,behavior:'smooth'});
    };
  }
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
};

startGenerated();
