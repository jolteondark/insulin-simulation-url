(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.WardLearningRecoveryProgress=api;api.mount(root)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const REFRESH_EVENTS=['ward:caseLearningHistoryUpdated','ward:caseDebriefUpdated','ward:caseLearningOutcomeUpdated','ward:learningObjectiveUpdated','ward:insulinStateChanged'];
  const DOMAIN_LABELS={basal:'basal',breakfast_rapid:'朝rapid',lunch_rapid:'昼rapid',dinner_rapid:'夕rapid',scale_dependence:'scale依存',hidden_awareness:'hidden excursion',safety_response:'安全対応'};
  const boundRoots=new WeakSet();

  function load(root){try{return JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function completedCases(data){return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome))}
  function practiceAt(cases,index){return cases[index]?.adaptive_practice||null}
  function previousPracticeIndex(cases,start){for(let i=start;i>=0;i--){if(practiceAt(cases,i)?.domain_id)return i}return -1}
  function latestPracticeIndex(cases){return previousPracticeIndex(cases,cases.length-1)}
  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}

  function latestFocusRecovery(cases){
    const lastIndex=latestPracticeIndex(cases);
    if(lastIndex<0)return null;
    const retry=practiceAt(cases,lastIndex);
    if(!retry?.domain_id||!['improved','resolved'].includes(retry.objective_status))return null;
    const firstIndex=previousPracticeIndex(cases,lastIndex-1);
    if(firstIndex<0)return null;
    const first=practiceAt(cases,firstIndex);
    if(first?.domain_id!==retry.domain_id||first.objective_status!=='not_resolved')return null;
    const priorIndex=previousPracticeIndex(cases,firstIndex-1);
    if(priorIndex<0)return null;
    const prior=practiceAt(cases,priorIndex);
    if(!prior?.domain_id||prior.domain_id===first.domain_id)return null;
    const priorReleased=prior?.routing_lifecycle?.state==='released';
    if(prior.objective_status!=='resolved'&&!priorReleased)return null;
    return {
      from_domain:prior.domain_id,
      from_label:DOMAIN_LABELS[prior.domain_id]||prior.domain_id,
      domain_id:retry.domain_id,
      label:DOMAIN_LABELS[retry.domain_id]||retry.domain_id,
      first_case_id:cases[firstIndex]?.case_id||null,
      retry_case_id:cases[lastIndex]?.case_id||null,
      first_rate:finite(first.target_rate),
      retry_rate:finite(retry.target_rate),
      retry_status:retry.objective_status,
      resolved:retry.objective_status==='resolved'
    };
  }

  function pct(x){return x==null?'—':`${Math.round(100*Number(x))}%`}
  function renderRecoveryHtml(recovery){
    if(!recovery)return '';
    const result=recovery.resolved?'✓解除':'↗改善';
    const rates=recovery.first_rate!=null&&recovery.retry_rate!=null?`問題率 ${pct(recovery.first_rate)} → ${pct(recovery.retry_rate)}`:'';
    const body=recovery.resolved
      ?'初回未達のfeedbackを次の症例へ反映し、同じ重点を解除まで進めました。'
      :'初回未達のfeedbackを次の症例へ反映し、同じ重点で改善方向へ転じました。';
    return `<div class="record-card" data-learning-recovery="1" style="margin-top:8px"><div class="section-kicker">RETRY PROGRESS</div><div style="font-weight:800">${recovery.label}：初回未達 → 再挑戦 ${result}</div><div class="micro-note" style="margin-top:4px">${rates}${rates?'。':''}${body}</div></div>`;
  }

  function render(root,dataArg){
    const data=dataArg||load(root),cases=completedCases(data),recovery=latestFocusRecovery(cases);
    const panel=root?.document?.querySelector?.('#learningRunProgress');
    if(!panel)return recovery;
    panel.querySelector?.('[data-learning-recovery="1"]')?.remove?.();
    if(!recovery)return null;
    const anchor=panel.querySelector?.('.record-card');
    const holder=root.document.createElement('div');
    holder.innerHTML=renderRecoveryHtml(recovery);
    const card=holder.firstElementChild;
    if(anchor?.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling);
    else panel.appendChild(card);
    return recovery;
  }

  function mount(root){
    if(!root?.document||boundRoots.has(root))return;
    boundRoots.add(root);
    let queued=false;
    const schedule=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;render(root)},0)};
    schedule();
    for(const name of REFRESH_EVENTS)root.addEventListener?.(name,schedule);
    root.addEventListener?.('storage',e=>{if(!e?.key||e.key===STORAGE_KEY)schedule()});
  }

  return {completedCases,previousPracticeIndex,latestPracticeIndex,latestFocusRecovery,renderRecoveryHtml,render,mount,version:'1.0.0'};
});