(function(){
  const TARGET_CASES=100;
  const RATE_THRESHOLD=0.05;
  const DAYS_THRESHOLD=0.5;
  const CORE_LEARNING_IDS=['correction_share_of_rapid','same_feedback_next_day_rate','feedback_action_alignment_rate'];

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
    let raw={};
    try{raw=JSON.parse(localStorage.getItem('ward_glucose_learning_curve_v1')||'{}')}catch{}
    return analyze(raw);
  }
  function ensureUI(){
    if(typeof document==='undefined')return null;
    let box=document.querySelector('#finalLearningDebrief');if(box)return box;
    const anchor=document.querySelector('#learningAnalysis')||document.querySelector('#learningDataExport');if(!anchor)return null;
    box=document.createElement('section');box.id='finalLearningDebrief';box.className='section-block';box.style.marginTop='16px';
    box.innerHTML='<div class="section-title"><span>100</span> 100症例 debrief</div><div id="finalLearningDebriefBody"></div>';
    anchor.insertAdjacentElement('afterend',box);return box;
  }
  function refresh(){const x=load(),box=ensureUI(),body=box?.querySelector('#finalLearningDebriefBody');if(body&&x)body.innerHTML=renderHtml(x.report,x.summary)}
  function mount(){refresh();const submit=document.querySelector('#submitBtn'),next=document.querySelector('#newCaseBtn');if(submit&&!submit.dataset.finalDebriefMounted){submit.dataset.finalDebriefMounted='1';submit.addEventListener('click',()=>setTimeout(refresh,0))}if(next&&!next.dataset.finalDebriefMounted){next.dataset.finalDebriefMounted='1';next.addEventListener('click',()=>setTimeout(refresh,0))}}

  window.WardFinalLearningDebrief={build,analyze,renderHtml,refresh,classifyMetric,TARGET_CASES,CORE_LEARNING_IDS,version:'1.1.0'};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
})();
