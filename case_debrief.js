(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WardCaseDebrief=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
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

  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}
  function renderModel(model){
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
    return `<div class="micro-note"><b>改善：</b>${improved}</div><div class="micro-note"><b>反復：</b>${recurred}</div><div class="micro-note" style="margin-top:5px"><b>次症例：</b>${priority}</div>`;
  }

  function load(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {days:[],cases:[]}}
  }

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
    el.innerHTML='<div class="section-title"><span>D</span> 症例終了debrief</div><div id="caseDebriefBody"></div>';
    result.parentNode.insertBefore(el,result.nextSibling);
    return el;
  }

  function refresh(){
    try{
      const el=ensurePanel();
      if(!el||typeof state==='undefined'||!state?.over){if(el)el.classList.add('hidden');return;}
      const caseId=state.case?.case_id||'unknown';
      const model=analyze(load(),caseId);
      const body=el.querySelector('#caseDebriefBody');
      if(body)body.innerHTML=renderModel(model);
      el.classList.remove('hidden');
    }catch(e){console.error('case debrief',e)}
  }

  function mount(){
    if(typeof document==='undefined')return;
    ensurePanel();
    const submit=document.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',()=>setTimeout(refresh,30));
    const next=document.querySelector('#newCaseBtn');
    if(next)next.addEventListener('click',()=>setTimeout(refresh,0));
    refresh();
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
  return {analyze,renderModel,caseRates,DOMAIN_DEFS};
});
