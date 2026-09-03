(function(){
  const TARGET_CASES=100;
  const RATE_THRESHOLD=0.05;
  const DAYS_THRESHOLD=0.5;
  const ARCHIVE_KEY='ward_glucose_learning_cycle_archives_v1';
  const CORE_LEARNING_IDS=['correction_share_of_rapid','same_feedback_next_day_rate','feedback_action_alignment_rate'];
  const BLOCK_METRIC_IDS=['safe_day_rate','discharge_rate','scale_day_rate','rapid_error_rate','basal_error_day_rate',...CORE_LEARNING_IDS];

  function threshold(metric){return metric.id==='mean_completion_days'?DAYS_THRESHOLD:RATE_THRESHOLD}
  function classifyMetric(metric){
    const x=metric?.change?.improvement;
    if(x==null)return 'unknown';
    const t=threshold(metric);
    if(x>=t)return 'improved';
    if(x<=-t)return 'worsened';
    return 'stable';
  }
  function formatValue(metric,value){
    if(value==null)return '—';
    return metric.id==='mean_completion_days'?`${value.toFixed(1)}日`:`${Math.round(value*100)}%`;
  }
  function formatChange(metric){
    const x=metric?.change?.improvement;
    if(x==null)return '—';
    if(metric.id==='mean_completion_days')return `${x>0?'+':''}${x.toFixed(1)}日改善`;
    const pt=x*100;
    return `${pt>0?'+':''}${pt.toFixed(1)}pt`;
  }
  function metricSentence(metric){return `${metric.label} ${formatValue(metric,metric.early)}→${formatValue(metric,metric.late)}（${formatChange(metric)}）`}
  function classificationLabel(x){return x==='improved'?'改善':x==='worsened'?'悪化':x==='stable'?'横ばい':'判定不能'}

  function build(summary){
    const s=summary&&typeof summary==='object'?summary:{};
    const metrics=Array.isArray(s.metrics)?s.metrics:[];
    const classified=metrics.map(m=>({...m,classification:classifyMetric(m)}));
    const improved=classified.filter(m=>m.classification==='improved').sort((a,b)=>b.change.improvement-a.change.improvement);
    const worsened=classified.filter(m=>m.classification==='worsened').sort((a,b)=>a.change.improvement-b.change.improvement);
    const stable=classified.filter(m=>m.classification==='stable');
    const byId=Object.fromEntries(classified.map(m=>[m.id,m]));
    const late=s?.groups?.late||{};
    const safety=byId.safe_day_rate||null;
    const discharge=byId.discharge_rate||null;
    const completion=byId.mean_completion_days||null;
    const scale=byId.scale_day_rate||null;
    const prescribing=['rapid_error_rate','basal_error_day_rate','rapid_over_rate','rapid_under_rate','basal_over_day_rate','basal_under_day_rate']
      .map(id=>byId[id]).filter(Boolean);
    const remaining=prescribing.filter(m=>m.classification==='worsened');
    const coreLearning=CORE_LEARNING_IDS.map(id=>byId[id]).filter(Boolean);
    const remainingCore=coreLearning.filter(m=>m.classification==='worsened');
    const stableCore=coreLearning.filter(m=>m.classification==='stable');
    return {
      schema_version:2,
      target_cases:TARGET_CASES,
      case_count:Number(s.case_count||0),
      complete:Number(s.case_count||0)>=TARGET_CASES,
      analysis_ready:Boolean(s.ready),
      method:'descriptive early-to-late educational debrief using WardLearningAnalysis; not a clinical competency pass/fail threshold',
      headline:{
        discharge_rate:discharge?{early:discharge.early,late:discharge.late,classification:discharge.classification}:null,
        mean_completion_days:completion?{early:completion.early,late:completion.late,classification:completion.classification}:null,
        safe_day_rate:safety?{early:safety.early,late:safety.late,classification:safety.classification}:null,
        scale_day_rate:scale?{early:scale.early,late:scale.late,classification:scale.classification}:null,
        late_safe_day_rate:late.safe_day_rate??null
      },
      core_learning:coreLearning.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change?.improvement??null,classification:m.classification})),
      improved:improved.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change.improvement})),
      worsened:worsened.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change.improvement})),
      stable:stable.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change?.improvement??null})),
      remaining_learning_weaknesses:remainingCore.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change.improvement})),
      stable_learning_domains:stableCore.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change?.improvement??null})),
      remaining_prescribing_weaknesses:remaining.map(m=>({id:m.id,label:m.label,early:m.early,late:m.late,improvement:m.change.improvement})),
      objective_success_rate:late.objective_success_rate??null
    };
  }

  function normalizeFocus(snapshot){
    const x=snapshot?.active_objective;
    if(!x||typeof x!=='object'||!x.domain_id)return null;
    return {domain_id:x.domain_id,label:x.label||x.domain_id,selection_reason:x.selection_reason||null,source_case_id:x.source_case_id||null,block_carryover:Boolean(x.block_carryover)};
  }
  function practiceRows(snapshot,domainId){
    return (Array.isArray(snapshot?.cases)?snapshot.cases:[]).map((c,index)=>({case_id:c?.case_id||null,index,...(c?.adaptive_practice||{})}))
      .filter(x=>x.domain_id===domainId&&x.practice_opportunity&&x.practice_opportunity!=='standard_case'&&['resolved','improved','not_resolved'].includes(x.objective_status));
  }
  function summarizeFocusPractice(snapshot,focus){
    if(!focus?.domain_id)return null;
    const rows=practiceRows(snapshot,focus.domain_id),latest=rows.at(-1)||null;
    const successful=rows.filter(x=>['resolved','improved'].includes(x.objective_status));
    const status=!rows.length?'not_practiced':['resolved','improved'].includes(latest?.objective_status)?'improved':'not_resolved';
    return {domain_id:focus.domain_id,label:focus.label,practice_count:rows.length,successful_practice_count:successful.length,latest_status:latest?.objective_status||null,latest_case_id:latest?.case_id||null,status};
  }
  function summarizeBlock(snapshot,blockNumber,analyzer){
    if(!analyzer||typeof analyzer.summarize!=='function')return null;
    const summary=analyzer.summarize(snapshot||{});
    if(!summary?.ready)return null;
    const metrics=Object.fromEntries((summary.metrics||[]).filter(m=>BLOCK_METRIC_IDS.includes(m.id)).map(m=>[m.id,{id:m.id,label:m.label,direction:m.direction,late:m.late}]));
    return {block_number:blockNumber,case_count:Number(summary.case_count||0),metrics,objective_success_rate:summary?.groups?.late?.objective_success_rate??null,closing_focus:normalizeFocus(snapshot),snapshot:snapshot||{}};
  }
  function compareBlockMetrics(previous,current){
    const ids=[...new Set([...Object.keys(previous?.metrics||{}),...Object.keys(current?.metrics||{})])];
    return ids.map(id=>{
      const a=previous?.metrics?.[id],b=current?.metrics?.[id];
      if(!a||!b||a.late==null||b.late==null)return null;
      const direction=b.direction||a.direction||'higher';
      const raw=b.late-a.late;
      const improvement=direction==='lower'?-raw:raw;
      const metric={id,label:b.label||a.label,direction,early:a.late,late:b.late,change:{raw,improvement}};
      return {...metric,classification:classifyMetric(metric)};
    }).filter(Boolean);
  }
  function buildCurriculumTransition(previous,current){
    const focus=previous?.closing_focus||null;
    if(!focus)return {focus:null,practice:null,status:'no_focus'};
    const practice=summarizeFocusPractice(current?.snapshot||{},focus);
    return {focus,practice,status:practice?.status||'not_practiced'};
  }
  function buildCurriculumHistory(transitions){
    return (Array.isArray(transitions)?transitions:[]).map(t=>({
      from_block:t.from_block,
      to_block:t.to_block,
      domain_id:t.curriculum?.focus?.domain_id||null,
      label:t.curriculum?.focus?.label||null,
      status:t.curriculum?.status||'no_focus',
      practice_count:t.curriculum?.practice?.practice_count||0,
      successful_practice_count:t.curriculum?.practice?.successful_practice_count||0,
      latest_status:t.curriculum?.practice?.latest_status||null,
      latest_case_id:t.curriculum?.practice?.latest_case_id||null
    }));
  }
  function buildLongitudinal(archives,currentRaw,analyzer){
    const list=Array.isArray(archives)?archives:[];
    const blocks=list.map((a,i)=>summarizeBlock(a?.snapshot,a?.block_number||i+1,analyzer)).filter(Boolean);
    const current=summarizeBlock(currentRaw,(list.at(-1)?.block_number||0)+1,analyzer);
    if(current&&current.case_count>=6)blocks.push(current);
    const transitions=[];
    for(let i=1;i<blocks.length;i++)transitions.push({from_block:blocks[i-1].block_number,to_block:blocks[i].block_number,metrics:compareBlockMetrics(blocks[i-1],blocks[i]),curriculum:buildCurriculumTransition(blocks[i-1],blocks[i])});
    const latest=transitions.at(-1)||null;
    return {
      schema_version:3,
      method:'late-phase to late-phase comparison across archived 100-case learning blocks using the existing WardLearningAnalysis metrics; curriculum linkage uses stored active_objective and adaptive_practice status without adding a new learning metric',
      block_count:blocks.length,
      blocks:blocks.map(({snapshot,...rest})=>rest),
      transitions,
      curriculum_history:buildCurriculumHistory(transitions),
      latest_transition:latest,
      improved:latest?latest.metrics.filter(m=>m.classification==='improved'):[],
      worsened:latest?latest.metrics.filter(m=>m.classification==='worsened'):[],
      stable:latest?latest.metrics.filter(m=>m.classification==='stable'):[]
    };
  }

  function curriculumStatusLabel(x){return x==='improved'?'改善確認':x==='not_resolved'?'未改善':x==='not_practiced'?'まだ重点練習なし':'前blockにcarryover focusなし'}
  function renderCurriculumHistoryHtml(history){
    const rows=(Array.isArray(history)?history:[]).filter(x=>x.domain_id);
    if(rows.length<2)return '';
    const items=rows.map(x=>`<li>Block ${x.from_block}→${x.to_block}：<b>${x.label}</b> → 重点練習 ${x.practice_count}症例 → <b>${curriculumStatusLabel(x.status)}</b>${x.latest_status?`（最新 ${x.latest_status}）`:''}</li>`).join('');
    return `<div class="micro-note" style="margin-top:8px"><b>重点学習の履歴</b><ol style="margin:4px 0 0 18px">${items}</ol></div>`;
  }
  function renderLongitudinalHtml(longitudinal){
    if(!longitudinal||longitudinal.block_count<2)return '<div class="micro-note" style="margin-top:8px">2ブロック以上でブロック間の学習推移を表示します。</div>';
    const t=longitudinal.latest_transition;
    const key=CORE_LEARNING_IDS.map(id=>t.metrics.find(m=>m.id===id)).filter(Boolean);
    const rows=key.map(m=>`<li><b>${classificationLabel(m.classification)}</b>：${m.label} ${formatValue(m,m.early)}→${formatValue(m,m.late)}（${formatChange(m)}）</li>`).join('');
    const safety=t.metrics.find(m=>m.id==='safe_day_rate');
    const discharge=t.metrics.find(m=>m.id==='discharge_rate');
    const scale=t.metrics.find(m=>m.id==='scale_day_rate');
    const headline=[safety,discharge,scale].filter(Boolean).map(m=>`${m.label} ${formatValue(m,m.early)}→${formatValue(m,m.late)}［${classificationLabel(m.classification)}］`).join(' ／ ');
    const weak=longitudinal.worsened.filter(m=>CORE_LEARNING_IDS.includes(m.id)||['rapid_error_rate','basal_error_day_rate'].includes(m.id));
    const next=weak.length?weak.slice(0,2).map(m=>m.label).join('、'):'主要教育指標に明確なblock間悪化なし';
    const c=t.curriculum||null;
    const focusLine=c?.focus?`${t.from_block}末の重点：${c.focus.label} → ${t.to_block}で重点練習 ${c.practice?.practice_count||0}症例 → <b>${curriculumStatusLabel(c.status)}</b>${c.practice?.latest_status?`（最新 ${c.practice.latest_status}）`:''}`:'前block末にcarryover対象のlearning focusなし';
    return `${renderCurriculumHistoryHtml(longitudinal.curriculum_history)}
      <div class="micro-note" style="margin-top:8px"><b>最新ブロック間：</b>${t.from_block}→${t.to_block}。各blockのlate phase同士を比較します。</div>
      <div class="micro-note" style="margin-top:8px"><b>重点学習の接続：</b>${focusLine}</div>
      ${headline?`<div class="micro-note" style="margin-top:8px"><b>主要アウトカム：</b>${headline}</div>`:''}
      ${rows?`<div class="micro-note" style="margin-top:8px"><b>教育ループ3指標</b><ul style="margin:4px 0 0 18px">${rows}</ul></div>`:''}
      <div class="micro-note" style="margin-top:8px"><b>次ブロックで優先：</b>${next}</div>`;
  }

  function renderHtml(report,summary){
    if(!report.analysis_ready)return `<div class="micro-note">${summary?.minimum_cases||6}症例完了後から学習変化を集計します。</div>`;
    const progress=Math.min(report.case_count,report.target_cases);
    const status=report.complete?'<b>100症例 debrief 完了</b>':`100症例 debrief まで <b>${progress}/${report.target_cases}</b>`;
    const improved=report.improved.slice(0,3).map(x=>{const m=summary.metrics.find(y=>y.id===x.id);return `<li>${metricSentence(m)}</li>`}).join('');
    const worsened=report.worsened.slice(0,3).map(x=>{const m=summary.metrics.find(y=>y.id===x.id);return `<li>${metricSentence(m)}</li>`}).join('');
    const remain=report.remaining_prescribing_weaknesses.slice(0,2).map(x=>x.label).join('、');
    const core=report.core_learning.map(x=>{const m=summary.metrics.find(y=>y.id===x.id);return `<li><b>${classificationLabel(x.classification)}</b>：${metricSentence(m)}</li>`}).join('');
    const coreWeak=report.remaining_learning_weaknesses.map(x=>x.label);
    const coreStable=report.stable_learning_domains.map(x=>x.label);
    const nextPriority=coreWeak.length?coreWeak.slice(0,2).join('、'):coreStable.length?`${coreStable.slice(0,2).join('、')}（横ばい）`:remain||'方向別rapid/basal biasに明確な悪化なし';
    const safe=summary.metrics.find(m=>m.id==='safe_day_rate');
    const discharge=summary.metrics.find(m=>m.id==='discharge_rate');
    const completion=summary.metrics.find(m=>m.id==='mean_completion_days');
    const headline=[safe,discharge,completion].filter(Boolean).map(metricSentence).join(' ／ ');
    return `<div class="micro-note">${status}。early→lateの同一contractから記述的に要約します。臨床能力の合否判定ではありません。</div>
      <div class="micro-note" style="margin-top:8px"><b>主要アウトカム：</b>${headline}</div>
      ${core?`<div class="micro-note" style="margin-top:8px"><b>教育ループ3指標</b><ul style="margin:4px 0 0 18px">${core}</ul></div>`:''}
      ${improved?`<div class="micro-note" style="margin-top:8px"><b>改善した領域</b><ul style="margin:4px 0 0 18px">${improved}</ul></div>`:''}
      ${worsened?`<div class="micro-note" style="margin-top:8px"><b>残った／悪化した領域</b><ul style="margin:4px 0 0 18px">${worsened}</ul></div>`:'<div class="micro-note" style="margin-top:8px"><b>残った／悪化した領域：</b>5pt（完了日数は0.5日）以上の明確な悪化なし。</div>'}
      <div class="micro-note" style="margin-top:8px"><b>次の反復で優先：</b>${nextPriority}</div>`;
  }

  function analyze(raw){
    const analyzer=typeof window!=='undefined'?window.WardLearningAnalysis:null;
    if(!analyzer||typeof analyzer.summarize!=='function')return null;
    const summary=analyzer.summarize(raw);
    return {summary,report:build(summary)};
  }
  function load(){
    let raw={},archives=[];
    try{raw=JSON.parse(localStorage.getItem('ward_glucose_learning_curve_v1')||'{}')}catch{}
    try{archives=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]')}catch{}
    const base=analyze(raw);
    if(!base)return null;
    base.longitudinal=buildLongitudinal(archives,raw,window.WardLearningAnalysis);
    return base;
  }
  function ensureUI(){
    if(typeof document==='undefined')return null;
    let box=document.querySelector('#finalLearningDebrief');if(box)return box;
    const anchor=document.querySelector('#learningAnalysis')||document.querySelector('#learningDataExport');if(!anchor)return null;
    box=document.createElement('section');box.id='finalLearningDebrief';box.className='section-block';box.style.marginTop='16px';
    box.innerHTML='<div class="section-title"><span>100</span> 100症例 debrief</div><div id="finalLearningDebriefBody"></div><div id="longitudinalLearningDebriefBody"></div>';
    anchor.insertAdjacentElement('afterend',box);return box;
  }
  function refresh(){const x=load(),box=ensureUI(),body=box?.querySelector('#finalLearningDebriefBody'),longBody=box?.querySelector('#longitudinalLearningDebriefBody');if(body&&x)body.innerHTML=renderHtml(x.report,x.summary);if(longBody&&x)longBody.innerHTML=renderLongitudinalHtml(x.longitudinal)}
  function mount(){refresh();const submit=document.querySelector('#submitBtn'),next=document.querySelector('#newCaseBtn');if(submit&&!submit.dataset.finalDebriefMounted){submit.dataset.finalDebriefMounted='1';submit.addEventListener('click',()=>setTimeout(refresh,0))}if(next&&!next.dataset.finalDebriefMounted){next.dataset.finalDebriefMounted='1';next.addEventListener('click',()=>setTimeout(refresh,0))}}

  window.WardFinalLearningDebrief={build,analyze,normalizeFocus,practiceRows,summarizeFocusPractice,summarizeBlock,compareBlockMetrics,buildCurriculumTransition,buildCurriculumHistory,buildLongitudinal,renderHtml,renderCurriculumHistoryHtml,renderLongitudinalHtml,refresh,classifyMetric,TARGET_CASES,CORE_LEARNING_IDS,BLOCK_METRIC_IDS,version:'1.4.0'};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
})();