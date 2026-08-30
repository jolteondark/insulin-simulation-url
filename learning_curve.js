(function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const MAX_DAYS=200;
  const RAPID_ERROR_U=1.5;
  const BASAL_ERROR_U=1.5;

  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return {days:Array.isArray(x.days)?x.days:[],cases:Array.isArray(x.cases)?x.cases:[]};
    }catch{return {days:[],cases:[]}}
  }

  function save(data){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}
  }

  function pct(n,d){return d?`${Math.round(100*n/d)}%`:'—'}
  function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}
  function correctionFor(rec,key){const k=key.replace('_u','');return Number(rec?.result?.correction_doses_u?.[k])||0}

  function prescribingPattern(rec,p){
    const mealCarb={breakfast:50,lunch:70,dinner:60};
    const rapidKeys=['breakfast_u','lunch_u','dinner_u'];
    let rapidOver=0,rapidUnder=0,rapidNear=0;
    for(const key of rapidKeys){
      const meal=key.replace('_u','');
      const intake=Number(rec?.intake?.[meal]);
      const icr=Number(p?.icr_g_u);
      const expected=Number.isFinite(intake)&&Number.isFinite(icr)&&icr>0?mealCarb[meal]*intake/icr:null;
      const actual=Number(rec?.order?.[key]||0)+correctionFor(rec,key);
      if(expected==null)continue;
      const delta=actual-expected;
      if(delta>RAPID_ERROR_U)rapidOver++;
      else if(delta<-RAPID_ERROR_U)rapidUnder++;
      else rapidNear++;
    }
    const activeBasal=Number(rec?.activeBasal),baselineBasal=Number(p?.basal_u_day);
    const basalDelta=Number.isFinite(activeBasal)&&Number.isFinite(baselineBasal)?activeBasal-baselineBasal:null;
    return {
      rapid_over:rapidOver,
      rapid_under:rapidUnder,
      rapid_near:rapidNear,
      basal_over:basalDelta!=null&&basalDelta>BASAL_ERROR_U,
      basal_under:basalDelta!=null&&basalDelta<-BASAL_ERROR_U,
      scale_used:Boolean(rec?.result?.correction_scale)
    };
  }

  function daySummary(rec,caseId,p){
    const bg=rec?.result?.bg||{};
    const poc=['pre_breakfast','pre_lunch','pre_dinner','bedtime'].map(k=>Number(bg[k]));
    const mn=Number(rec?.result?.min),mx=Number(rec?.result?.max);
    const safe=Number.isFinite(mn)&&Number.isFinite(mx)&&mn>=70&&mx<=400;
    const dischargeGrade=safe&&!rec?.result?.correction_scale&&poc.every(v=>Number.isFinite(v)&&v>=80&&v<=180)&&mn>=70&&mx<=250;
    return {
      key:`${caseId}:${rec.day}`,
      case_id:caseId,
      day:Number(rec.day),
      safe,
      discharge_grade:dischargeGrade,
      used_scale:Boolean(rec?.result?.correction_scale),
      min:mn,
      max:mx,
      prescribing:prescribingPattern(rec,p),
      recorded_at:new Date().toISOString()
    };
  }

  function recordLatest(){
    try{
      if(typeof state==='undefined'||!state?.history?.length)return;
      const rec=state.history[state.history.length-1];
      const caseId=state.case?.case_id||'unknown';
      const data=load(),d=daySummary(rec,caseId,state.p);
      const old=data.days.findIndex(x=>x.key===d.key);
      if(old>=0)data.days[old]=d;else data.days.push(d);
      data.days=data.days.slice(-MAX_DAYS);

      if(state.over&&!data.cases.some(x=>x.case_id===caseId)){
        const fatal=!d.safe;
        data.cases.push({
          case_id:caseId,
          outcome:fatal?'game_over':'discharged',
          days:Number(rec.day),
          recorded_at:new Date().toISOString()
        });
        data.cases=data.cases.slice(-100);
      }
      save(data);render();
    }catch(e){console.error('learning curve',e)}
  }

  function windowStats(days){
    return {
      n:days.length,
      safe:days.filter(x=>x.safe).length,
      grade:days.filter(x=>x.discharge_grade).length,
      scale:days.filter(x=>x.used_scale).length
    };
  }

  function prescribingStats(days){
    const ps=days.map(x=>x.prescribing).filter(Boolean);
    return {
      n:ps.length,
      rapidOver:ps.reduce((a,x)=>a+Number(x.rapid_over||0),0),
      rapidUnder:ps.reduce((a,x)=>a+Number(x.rapid_under||0),0),
      rapidNear:ps.reduce((a,x)=>a+Number(x.rapid_near||0),0),
      basalOver:ps.filter(x=>x.basal_over).length,
      basalUnder:ps.filter(x=>x.basal_under).length,
      scale:ps.filter(x=>x.scale_used).length
    };
  }

  function trendText(days){
    if(days.length<10)return '10日分たまると、直近5日とその前5日の変化を表示します。';
    const prev=windowStats(days.slice(-10,-5)),recent=windowStats(days.slice(-5));
    const safeDelta=20*(recent.safe-prev.safe);
    const gradeDelta=20*(recent.grade-prev.grade);
    const sign=x=>x>0?`+${x}`:`${x}`;
    return `直近5日 vs 前5日：安全日 ${sign(safeDelta)}pt ／ 退院水準日 ${sign(gradeDelta)}pt`;
  }

  function prescribingText(days){
    const recent=days.slice(-10),s=prescribingStats(recent);
    if(!s.n)return '処方傾向は症例を進めると表示されます。';
    const rapidTotal=s.rapidOver+s.rapidUnder+s.rapidNear;
    const problems=[];
    if(s.rapidOver)problems.push(`rapid過量 ${s.rapidOver}/${rapidTotal}`);
    if(s.rapidUnder)problems.push(`rapid不足 ${s.rapidUnder}/${rapidTotal}`);
    if(s.basalOver)problems.push(`basal過量 ${s.basalOver}/${s.n}日`);
    if(s.basalUnder)problems.push(`basal不足 ${s.basalUnder}/${s.n}日`);
    if(s.scale)problems.push(`scale依存 ${s.scale}/${s.n}日`);
    return problems.length?`直近${s.n}日の処方傾向：${problems.join(' ／ ')}`:`直近${s.n}日：rapid・basalとも大きな過不足は目立ちません。`;
  }

  function render(){
    const el=document.querySelector('#learningCurveBody');
    if(!el)return;
    const data=load(),days=data.days,cases=data.cases,s=windowStats(days);
    const completed=cases.length,discharged=cases.filter(x=>x.outcome==='discharged').length;
    const completedDays=cases.map(x=>Number(x.days)).filter(Number.isFinite);
    el.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        <div class="prev-dose"><div class="name">記録日</div><div class="value">${s.n}</div></div>
        <div class="prev-dose"><div class="name">安全日</div><div class="value">${pct(s.safe,s.n)}</div></div>
        <div class="prev-dose"><div class="name">退院水準日</div><div class="value">${pct(s.grade,s.n)}</div></div>
        <div class="prev-dose"><div class="name">退院成功</div><div class="value">${pct(discharged,completed)}</div></div>
      </div>
      <div class="micro-note" style="margin-top:9px">${trendText(days)}</div>
      <div class="micro-note">${prescribingText(days)}</div>
      ${completedDays.length?`<div class="micro-note">完了症例の平均日数：${mean(completedDays).toFixed(1)}日（${completed}症例）</div>`:''}`;
  }

  function mount(){
    if(typeof document==='undefined')return;
    const history=document.querySelector('#runHistory');
    if(history&&!document.querySelector('#learningCurve')){
      const section=document.createElement('section');
      section.id='learningCurve';
      section.className='section-block';
      section.style.marginTop='24px';
      section.innerHTML='<div class="section-title"><span>L</span> Learning curve</div><div id="learningCurveBody"></div>';
      history.parentNode.insertBefore(section,history);
    }
    const submit=document.querySelector('#submitBtn');
    if(submit&&!submit.dataset.learningCurveMounted){
      submit.dataset.learningCurveMounted='1';
      submit.addEventListener('click',()=>setTimeout(recordLatest,30));
    }
    render();
  }

  window.LearningCurve={load,render,version:'1.1.0'};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})();
