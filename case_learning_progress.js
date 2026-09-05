(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CaseLearningProgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const GROUP_N=3;
  const REPEATED_UNMET_N=2;

  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return {...x,days:Array.isArray(x.days)?x.days:[],cases:Array.isArray(x.cases)?x.cases:[],objectives:Array.isArray(x.objectives)?x.objectives:[]};
    }catch{return {days:[],cases:[],objectives:[]}}
  }

  function caseDays(data,caseId){return data.days.filter(d=>d.case_id===caseId)}
  function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}
  function objectiveForCase(data,caseId){
    const xs=(Array.isArray(data?.objectives)?data.objectives:[]).filter(x=>x?.target_case_id===caseId);
    return xs.length?xs[xs.length-1]:null;
  }

  function caseMetric(data,caseId,metric){
    const days=caseDays(data,caseId);
    if(!days.length)return null;
    if(metric==='hypo_avoidance')return mean(days.map(d=>Number(d.min)>=70?1:0));
    if(metric==='rapid_control')return mean(days.map(d=>{
      const p=d.prescribing||{};
      return Number(p.rapid_over||0)+Number(p.rapid_under||0)===0?1:0;
    }));
    if(metric==='basal_control')return mean(days.map(d=>{
      const p=d.prescribing||{};
      return !p.basal_over&&!p.basal_under?1:0;
    }));
    if(metric==='scale_independence')return mean(days.map(d=>d.used_scale?0:1));
    if(metric==='discharge_success'){
      const c=(Array.isArray(data?.cases)?data.cases:[]).find(x=>x.case_id===caseId);
      return c?.outcome==='discharged'?1:c?.outcome==='game_over'?0:null;
    }
    if(metric==='objective_success'){
      const x=objectiveForCase(data,caseId);
      if(!x)return null;
      if(x.status==='resolved'||x.status==='improved')return 1;
      if(x.status==='not_resolved')return 0;
      return null;
    }
    return null;
  }

  const METRICS=[
    {id:'hypo_avoidance',label:'低血糖回避'},
    {id:'rapid_control',label:'rapid過不足'},
    {id:'basal_control',label:'basal調整'},
    {id:'scale_independence',label:'scale非依存'},
    {id:'discharge_success',label:'DISCHARGE'},
    {id:'objective_success',label:'学習目標 改善/達成'}
  ];

  const DOMAIN_LABELS={
    basal:'basal',
    breakfast_rapid:'朝rapid',
    lunch_rapid:'昼rapid',
    dinner_rapid:'夕rapid',
    scale_dependence:'scale依存',
    hidden_awareness:'hidden excursion'
  };
  const FOCUS_LABELS={
    basal_excess:'basal過量',basal_deficit:'basal不足',
    breakfast_rapid_excess:'朝rapid過量',breakfast_rapid_deficit:'朝rapid不足',
    lunch_rapid_excess:'昼rapid過量',lunch_rapid_deficit:'昼rapid不足',
    dinner_rapid_excess:'夕rapid過量',dinner_rapid_deficit:'夕rapid不足',
    scale_dependence:'scale依存',hidden_low_near_miss:'hidden低血糖',hidden_high_excursion:'hidden高血糖'
  };

  function pooledStats(data,cases,metric){
    const xs=cases.map(c=>caseMetric(data,c.case_id,metric)).filter(v=>v!=null);
    return {rate:xs.length?mean(xs):null,n:xs.length};
  }

  function summarize(data){
    const completed=(Array.isArray(data?.cases)?data.cases:[]).filter(c=>caseDays(data,c.case_id).length>0);
    if(completed.length<4)return {ready:false,n:completed.length,group_n:0,metrics:[]};
    const groupN=Math.min(GROUP_N,Math.floor(completed.length/2));
    const early=completed.slice(0,groupN),recent=completed.slice(-groupN);
    const metrics=METRICS.map(m=>{
      const before=pooledStats(data,early,m.id),now=pooledStats(data,recent,m.id);
      return {...m,early_rate:before.rate,recent_rate:now.rate,early_n:before.n,recent_n:now.n,delta_pp:before.rate==null||now.rate==null?null:100*(now.rate-before.rate)};
    });
    return {ready:true,n:completed.length,group_n:groupN,metrics};
  }

  function completedCases(data){
    return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>caseDays(data,c.case_id).length>0);
  }
  function tendencyLabel(over,under){
    if(over===0&&under===0)return '明らかな偏りなし';
    if(over>under)return '過量flag寄り';
    if(under>over)return '不足flag寄り';
    return '過量・不足flag同程度';
  }
  function summarizePrescribingTendency(data){
    const recent=completedCases(data).slice(-GROUP_N);
    if(!recent.length)return {ready:false,n:0,days:0};
    const days=recent.flatMap(c=>caseDays(data,c.case_id));
    let rapidOver=0,rapidUnder=0,basalOver=0,basalUnder=0,scaleDays=0;
    for(const d of days){
      const p=d.prescribing||{};
      rapidOver+=Math.max(0,Number(p.rapid_over)||0);
      rapidUnder+=Math.max(0,Number(p.rapid_under)||0);
      if(p.basal_over)basalOver++;
      if(p.basal_under)basalUnder++;
      if(d.used_scale)scaleDays++;
    }
    return {
      ready:true,
      n:recent.length,
      days:days.length,
      rapid_over:rapidOver,
      rapid_under:rapidUnder,
      basal_over:basalOver,
      basal_under:basalUnder,
      scale_days:scaleDays,
      rapid_tendency:tendencyLabel(rapidOver,rapidUnder),
      basal_tendency:tendencyLabel(basalOver,basalUnder)
    };
  }

  function trailingUnresolved(xs){
    let n=0;
    for(let i=xs.length-1;i>=0;i--){
      if(xs[i].objective_status!=='not_resolved')break;
      n++;
    }
    return n;
  }

  function practiceKey(x){return x?.focus_tag||x?.domain_id||null}
  function practiceLabel(x){return FOCUS_LABELS[x?.focus_tag]||DOMAIN_LABELS[x?.domain_id]||x?.focus_tag||x?.domain_id||'重点'}

  function summarizeAdaptivePractice(data){
    const rows=(Array.isArray(data?.cases)?data.cases:[])
      .map(c=>({case_id:c.case_id,...(c.adaptive_practice||{})}))
      .filter(x=>x.domain_id&&x.practice_opportunity&&x.practice_opportunity!=='standard_case');
    const scored=rows.filter(x=>['resolved','improved','not_resolved'].includes(x.objective_status));
    const keys=[...new Set(scored.map(practiceKey).filter(Boolean))];
    const domains=keys.map(key=>{
      const xs=scored.filter(x=>practiceKey(x)===key);
      const sample=xs[xs.length-1]||{};
      const improved=xs.filter(x=>x.objective_status==='resolved'||x.objective_status==='improved').length;
      const unresolved_streak=trailingUnresolved(xs);
      return {
        practice_key:key,
        focus_tag:sample.focus_tag||null,
        domain_id:sample.domain_id||key,
        label:practiceLabel(sample),
        n:xs.length,
        improved,
        rate:xs.length?improved/xs.length:null,
        unresolved_streak,
        repeated_unmet:unresolved_streak>=REPEATED_UNMET_N
      };
    }).sort((a,b)=>b.n-a.n||a.label.localeCompare(b.label,'ja'));
    const attention=domains.filter(x=>x.repeated_unmet).sort((a,b)=>b.unresolved_streak-a.unresolved_streak||b.n-a.n||a.label.localeCompare(b.label,'ja'));
    const improved=scored.filter(x=>x.objective_status==='resolved'||x.objective_status==='improved').length;
    const fallback=(Array.isArray(data?.cases)?data.cases:[]).filter(c=>c.adaptive_practice?.practice_opportunity==='standard_case').length;
    const lifecycleRows=rows.filter(x=>x.routing_lifecycle&&x.routing_lifecycle.state!=='not_persistent');
    const persistent={
      n:lifecycleRows.length,
      released:lifecycleRows.filter(x=>x.routing_lifecycle.state==='released').length,
      continued:lifecycleRows.filter(x=>x.routing_lifecycle.state==='continued').length,
      active:lifecycleRows.filter(x=>x.routing_lifecycle.state==='active').length
    };
    return {ready:scored.length>0,n:scored.length,improved,rate:scored.length?improved/scored.length:null,domains,attention,fallback,persistent,repeated_unmet_n:REPEATED_UNMET_N};
  }

  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}
  function deltaText(x){
    if(x==null)return '—';
    const n=Math.round(x);
    if(n>=10)return `改善 +${n}pt`;
    if(n<=-10)return `悪化 ${n}pt`;
    return `ほぼ維持 ${n>0?'+':''}${n}pt`;
  }

  function renderPrescribingTendencyHtml(summary){
    if(!summary?.ready)return '';
    return `<div id="prescribingTendency" class="micro-note" style="margin-top:8px"><b>最近${summary.n}症例の処方傾向：</b>rapid 過量flag ${summary.rapid_over}／不足flag ${summary.rapid_under}（${summary.rapid_tendency}） ／ basal 過量flag ${summary.basal_over}日／不足flag ${summary.basal_under}日（${summary.basal_tendency}） ／ correction実投与 ${summary.scale_days}/${summary.days}日。<br><span>※モデル内部の正解量そのものではなく、結果feedbackに記録された方向性の集計です。</span></div>`;
  }

  function renderAdaptiveHtml(summary){
    if(!summary.ready)return '';
    const rows=summary.domains.map(x=>`<div class="prev-dose"><div class="name">${x.label}</div><div class="value" style="font-size:15px">${x.improved}/${x.n}症例</div><div class="micro-note">改善 ${pct(x.rate)}</div></div>`).join('');
    const fallback=summary.fallback?` ／ drift guardで標準症例 ${summary.fallback}件`:'';
    const attention=summary.attention?.length
      ? `<div class="micro-note" style="margin-top:7px"><b>反復未達：</b>${summary.attention.map(x=>`${x.label}（直近${x.unresolved_streak}回未達）`).join(' ／ ')}。次の重点練習で継続確認します。</div>`
      : '';
    const p=summary.persistent||{n:0,released:0,continued:0,active:0};
    const lifecycle=p.n?`<div class="micro-note" style="margin-top:7px"><b>persistent routing：</b>${p.n}症例中、解除 ${p.released}／継続 ${p.continued}${p.active?`／評価中 ${p.active}`:''}</div>`:'';
    return `<div id="adaptivePracticeProgress" style="margin-top:10px"><div class="micro-note"><b>重点練習後の改善：</b>${summary.improved}/${summary.n}症例（${pct(summary.rate)}）${fallback}</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">${rows}</div>${attention}${lifecycle}</div>`;
  }

  function renderHtml(summary,adaptiveSummary,tendencySummary){
    const adaptive=renderAdaptiveHtml(adaptiveSummary||{ready:false});
    const tendency=renderPrescribingTendencyHtml(tendencySummary||{ready:false});
    if(!summary.ready)return `<div id="caseLearningProgress" class="micro-note" style="margin-top:8px"><b>症例横断の学習変化：</b>${summary.n}/4症例。4症例完了後から、最近の症例で何が改善したかを表示します。${tendency}${adaptive}</div>`;
    const cards=summary.metrics.map(m=>`<div class="prev-dose"><div class="name">${m.label}</div><div class="value" style="font-size:15px">${pct(m.early_rate)} → ${pct(m.recent_rate)}</div><div class="micro-note">${deltaText(m.delta_pp)}</div><div class="micro-note">評価 ${m.early_n}/${summary.group_n} → ${m.recent_n}/${summary.group_n}症例</div></div>`).join('');
    return `<div id="caseLearningProgress" style="margin-top:10px"><div class="micro-note"><b>症例横断の学習変化：</b>初期${summary.group_n}症例 → 最近${summary.group_n}症例</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">${cards}</div>${tendency}${adaptive}</div>`;
  }

  function refresh(){
    if(typeof document==='undefined')return;
    const body=document.querySelector('#caseDebriefBody');
    if(!body)return;
    const old=body.querySelector('#caseLearningProgress');
    if(old)old.remove();
    if(typeof state==='undefined'||!state?.over)return;
    const data=load();
    body.insertAdjacentHTML('beforeend',renderHtml(summarize(data),summarizeAdaptivePractice(data),summarizePrescribingTendency(data)));
  }

  function mount(){
    if(typeof document==='undefined')return;
    const submit=document.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',refresh);
    const next=document.querySelector('#newCaseBtn');
    if(next)next.addEventListener('click',refresh);
    const result=document.querySelector('#resultPanel');
    if(result&&!result.dataset.caseLearningProgressMounted){
      result.dataset.caseLearningProgressMounted='1';
      result.addEventListener('click',event=>{if(event.target?.closest?.('#restartBtn'))refresh();});
    }
    refresh();
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
  return {caseMetric,objectiveForCase,summarize,summarizePrescribingTendency,tendencyLabel,summarizeAdaptivePractice,practiceKey,practiceLabel,renderPrescribingTendencyHtml,renderAdaptiveHtml,renderHtml,refresh,METRICS,DOMAIN_LABELS,FOCUS_LABELS,REPEATED_UNMET_N,version:'1.7.0'};
});