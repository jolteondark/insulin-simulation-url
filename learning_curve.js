(function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const MAX_DAYS=1000;

  const feedbackLabels={
    basal_excess:'basal過量方向',
    basal_deficit:'basal不足方向',
    breakfast_rapid_excess:'朝rapid過量方向',
    breakfast_rapid_deficit:'朝rapid不足方向',
    lunch_rapid_excess:'昼rapid過量方向',
    lunch_rapid_deficit:'昼rapid不足方向',
    dinner_rapid_excess:'夕rapid過量方向',
    dinner_rapid_deficit:'夕rapid不足方向',
    scale_dependence:'scale依存',
    hidden_low_near_miss:'hidden低血糖見逃し',
    hidden_high_excursion:'hidden高血糖見逃し'
  };

  const domainDefs=[
    {id:'basal',label:'basal',tags:['basal_excess','basal_deficit']},
    {id:'breakfast_rapid',label:'朝rapid',tags:['breakfast_rapid_excess','breakfast_rapid_deficit']},
    {id:'lunch_rapid',label:'昼rapid',tags:['lunch_rapid_excess','lunch_rapid_deficit']},
    {id:'dinner_rapid',label:'夕rapid',tags:['dinner_rapid_excess','dinner_rapid_deficit']},
    {id:'scale_dependence',label:'scale依存',tags:['scale_dependence']},
    {id:'hidden_awareness',label:'hidden excursion',tags:['hidden_low_near_miss','hidden_high_excursion']}
  ];

  function finiteOrNull(value){
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function correctionScaleUsed(rec){
    const doses=rec?.result?.correction_doses_u||{};
    return ['breakfast','lunch','dinner'].some(k=>{
      const dose=finiteOrNull(doses[k]);
      return dose!==null&&dose>0;
    });
  }

  function feedbackTagsOf(rec){
    return Array.isArray(rec?.education_feedback?.tags)
      ? [...new Set(rec.education_feedback.tags.filter(x=>typeof x==='string'))]
      : [];
  }

  function prescribingFromTags(tags,scaleUsed=false){
    const set=new Set(Array.isArray(tags)?tags:[]);
    const meals=['breakfast','lunch','dinner'];
    let rapidOver=0,rapidUnder=0,rapidNear=0;
    for(const meal of meals){
      const over=set.has(`${meal}_rapid_excess`);
      const under=set.has(`${meal}_rapid_deficit`);
      if(over)rapidOver++;
      if(under)rapidUnder++;
      if(!over&&!under)rapidNear++;
    }
    return {
      rapid_over:rapidOver,
      rapid_under:rapidUnder,
      rapid_near:rapidNear,
      basal_over:set.has('basal_excess'),
      basal_under:set.has('basal_deficit'),
      scale_used:Boolean(scaleUsed)
    };
  }

  function migrateDay(day){
    if(!day||typeof day!=='object')return day;
    const tags=Array.isArray(day.feedback_tags)?day.feedback_tags:[];
    if(!tags.length)return day;
    return {
      ...day,
      prescribing:prescribingFromTags(tags,Boolean(day.used_scale)),
      prescribing_source:'feedback_tags_v1'
    };
  }

  function normalize(x){
    const data=x&&typeof x==='object'?x:{};
    return {
      ...data,
      days:Array.isArray(data.days)?data.days.map(migrateDay):[],
      cases:Array.isArray(data.cases)?data.cases:[],
      objectives:Array.isArray(data.objectives)?data.objectives:[]
    };
  }

  function save(data){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}
  }

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      const data=normalize(raw);
      const needsMigration=Array.isArray(raw?.days)&&raw.days.some((d,i)=>
        Array.isArray(d?.feedback_tags)&&d.feedback_tags.length&&data.days[i]?.prescribing_source!=='feedback_tags_v1'
      );
      if(needsMigration)save(data);
      return data;
    }catch{return normalize({})}
  }

  function pct(n,d){return d?`${Math.round(100*n/d)}%`:'—'}
  function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}

  function daySummary(rec,caseId){
    const bg=rec?.result?.bg||{};
    const poc=['pre_breakfast','pre_lunch','pre_dinner','bedtime'].map(k=>finiteOrNull(bg[k]));
    const mn=finiteOrNull(rec?.result?.min),mx=finiteOrNull(rec?.result?.max);
    const safetyEvaluable=mn!==null&&mx!==null;
    const pocEvaluable=poc.every(v=>v!==null);
    const safe=safetyEvaluable?mn>=70&&mx<=400:null;
    const dischargeGrade=safetyEvaluable&&pocEvaluable
      ? safe===true&&!rec?.result?.correction_scale&&poc.every(v=>v>=80&&v<=180)&&mn>=70&&mx<=250
      : null;
    const feedbackTags=feedbackTagsOf(rec);
    const usedScale=correctionScaleUsed(rec);
    return {
      key:`${caseId}:${rec.day}`,
      case_id:caseId,
      day:finiteOrNull(rec.day),
      safe,
      safety_evaluable:safetyEvaluable,
      discharge_grade:dischargeGrade,
      discharge_grade_evaluable:safetyEvaluable&&pocEvaluable,
      used_scale:usedScale,
      min:mn,
      max:mx,
      prescribing:prescribingFromTags(feedbackTags,usedScale),
      prescribing_source:'feedback_tags_v1',
      feedback_tags:feedbackTags,
      recorded_at:new Date().toISOString()
    };
  }

  function applyLatest(input,s){
    const data=normalize(input);
    const next={...data,days:[...data.days],cases:[...data.cases],objectives:[...data.objectives]};
    if(!s?.history?.length)return next;
    const rec=s.history[s.history.length-1];
    const caseId=s.case?.case_id||'unknown';
    const d=daySummary(rec,caseId);
    const old=next.days.findIndex(x=>x.key===d.key);
    if(old>=0)next.days[old]=d;else next.days.push(d);
    next.days=next.days.slice(-MAX_DAYS);

    if(s.over&&!next.cases.some(x=>x.case_id===caseId)){
      const outcome=d.safe===false?'game_over':d.safe===true?'discharged':'unknown';
      next.cases.push({
        case_id:caseId,
        outcome,
        days:finiteOrNull(rec.day),
        recorded_at:new Date().toISOString()
      });
      next.cases=next.cases.slice(-100);
    }
    return next;
  }

  function transactionOwnsTerminal(s){
    if(!s?.over)return false;
    try{return Boolean(window?.WardCaseCompletionTransaction?.ownsTerminalCompletion?.())}
    catch{return false}
  }

  function recordLatest(){
    try{
      if(typeof state==='undefined'||!state?.history?.length)return;
      if(transactionOwnsTerminal(state))return;
      save(applyLatest(load(),state));
      render();
    }catch(e){console.error('learning curve',e)}
  }

  function windowStats(days){
    const safetyEvaluable=days.filter(x=>x.safe===true||x.safe===false).length;
    const gradeEvaluable=days.filter(x=>x.discharge_grade===true||x.discharge_grade===false).length;
    return {
      n:days.length,
      safety_evaluable:safetyEvaluable,
      grade_evaluable:gradeEvaluable,
      safe:days.filter(x=>x.safe===true).length,
      grade:days.filter(x=>x.discharge_grade===true).length,
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

  function recurrenceStats(days){
    const byTag=new Map();
    for(const d of days){
      const tags=Array.isArray(d.feedback_tags)?new Set(d.feedback_tags):new Set();
      for(const tag of tags){
        if(!byTag.has(tag))byTag.set(tag,{tag,days:0,cases:new Set()});
        const x=byTag.get(tag);x.days++;x.cases.add(d.case_id);
      }
    }
    return [...byTag.values()].map(x=>({tag:x.tag,days:x.days,cases:x.cases.size})).sort((a,b)=>b.cases-a.cases||b.days-a.days||a.tag.localeCompare(b.tag));
  }

  function caseDomainSummary(days,caseId){
    const caseDays=days.filter(d=>d.case_id===caseId);
    const n=caseDays.length;
    const domains={};
    for(const def of domainDefs){
      const issueDays=caseDays.filter(d=>{
        const tags=new Set(Array.isArray(d.feedback_tags)?d.feedback_tags:[]);
        return def.tags.some(tag=>tags.has(tag));
      }).length;
      domains[def.id]={days:issueDays,total_days:n,rate:n?issueDays/n:null};
    }
    return {case_id:caseId,recorded_days:n,domains};
  }

  function completedCaseSummaries(data){
    return data.cases.map(c=>({...c,learning:caseDomainSummary(data.days,c.case_id)})).filter(c=>c.learning.recorded_days>0);
  }

  function pooledDomainRate(cases,domainId){
    let issueDays=0,totalDays=0;
    for(const c of cases){
      const d=c.learning?.domains?.[domainId];
      if(!d)continue;
      issueDays+=Number(d.days)||0;
      totalDays+=Number(d.total_days)||0;
    }
    return totalDays?issueDays/totalDays:null;
  }

  function caseDomainTrend(data){
    const cases=completedCaseSummaries(data);
    if(cases.length<4)return {ready:false,n:cases.length,domains:[]};
    const groupN=Math.min(3,Math.floor(cases.length/2));
    const early=cases.slice(0,groupN),recent=cases.slice(-groupN);
    const domains=domainDefs.map(def=>{
      const earlyRate=pooledDomainRate(early,def.id);
      const recentRate=pooledDomainRate(recent,def.id);
      return {id:def.id,label:def.label,early_rate:earlyRate,recent_rate:recentRate,delta_pp:earlyRate==null||recentRate==null?null:100*(recentRate-earlyRate)};
    });
    return {ready:true,n:cases.length,group_n:groupN,domains};
  }

  function trendText(days){
    if(days.length<10)return '10日分たまると、直近5日とその前5日の変化を表示します。';
    const prev=windowStats(days.slice(-10,-5)),recent=windowStats(days.slice(-5));
    const safeDelta=prev.safety_evaluable&&recent.safety_evaluable
      ? Math.round(100*(recent.safe/recent.safety_evaluable-prev.safe/prev.safety_evaluable))
      : null;
    const gradeDelta=prev.grade_evaluable&&recent.grade_evaluable
      ? Math.round(100*(recent.grade/recent.grade_evaluable-prev.grade/prev.grade_evaluable))
      : null;
    const sign=x=>x==null?'—':x>0?`+${x}`:`${x}`;
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
    return problems.length?`直近${s.n}日の結果ベース処方傾向：${problems.join(' ／ ')}`:`直近${s.n}日：結果からみてrapid・basalの同方向課題は目立ちません。`;
  }

  function recurrenceText(days){
    const recent=days.slice(-30),repeated=recurrenceStats(recent).filter(x=>x.cases>=2).slice(0,3);
    if(!recent.length)return '症例横断の反復課題は、feedbackが蓄積すると表示されます。';
    if(!repeated.length)return `直近${recent.length}日：同じ調整課題が2症例以上にまたがって反復した記録はまだありません。`;
    return `症例横断で反復：${repeated.map(x=>`${feedbackLabels[x.tag]||x.tag} ${x.cases}症例/${x.days}日`).join(' ／ ')}`;
  }

  function objectiveText(data){
    const xs=Array.isArray(data.objectives)?data.objectives:[];
    if(!xs.length){
      const active=data.active_objective;
      return active?`今回の学習目標：${active.label}（症例終了時に改善を判定）`:'prospectiveな症例目標は次のdebriefから記録されます。';
    }
    const resolved=xs.filter(x=>x.status==='resolved').length;
    const improved=xs.filter(x=>x.status==='improved').length;
    const unresolved=xs.filter(x=>x.status==='not_resolved').length;
    const latest=xs[xs.length-1];
    const label=latest.status==='resolved'?'達成':latest.status==='improved'?'改善':'未達';
    return `症例目標の成績：達成 ${resolved}/${xs.length} ／ 改善 ${improved}/${xs.length} ／ 未達 ${unresolved}/${xs.length}。直近：${latest.label}（${label}）`;
  }

  function caseTrendHtml(data){
    const trend=caseDomainTrend(data);
    if(!trend.ready)return `<div class="micro-note">4症例完了すると、初期症例群と最近症例群で調整課題の発生率を比較します（現在 ${trend.n}症例）。</div>`;
    const fmtRate=x=>x==null?'—':`${Math.round(100*x)}%`;
    const fmtDelta=x=>x==null?'—':`${x>0?'+':''}${Math.round(x)}pt`;
    const cards=trend.domains.map(d=>`<div class="prev-dose"><div class="name">${d.label}</div><div class="value" style="font-size:15px">${fmtRate(d.early_rate)} → ${fmtRate(d.recent_rate)}</div><div class="micro-note">${fmtDelta(d.delta_pp)}</div></div>`).join('');
    return `<div class="micro-note" style="margin-top:9px">症例単位の学習変化（初期${trend.group_n}症例 → 最近${trend.group_n}症例、課題が出た日率）</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px">${cards}</div>`;
  }

  function render(){
    const el=document.querySelector('#learningCurveBody');
    if(!el)return;
    const data=load(),days=data.days,cases=data.cases,s=windowStats(days);
    const completed=cases.length,discharged=cases.filter(x=>x.outcome==='discharged').length;
    const completedDays=cases.map(x=>finiteOrNull(x.days)).filter(x=>x!==null);
    el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px"><div class="prev-dose"><div class="name">記録日</div><div class="value">${s.n}</div></div><div class="prev-dose"><div class="name">安全日</div><div class="value">${pct(s.safe,s.safety_evaluable)}</div></div><div class="prev-dose"><div class="name">退院水準日</div><div class="value">${pct(s.grade,s.grade_evaluable)}</div></div><div class="prev-dose"><div class="name">退院成功</div><div class="value">${pct(discharged,completed)}</div></div></div><div class="micro-note" style="margin-top:9px">${trendText(days)}</div><div class="micro-note">${prescribingText(days)}</div><div class="micro-note">${recurrenceText(days)}</div><div class="micro-note">${objectiveText(data)}</div>${caseTrendHtml(data)}${completedDays.length?`<div class="micro-note">完了症例の平均日数：${mean(completedDays).toFixed(1)}日（${completed}症例）</div>`:''}`;
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
      submit.addEventListener('click',recordLatest);
    }
    render();
  }

  const api={load,save,render,recordLatest,applyLatest,daySummary,finiteOrNull,correctionScaleUsed,feedbackTagsOf,prescribingFromTags,recurrenceStats,caseDomainSummary,completedCaseSummaries,caseDomainTrend,objectiveText,version:'2.0.1'};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.LearningCurve=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})();