(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.WardAdaptivePracticeHistory=api;api.mount(root)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1',LIMIT=3,MAX_CONSECUTIVE_ADAPTIVE=3;
  function load(root){try{return JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function labelStatus(x){return x==='resolved'?'達成':x==='improved'?'改善':x==='not_resolved'?'未達':'評価待ち'}
  function pct(x){const n=Number(x);return Number.isFinite(n)?`${Math.round(n*100)}%`:'—'}
  function delta(x){const n=Number(x);if(!Number.isFinite(n))return '—';const p=Math.round(n*100);return `${p>=0?'+':''}${p}pt`}
  function rows(data){
    return (Array.isArray(data?.cases)?data.cases:[]).map(c=>({case_id:c.case_id,...(c.adaptive_practice||{})}))
      .filter(x=>x.domain_id&&['resolved','improved','not_resolved'].includes(x.objective_status)).slice(-LIMIT).reverse();
  }
  function triggerText(x){
    if(x.selection_reason==='recent_tendency_adaptive')return '直近3症例で同方向の処方feedbackが継続したため重点化';
    if(x.selection_reason!=='longitudinal')return '';
    const recent=x.longitudinal_recent_rate??x.objective_source_rate;
    return `傾向 ${pct(recent)} vs ${pct(x.longitudinal_reference_rate)}（${delta(x.longitudinal_delta)}）`;
  }
  function rowText(x){
    const trigger=triggerText(x);
    const result=`${pct(x.source_rate)}→${pct(x.target_rate)} ${labelStatus(x.objective_status)}`;
    return `${x.focus_tag||x.domain_id}：${trigger?trigger+' → ':''}${result}`;
  }
  function render(root,dataArg){
    const body=root?.document?.querySelector?.('#caseDebriefBody');if(!body)return [];
    body.querySelector('#adaptivePracticeHistory')?.remove();
    const xs=rows(dataArg||load(root));if(!xs.length)return xs;
    const el=root.document.createElement('div');el.id='adaptivePracticeHistory';el.className='micro-note';el.style.marginTop='7px';
    const head=root.document.createElement('b');head.textContent='最近の重点練習：';el.appendChild(head);
    xs.forEach((x,i)=>{const line=root.document.createElement('div');line.textContent=rowText(x);if(i===0)line.style.marginTop='4px';el.appendChild(line)});
    const anchor=body.querySelector('#adaptivePracticeProgress');
    if(anchor)anchor.appendChild(el);else body.appendChild(el);
    return xs;
  }
  function completedCases(data){return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome))}
  function matchingBiasedPractice(c,objective){
    const p=c?.adaptive_practice;
    if(!p||p.practice_opportunity==='standard_case')return false;
    if(p.domain_id!==objective?.domain_id)return false;
    if(objective?.focus_tag&&p.focus_tag&&p.focus_tag!==objective.focus_tag)return false;
    return true;
  }
  function consecutiveAdaptiveCount(data,objective){
    const xs=completedCases(data);let n=0;
    for(let i=xs.length-1;i>=0;i--){if(!matchingBiasedPractice(xs[i],objective))break;n++}
    return n;
  }
  function shouldConsolidate(data,objective,adaptiveApi){
    if(!objective||!adaptiveApi?.isAdaptiveObjective?.(objective))return false;
    return consecutiveAdaptiveCount(data,objective)>=MAX_CONSECUTIVE_ADAPTIVE;
  }
  function installDiversityGuard(root){
    const adaptive=root?.WardAdaptiveCaseSelection;
    if(!adaptive||typeof adaptive.selectStored!=='function'||adaptive.__diversityGuardWrapped)return false;
    const raw=adaptive.selectStored.bind(adaptive);
    adaptive.selectStored=function(generate,seed){
      const data=load(root),objective=data?.active_objective||null;
      if(!shouldConsolidate(data,objective,adaptive))return raw(generate,seed);
      const storage=root.localStorage,original=storage.getItem(STORAGE_KEY);
      try{
        const muted={...data,active_objective:null};
        storage.setItem(STORAGE_KEY,JSON.stringify(muted));
        const bundle=raw(generate,seed);
        return {...bundle,adaptive_diversity_guard:{mode:'standard_consolidation',reason:'max_consecutive_adaptive_cases',consecutive_adaptive_cases:consecutiveAdaptiveCount(data,objective),domain_id:objective.domain_id||null,focus_tag:objective.focus_tag||null}};
      }finally{
        if(original===null)storage.removeItem?.(STORAGE_KEY);else storage.setItem(STORAGE_KEY,original);
      }
    };
    adaptive.__diversityGuardWrapped=true;
    return true;
  }
  function refresh(root){try{return render(root,load(root))}catch{return []}}
  function mount(root){
    installDiversityGuard(root);
    if(!root?.document)return;
    root.document.querySelector('#submitBtn')?.addEventListener('click',()=>setTimeout(()=>refresh(root),0));
    root.document.querySelector('#newCaseBtn')?.addEventListener('click',()=>setTimeout(()=>refresh(root),0));
    root.document.querySelector('#resultPanel')?.addEventListener('click',e=>{if(e.target?.closest?.('#restartBtn'))setTimeout(()=>refresh(root),0)});
    setTimeout(()=>refresh(root),0);
  }
  return {load,rows,triggerText,rowText,render,refresh,mount,completedCases,matchingBiasedPractice,consecutiveAdaptiveCount,shouldConsolidate,installDiversityGuard,LIMIT,MAX_CONSECUTIVE_ADAPTIVE,version:'1.2.0'};
});
