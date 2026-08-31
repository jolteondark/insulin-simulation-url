(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WardCaseDebrief=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const MAX_OBJECTIVES=100;
  const DOMAIN_DEFS=[
    {id:'basal',label:'basal',tags:['basal_excess','basal_deficit']},
    {id:'breakfast_rapid',label:'朝rapid',tags:['breakfast_rapid_excess','breakfast_rapid_deficit']},
    {id:'lunch_rapid',label:'昼rapid',tags:['lunch_rapid_excess','lunch_rapid_deficit']},
    {id:'dinner_rapid',label:'夕rapid',tags:['dinner_rapid_excess','dinner_rapid_deficit']},
    {id:'scale_dependence',label:'scale依存',tags:['scale_dependence']},
    {id:'hidden_awareness',label:'hidden excursion',tags:['hidden_low_near_miss','hidden_high_excursion']}
  ];

  function rateFor(days,caseId,def){
    const xs=days.filter(d=>d.case_id===caseId);
    if(!xs.length)return null;
    const issue=xs.filter(d=>{
      const tags=new Set(Array.isArray(d.feedback_tags)?d.feedback_tags:[]);
      return def.tags.some(t=>tags.has(t));
    }).length;
    return issue/xs.length;
  }

  function caseRates(days,caseId){
    const out={};
    for(const def of DOMAIN_DEFS)out[def.id]=rateFor(days,caseId,def);
    return out;
  }

  function priorReference(days,cases,currentCaseId){
    const prior=cases.filter(c=>c.case_id!==currentCaseId).slice(-3);
    const out={};
    for(const def of DOMAIN_DEFS){
      const vals=prior.map(c=>rateFor(days,c.case_id,def)).filter(v=>v!=null);
      out[def.id]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    }
    return {n:prior.length,rates:out};
  }

  function recurrenceCount(days,cases,currentCaseId,def){
    return cases.filter(c=>c.case_id!==currentCaseId).filter(c=>{
      const r=rateFor(days,c.case_id,def);
      return r!=null&&r>0;
    }).length;
  }

  function analyze(data,currentCaseId){
    const days=Array.isArray(data?.days)?data.days:[];
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const currentCase=cases.find(c=>c.case_id===currentCaseId)||null;
    const current=caseRates(days,currentCaseId);
    const reference=priorReference(days,cases,currentCaseId);
    const domains=DOMAIN_DEFS.map(def=>{
      const now=current[def.id];
      const before=reference.rates[def.id];
      return {
        id:def.id,label:def.label,current_rate:now,prior_rate:before,
        delta_pp:now==null||before==null?null:100*(now-before),
        prior_cases_with_issue:recurrenceCount(days,cases,currentCaseId,def)
      };
    });
    const measurable=domains.filter(d=>d.current_rate!=null);
    const improved=measurable.filter(d=>d.delta_pp!=null&&d.delta_pp<=-20).sort((a,b)=>a.delta_pp-b.delta_pp);
    const recurred=measurable.filter(d=>d.current_rate>0&&d.prior_cases_with_issue>=1).sort((a,b)=>b.prior_cases_with_issue-a.prior_cases_with_issue||b.current_rate-a.current_rate);
    const priorityPool=measurable.filter(d=>d.current_rate>0).sort((a,b)=>b.current_rate-a.current_rate||b.prior_cases_with_issue-a.prior_cases_with_issue);
    return {
      case_id:currentCaseId,
      outcome:currentCase?.outcome||null,
      reference_cases:reference.n,
      domains,
      improved:improved.slice(0,2),
      recurred:recurred.slice(0,2),
      priority:priorityPool[0]||null
    };
  }

  function domainById(id){return DOMAIN_DEFS.find(d=>d.id===id)||null}

  function scoreObjective(data,objective,completedCaseId){
    if(!objective||!completedCaseId||completedCaseId===objective.source_case_id)return null;
    const def=domainById(objective.domain_id);
    if(!def)return null;
    const currentRate=rateFor(Array.isArray(data?.days)?data.days:[],completedCaseId,def);
    if(currentRate==null)return null;
    const baseline=Number(objective.source_rate);
    let status='not_resolved';
    if(currentRate===0)status='resolved';
    else if(Number.isFinite(baseline)&&currentRate<baseline)status='improved';
    return {
      ...objective,
      target_case_id:completedCaseId,
      target_rate:currentRate,
      status,
      scored_at:new Date().toISOString()
    };
  }

  function applyCompletion(data,currentCaseId,model){
    const next={
      ...(data||{}),
      days:Array.isArray(data?.days)?data.days:[],
      cases:Array.isArray(data?.cases)?data.cases:[],
      objectives:Array.isArray(data?.objectives)?[...data.objectives]:[]
    };
    let scored=null;
    if(next.active_objective&&next.active_objective.source_case_id!==currentCaseId){
      scored=scoreObjective(next,next.active_objective,currentCaseId);
      if(scored){
        next.objectives.push(scored);
        next.objectives=next.objectives.slice(-MAX_OBJECTIVES);
        next.active_objective=null;
      }
    }
    if(model?.priority){
      next.active_objective={
        domain_id:model.priority.id,
        label:model.priority.label,
        source_case_id:currentCaseId,
        source_rate:model.priority.current_rate,
        created_at:new Date().toISOString()
      };
    }
    return {data:next,scored,active_objective:next.active_objective||null};
  }

  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}

  function objectiveScoreText(scored){
    if(!scored)return '';
    const status=scored.status==='resolved'?'達成':scored.status==='improved'?'改善':'未達';
    return `<div class="micro-note"><b>前症例の目標：</b>${scored.label} ${pct(scored.source_rate)}→${pct(scored.target_rate)}（${status}）</div>`;
  }

  function renderModel(model,scored){
    if(!model)return '';
    const improved=model.improved.length
      ?model.improved.map(d=>`${d.label} ${pct(d.prior_rate)}→${pct(d.current_rate)}`).join(' ／ ')
      :'比較可能な明確な改善はまだありません。';
    const recurred=model.recurred.length
      ?model.recurred.map(d=>`${d.label}（今回${pct(d.current_rate)}、過去${d.prior_cases_with_issue}症例でも出現）`).join(' ／ ')
      :'過去症例から繰り返した調整課題は目立ちません。';
    const priority=model.priority
      ?`次症例では「${model.priority.label}」を最優先で確認してください。正解単位を当てに行くのではなく、対応する血糖と実投与量の方向を毎日確認します。`
      :'次症例では現在の安全な処方判断を維持し、hidden excursionとscale救済の有無を確認してください。';
    return `${objectiveScoreText(scored)}<div class="micro-note"><b>改善：</b>${improved}</div><div class="micro-note"><b>反復：</b>${recurred}</div><div class="micro-note" style="margin-top:5px"><b>次症例：</b>${priority}</div>`;
  }

  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return {
        ...x,
        days:Array.isArray(x.days)?x.days:[],
        cases:Array.isArray(x.cases)?x.cases:[],
        objectives:Array.isArray(x.objectives)?x.objectives:[]
      };
    }catch{return {days:[],cases:[],objectives:[]}}
  }

  function save(data){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}}

  function ensurePanel(){
    if(typeof document==='undefined')return null;
    let el=document.querySelector('#caseDebrief');
    if(el)return el;
    const result=document.querySelector('#resultPanel');
    if(!result)return null;
    el=document.createElement('section');
    el.id='caseDebrief';
    el.className='section-block hidden';
    el.style.marginTop='14px';
    el.innerHTML='<div class="section-title"><span>D</span> 学習目標 / 症例終了debrief</div><div id="caseDebriefBody"></div>';
    result.parentNode.insertBefore(el,result.nextSibling);
    return el;
  }

  function refresh(){
    try{
      const el=ensurePanel();
      if(!el||typeof state==='undefined'){if(el)el.classList.add('hidden');return;}
      const body=el.querySelector('#caseDebriefBody');
      const data=load();
      const caseId=state.case?.case_id||'unknown';
      if(!state?.over){
        const objective=data.active_objective;
        if(objective&&objective.source_case_id!==caseId){
          if(body)body.innerHTML=`<div class="micro-note"><b>今回の学習目標：</b>${objective.label}。対応する血糖と実投与量の方向を毎日確認し、この症例終了時に改善を判定します。</div>`;
          el.classList.remove('hidden');
        }else el.classList.add('hidden');
        return;
      }
      const model=analyze(data,caseId);
      const applied=applyCompletion(data,caseId,model);
      save(applied.data);
      if(body)body.innerHTML=renderModel(model,applied.scored);
      el.classList.remove('hidden');
    }catch(e){console.error('case debrief',e)}
  }

  function mount(){
    if(typeof document==='undefined')return;
    ensurePanel();
    const submit=document.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',()=>setTimeout(refresh,45));
    const next=document.querySelector('#newCaseBtn');
    if(next)next.addEventListener('click',()=>setTimeout(refresh,0));
    refresh();
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
  return {analyze,renderModel,caseRates,scoreObjective,applyCompletion,DOMAIN_DEFS};
});
