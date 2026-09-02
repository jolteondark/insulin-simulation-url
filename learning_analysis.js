(function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const MIN_CASES=6;

  function normalize(raw){
    const x=raw&&typeof raw==='object'?raw:{};
    return {
      days:Array.isArray(x.days)?x.days:[],
      cases:Array.isArray(x.cases)?x.cases:[],
      objectives:Array.isArray(x.objectives)?x.objectives:[]
    };
  }

  function load(){
    try{return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'))}
    catch{return normalize({})}
  }

  function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}
  function ratio(num,den){return den?num/den:null}
  function completedCases(data){
    const dayCases=new Set(data.days.map(d=>d?.case_id).filter(Boolean));
    return data.cases.filter(c=>c?.case_id&&dayCases.has(c.case_id)&&['discharged','game_over'].includes(c.outcome));
  }

  function splitTerciles(cases){
    const n=cases.length;
    const b1=Math.floor(n/3),b2=Math.floor(2*n/3);
    return {
      early:cases.slice(0,b1),
      middle:cases.slice(b1,b2),
      late:cases.slice(b2)
    };
  }

  function caseIds(cases){return new Set(cases.map(c=>c.case_id))}
  function daysFor(data,cases){
    const ids=caseIds(cases);
    return data.days.filter(d=>ids.has(d.case_id));
  }
  function objectivesFor(data,cases){
    const ids=caseIds(cases);
    return data.objectives.filter(x=>ids.has(x?.target_case_id)&&['resolved','improved','not_resolved'].includes(x?.status));
  }

  function groupMetrics(data,cases){
    const days=daysFor(data,cases);
    const objectives=objectivesFor(data,cases);
    let rapidErr=0,rapidTotal=0,basalErr=0;
    for(const d of days){
      const p=d?.prescribing||{};
      const over=Number(p.rapid_over||0),under=Number(p.rapid_under||0),near=Number(p.rapid_near||0);
      rapidErr+=over+under;
      rapidTotal+=over+under+near;
      if(p.basal_over||p.basal_under)basalErr++;
    }
    const objectiveSuccess=objectives.filter(x=>x.status==='resolved'||x.status==='improved').length;
    const caseDays=cases.map(c=>Number(c.days)).filter(Number.isFinite);
    return {
      cases:cases.length,
      days:days.length,
      discharge_rate:ratio(cases.filter(c=>c.outcome==='discharged').length,cases.length),
      mean_completion_days:mean(caseDays),
      safe_day_rate:ratio(days.filter(d=>d.safe).length,days.length),
      scale_day_rate:ratio(days.filter(d=>d.used_scale).length,days.length),
      rapid_error_rate:ratio(rapidErr,rapidTotal),
      basal_error_day_rate:ratio(basalErr,days.length),
      objective_success_rate:ratio(objectiveSuccess,objectives.length),
      objective_n:objectives.length
    };
  }

  const METRICS=[
    {id:'discharge_rate',label:'DISCHARGE率',direction:'higher'},
    {id:'mean_completion_days',label:'完了日数',direction:'lower'},
    {id:'safe_day_rate',label:'安全日率',direction:'higher'},
    {id:'scale_day_rate',label:'scale使用日率',direction:'lower'},
    {id:'rapid_error_rate',label:'rapid過不足率',direction:'lower'},
    {id:'basal_error_day_rate',label:'basal過不足日率',direction:'lower'},
    {id:'objective_success_rate',label:'学習目標 改善/達成率',direction:'higher'}
  ];

  function change(metric,early,late){
    if(early==null||late==null)return null;
    const raw=late-early;
    const improvement=metric.direction==='lower'?-raw:raw;
    return {raw,improvement};
  }

  function summarize(raw){
    const data=normalize(raw);
    const cases=completedCases(data);
    const groups=splitTerciles(cases);
    const out={
      schema_version:1,
      case_count:cases.length,
      ready:cases.length>=MIN_CASES,
      minimum_cases:MIN_CASES,
      window_method:'ordered completed cases split into contiguous terciles',
      groups:{
        early:groupMetrics(data,groups.early),
        middle:groupMetrics(data,groups.middle),
        late:groupMetrics(data,groups.late)
      },
      metrics:[]
    };
    out.metrics=METRICS.map(m=>{
      const early=out.groups.early[m.id],middle=out.groups.middle[m.id],late=out.groups.late[m.id];
      return {...m,early,middle,late,change:change(m,early,late)};
    });
    return out;
  }

  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}
  function num(x){return x==null?'—':x.toFixed(1)}
  function formatMetric(id,x){return id==='mean_completion_days'?num(x):pct(x)}
  function deltaText(m){
    if(!m.change)return '—';
    const scale=m.id==='mean_completion_days'?1:100;
    const n=m.change.improvement*scale;
    const unit=m.id==='mean_completion_days'?'日':'pt';
    return `${n>0?'+':''}${n.toFixed(1)}${unit}`;
  }

  function renderHtml(summary){
    if(!summary.ready)return `<div class="micro-note">${summary.minimum_cases}症例完了後からearly / middle / lateで学習変化を固定集計します（現在 ${summary.case_count}症例）。</div>`;
    const rows=summary.metrics.map(m=>`<tr><td>${m.label}</td><td>${formatMetric(m.id,m.early)}</td><td>${formatMetric(m.id,m.middle)}</td><td>${formatMetric(m.id,m.late)}</td><td>${deltaText(m)}</td></tr>`).join('');
    return `<div class="micro-note">completed caseを時系列の3群に分け、同じ指標を100症例まで一貫して追います。変化はearly→lateで、正値ほど改善方向です。</div><div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th>指標</th><th>early</th><th>middle</th><th>late</th><th>改善量</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function installUI(){
    if(typeof document==='undefined'||document.querySelector('#learningAnalysis'))return;
    const anchor=document.querySelector('#learningDataExport')||document.querySelector('#runHistory');
    if(!anchor)return;
    const box=document.createElement('section');
    box.id='learningAnalysis';
    box.className='section-block';
    box.style.marginTop='16px';
    box.innerHTML=`<div class="section-title"><span>L</span> 学習効果サマリー</div><div id="learningAnalysisBody"></div>`;
    anchor.insertAdjacentElement('afterend',box);
    const body=box.querySelector('#learningAnalysisBody');
    if(body)body.innerHTML=renderHtml(summarize(load()));
  }

  window.WardLearningAnalysis={normalize,completedCases,splitTerciles,groupMetrics,summarize,renderHtml,METRICS,MIN_CASES,version:'1.0.0'};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});
    else installUI();
  }
})();
