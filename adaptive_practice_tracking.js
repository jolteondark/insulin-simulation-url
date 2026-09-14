(function(root,factory){
  const routing=(root&&root.WardEducationRoutingState)||(typeof require==='function'?require('./education_routing_state.js'):null);
  const api=factory(root,routing);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardAdaptivePracticeTracking=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(root,routing){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const captured=new Map();

  function clone(x){try{return JSON.parse(JSON.stringify(x))}catch{return null}}
  function currentState(root){
    try{if(typeof state!=='undefined')return state}catch{}
    return root?.state||null;
  }
  function load(root){
    try{
      const x=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      return {...x,cases:Array.isArray(x.cases)?x.cases:[],objectives:Array.isArray(x.objectives)?x.objectives:[]};
    }catch{return {cases:[],objectives:[]}}
  }
  function save(root,data){try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}}
  function finitePositiveInt(x){const n=Number(x);return Number.isFinite(n)&&n>=1?Math.floor(n):null}
  function episodeTarget(x){return finitePositiveInt(x?.mastery_episode_target??x?.objective_mastery_episode_target)}

  function objectiveIdentity(x){
    if(!x?.domain_id)return null;
    const episode=episodeTarget(x);
    const existing=typeof x.objective_identity==='string'&&x.objective_identity?x.objective_identity:null;
    const base=existing||[x.selection_reason||'',x.domain_id||'',x.focus_tag||'',x.source_case_id||x.objective_source_case_id||'',x.created_at||x.objective_created_at||''].join('|');
    if(!episode)return base;
    const suffix=`|episode:${episode}`;
    return base.endsWith(suffix)?base:`${base}${suffix}`;
  }

  function generationObjectiveContext(root,selection){
    if(!selection?.domain_id)return null;
    const objective=load(root)?.active_objective||null;
    if(!objective||objective.domain_id!==selection.domain_id)return null;
    if(selection.focus_tag&&objective.focus_tag&&objective.focus_tag!==selection.focus_tag)return null;
    return objective;
  }

  function enrichSelectionWithEpisode(root,selection){
    if(!selection)return null;
    const objective=generationObjectiveContext(root,selection);
    const target=episodeTarget(objective);
    if(!target)return selection;
    const enriched={
      ...selection,
      mastery_state:objective?.mastery_state||selection.mastery_state||null,
      relearning_episode:objective?.relearning_episode===true,
      previous_mastery_case_id:objective?.previous_mastery_case_id||null,
      previous_mastery_episode:finitePositiveInt(objective?.previous_mastery_episode),
      mastery_episode_target:target
    };
    enriched.objective_identity=objectiveIdentity(enriched);
    return enriched;
  }

  function capture(root){
    try{
      const s=currentState(root);
      if(!s?.case?.case_id||!root.PatientGenerator?.generate)return null;
      const caseId=s.case.case_id;
      const bundle=root.PatientGenerator.generate(s.seed);
      if(bundle?.case?.case_id!==caseId)return null;
      const selection=enrichSelectionWithEpisode(root,clone(bundle.adaptive_selection));
      captured.set(caseId,selection);
      return selection;
    }catch{return null}
  }

  function getCapturedSelection(caseId){return captured.has(caseId)?clone(captured.get(caseId)):null}

  function scoredObjective(data,caseId,domainId,focusTag=null,expectedIdentity=null){
    const xs=(data.objectives||[]).filter(x=>x?.target_case_id===caseId);
    if(domainId){
      let same=xs.filter(x=>x?.domain_id===domainId&&(!focusTag||x?.focus_tag===focusTag));
      if(expectedIdentity)same=same.filter(x=>objectiveIdentity(x)===expectedIdentity);
      if(same.length)return same[same.length-1];
      return null;
    }
    if(expectedIdentity){
      const same=xs.filter(x=>objectiveIdentity(x)===expectedIdentity);
      return same.length?same[same.length-1]:null;
    }
    return xs.length?xs[xs.length-1]:null;
  }

  function scoredCandidate(data,caseId,selection){
    const xs=(data?.objectives||[]).filter(x=>x?.target_case_id===caseId);
    if(!selection?.domain_id)return xs.length?xs[xs.length-1]:null;
    const same=xs.filter(x=>x?.domain_id===selection.domain_id&&(!selection.focus_tag||x?.focus_tag===selection.focus_tag));
    return same.length?same[same.length-1]:null;
  }

  function committedNextObjective(data,caseId,selection){
    const records=data?.completion_records&&typeof data.completion_records==='object'?data.completion_records:{};
    const sourceId=selection?.objective_source_case_id||null;
    const direct=sourceId&&sourceId!==caseId?records[sourceId]?.next_objective:null;
    if(direct)return {objective:direct,case_id:sourceId,source:'objective_source_case'};
    const generatedId=objectiveIdentity(selection);
    if(!generatedId)return null;
    const entries=Object.entries(records).filter(([id])=>id!==caseId).reverse();
    for(const [id,rec] of entries){
      if(objectiveIdentity(rec?.next_objective)===generatedId)return {objective:rec.next_objective,case_id:id,source:'identity_match'};
    }
    return null;
  }

  function objectiveIdentityIntegrity(data,caseId,selection,scored=null){
    if(!selection?.domain_id)return {
      status:'not_applicable',
      committed_next_objective_identity:null,
      generated_objective_identity:null,
      scored_objective_identity:null,
      committed_source_case_id:null,
      committed_vs_generated:null,
      generated_vs_scored:null,
      mastery_episode_target:null,
      committed_mastery_episode_target:null,
      scored_mastery_episode_target:null
    };
    const generated=objectiveIdentity(selection);
    const committed=committedNextObjective(data,caseId,selection);
    const committedId=objectiveIdentity(committed?.objective);
    const candidate=scored||scoredCandidate(data,caseId,selection);
    const scoredId=objectiveIdentity(candidate);
    const commitMatch=committedId&&generated?committedId===generated:null;
    const scoreMatch=scoredId&&generated?scoredId===generated:null;
    let status='generated_scored_match_unverified_commit';
    if(commitMatch===false||scoreMatch===false)status='mismatch';
    else if(!scoredId)status='awaiting_score';
    else if(commitMatch===true&&scoreMatch===true)status='matched';
    return {
      status,
      committed_next_objective_identity:committedId||null,
      generated_objective_identity:generated||null,
      scored_objective_identity:scoredId||null,
      committed_source_case_id:committed?.case_id||null,
      committed_source:committed?.source||null,
      committed_vs_generated:commitMatch,
      generated_vs_scored:scoreMatch,
      mastery_episode_target:episodeTarget(selection),
      committed_mastery_episode_target:episodeTarget(committed?.objective),
      scored_mastery_episode_target:episodeTarget(candidate)
    };
  }

  function lifecycle(selection,scored){
    if(!routing||typeof routing.practiceLifecycle!=='function')throw new Error('WardEducationRoutingState.practiceLifecycle is required');
    return routing.practiceLifecycle(selection,scored);
  }

  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function optionalFinite(x){if(x===null||x===undefined||x==='')return null;return finite(x)}
  function practiceRecord(selection,scored,identityIntegrity=null){
    if(!selection)return null;
    const routingLifecycle=lifecycle(selection,scored);
    return {
      domain_id:selection.domain_id||null,
      focus_tag:selection.focus_tag||null,
      persistent_streak:Number(selection.persistent_streak)||0,
      selection_reason:selection.selection_reason||null,
      objective_identity:objectiveIdentity(selection),
      objective_source_case_id:selection.objective_source_case_id||null,
      objective_created_at:selection.objective_created_at||null,
      objective_routing_source:selection.objective_routing_source||null,
      objective_source_rate:finite(selection.objective_source_rate),
      mastery_state:selection.mastery_state||null,
      relearning_episode:selection.relearning_episode===true,
      previous_mastery_case_id:selection.previous_mastery_case_id||null,
      previous_mastery_episode:episodeTarget({mastery_episode_target:selection.previous_mastery_episode}),
      mastery_episode_target:episodeTarget(selection),
      longitudinal_recent_rate:finite(selection.longitudinal_recent_rate),
      longitudinal_reference_rate:finite(selection.longitudinal_reference_rate),
      longitudinal_delta:finite(selection.longitudinal_delta),
      tendency_recent_cases:finite(selection.tendency_recent_cases),
      tendency_case_hits:finite(selection.tendency_case_hits),
      learning_curve_signal_cases:optionalFinite(selection.learning_curve_signal_cases),
      learning_curve_failure_cases:optionalFinite(selection.learning_curve_failure_cases),
      learning_curve_failure_score:optionalFinite(selection.learning_curve_failure_score),
      selected_seed:selection.selected_seed??null,
      standard_seed:selection.standard_seed??null,
      selected_score:Number.isFinite(Number(selection.selected_score))?Number(selection.selected_score):null,
      standard_score:Number.isFinite(Number(selection.standard_score))?Number(selection.standard_score):null,
      selected_focus:clone(selection.selected_focus),
      fallback_to_standard:Boolean(selection.fallback_to_standard),
      practice_opportunity:selection.fallback_to_standard?'standard_case':(Number(selection.selected_score)<=Number(selection.standard_score)?'domain_aligned':'bounded_candidate'),
      objective_status:scored?.status||null,
      source_rate:Number.isFinite(Number(scored?.source_rate))?Number(scored.source_rate):null,
      target_rate:Number.isFinite(Number(scored?.target_rate))?Number(scored.target_rate):null,
      score_basis:scored?.score_basis||null,
      objective_identity_integrity:clone(identityIntegrity),
      routing_lifecycle:routingLifecycle,
      recorded_at:new Date().toISOString()
    };
  }

  function attachPractice(data,caseId,selection){
    if(!selection)return {data,record:null};
    const next={...(data||{}),cases:Array.isArray(data?.cases)?[...data.cases]:[],objectives:Array.isArray(data?.objectives)?data.objectives:[]};
    const idx=next.cases.findIndex(c=>c.case_id===caseId);
    if(idx<0)return {data:next,record:null};
    const scored=scoredObjective(next,caseId,selection.domain_id,selection.focus_tag||null,objectiveIdentity(selection));
    const integrity=objectiveIdentityIntegrity(next,caseId,selection,scored);
    const record=practiceRecord(selection,scored,integrity);
    next.cases[idx]={...next.cases[idx],adaptive_practice:record};
    return {data:next,record};
  }

  function persist(root){
    try{
      const s=currentState(root);
      if(!s?.over)return null;
      const caseId=s.case?.case_id;
      if(!caseId)return null;
      if(root?.WardCaseCompletionTransaction){
        const data=load(root);
        const rec=data.cases.find(c=>c.case_id===caseId)?.adaptive_practice||null;
        if(rec)render(root,rec);
        return rec;
      }
      const selection=getCapturedSelection(caseId);
      if(!selection)return null;
      const attached=attachPractice(load(root),caseId,selection);
      if(!attached.record)return null;
      save(root,attached.data);
      render(root,attached.record);
      root.CaseLearningProgress?.refresh?.();
      return attached.record;
    }catch{return null}
  }

  function statusLabel(x){return x==='resolved'?'達成':x==='improved'?'改善':x==='not_resolved'?'未達':'評価待ち'}
  function domainLabel(id){return routing?.DOMAIN_LABELS?.[id]||id||'重点領域'}
  function pct(x){return Number.isFinite(Number(x))?`${Math.round(100*Number(x))}%`:'—'}
  function pointDelta(x){const n=Number(x);if(!Number.isFinite(n))return '—';const p=Math.round(100*n);return `${p>=0?'+':''}${p}pt`}
  function lifecycleLabel(x){
    if(x?.state==='released')return `persistent解除（${x.persistent_before}回未達後に改善）`;
    if(x?.state==='continued')return `persistent継続（未達streak ${x.persistent_after}）`;
    if(x?.state==='active')return `persistent評価中（streak ${x.persistent_before}）`;
    return '';
  }
  function triggerLabel(record){
    if(record?.objective_routing_source==='learning_curve_curriculum'){
      const signals=optionalFinite(record.learning_curve_signal_cases),failures=optionalFinite(record.learning_curve_failure_cases),score=optionalFinite(record.learning_curve_failure_score);
      const detail=signals!==null&&failures!==null?`（課題 ${Math.round(failures)}/${Math.round(signals)}症例${score!==null?`・重み ${score}`:''}）`:'';
      return `直近4症例の複数信号から弱点を検出${detail}`;
    }
    if(record?.selection_reason==='recent_tendency_adaptive'){
      const recent=Math.max(0,Math.round(Number(record.tendency_recent_cases)||0));
      const hits=Math.max(0,Math.round(Number(record.tendency_case_hits)||0));
      return `直近${recent||3}症例中${hits||3}症例で同方向の処方feedbackが継続したため重点化`;
    }
    if(record?.selection_reason!=='longitudinal')return '';
    const recent=record.longitudinal_recent_rate??record.objective_source_rate;
    const reference=record.longitudinal_reference_rate;
    const delta=record.longitudinal_delta;
    return `最近3症例 ${pct(recent)} ／ それ以前 ${pct(reference)}（差 ${pointDelta(delta)}）で問題増加を検出`;
  }
  function integrityLabel(record){
    const x=record?.objective_identity_integrity;
    if(x?.status==='mismatch')return '⚠ learning objective identity不整合を検出';
    if(x?.status==='matched')return 'objective identity: routing→症例生成→採点 一致';
    return '';
  }

  function render(root,record){
    if(!record||!root.document)return;
    const body=root.document.querySelector('#caseDebriefBody');
    if(!body)return;
    body.querySelector('#adaptivePracticeOutcome')?.remove();
    const aligned=record.practice_opportunity==='domain_aligned'?'通常generator候補から重点領域を練習しやすい症例を選択':record.practice_opportunity==='standard_case'?'drift guardにより標準症例を維持':'安全範囲内の候補を使用';
    const trigger=triggerLabel(record);
    const score=record.objective_status?`${pct(record.source_rate)} → ${pct(record.target_rate)}（${statusLabel(record.objective_status)}）`:'症例目標の採点記録を待機';
    const route=lifecycleLabel(record.routing_lifecycle);
    const integrity=integrityLabel(record);
    body.insertAdjacentHTML('beforeend',`<div id="adaptivePracticeOutcome" class="micro-note" style="margin-top:8px"><b>重点練習の追跡：</b>${domainLabel(record.domain_id)} ／ ${aligned}${trigger?`<br><b>起点：</b>${trigger}`:''}<br><b>今回の結果：</b>${score}${route?`<br><b>routing：</b>${route}`:''}${integrity?`<br><b>E2E：</b>${integrity}`:''}</div>`);
  }

  function captureAfterStart(root){setTimeout(()=>capture(root),0)}
  function persistAfterTerminal(root){setTimeout(()=>persist(root),0)}

  function mount(root){
    if(!root.document)return;
    captureAfterStart(root);
    const original=root.startGenerated;
    if(typeof original==='function'&&!original.__adaptivePracticeWrapped){
      const wrapped=function(...args){const out=original.apply(this,args);captureAfterStart(root);return out};
      wrapped.__adaptivePracticeWrapped=true;
      root.startGenerated=wrapped;
    }
    root.document.querySelector('#submitBtn')?.addEventListener('click',()=>persistAfterTerminal(root));
    root.document.querySelector('#newCaseBtn')?.addEventListener('click',()=>captureAfterStart(root));
    root.document.querySelector('#resultPanel')?.addEventListener('click',e=>{if(e.target?.closest?.('#restartBtn'))captureAfterStart(root)});
  }

  return {practiceRecord,attachPractice,getCapturedSelection,lifecycle,objectiveIdentity,episodeTarget,generationObjectiveContext,enrichSelectionWithEpisode,scoredObjective,scoredCandidate,committedNextObjective,objectiveIdentityIntegrity,statusLabel,domainLabel,lifecycleLabel,triggerLabel,integrityLabel,currentState,render,persist,mount,version:'2.2.0'};
});