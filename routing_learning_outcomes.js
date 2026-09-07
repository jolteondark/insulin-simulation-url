(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardRoutingLearningOutcomes=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const ARCHIVE_KEY='ward_glucose_learning_cycle_archives_v1';
  const TARGET_REASONS=new Set(['recent_tendency_adaptive','persistent','longitudinal']);
  const RELIEF_KINDS=new Set(['recent_tendency_downgraded','recent_tendency_released','persistent_released','longitudinal_released','objective_released']);
  const FULL_RELEASE_KINDS=new Set(['recent_tendency_released','persistent_released','longitudinal_released','objective_released']);
  const CORE_LEARNING_IDS=['feedback_action_alignment_rate','same_feedback_next_day_rate','objective_success_rate'];

  function load(root){
    try{
      const x=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      return {...x,cases:Array.isArray(x.cases)?x.cases:[],completion_records:x.completion_records&&typeof x.completion_records==='object'?x.completion_records:{}};
    }catch{return {cases:[],completion_records:{}}}
  }

  function loadArchives(root){
    try{const x=JSON.parse(root.localStorage.getItem(ARCHIVE_KEY)||'[]');return Array.isArray(x)?x:[]}
    catch{return []}
  }

  function focusKey(x){return x?.focus_tag||x?.domain_id||'unknown'}

  function summarize(data){
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const targeted=cases
      .map(c=>({case_id:c.case_id,...(c.adaptive_practice||{})}))
      .filter(x=>TARGET_REASONS.has(x.selection_reason));
    const targetedIds=new Set(targeted.map(x=>x.case_id).filter(Boolean));
    const transitions=Object.entries(data?.completion_records||{})
      .filter(([caseId])=>targetedIds.has(caseId))
      .map(([,record])=>record?.routing_transition)
      .filter(Boolean)
      .filter(x=>RELIEF_KINDS.has(x.kind));
    const downgraded=transitions.filter(x=>x.kind==='recent_tendency_downgraded').length;
    const released=transitions.filter(x=>FULL_RELEASE_KINDS.has(x.kind)).length;
    const persistentReleased=transitions.filter(x=>x.kind==='persistent_released').length;
    const longitudinalReleased=transitions.filter(x=>x.kind==='longitudinal_released').length;
    const keys=[...new Set([...targeted.map(focusKey),...transitions.map(focusKey)].filter(x=>x&&x!=='unknown'))];
    const focuses=keys.map(key=>{
      const attempts=targeted.filter(x=>focusKey(x)===key).length;
      const relief=transitions.filter(x=>focusKey(x)===key).length;
      const full_release=transitions.filter(x=>focusKey(x)===key&&FULL_RELEASE_KINDS.has(x.kind)).length;
      return {focus_tag:key,attempts,relief,full_release};
    }).sort((a,b)=>b.attempts-a.attempts||b.relief-a.relief||a.focus_tag.localeCompare(b.focus_tag));
    return {
      ready:targeted.length>0||transitions.length>0,
      targeted:targeted.length,
      relief:downgraded+released,
      downgraded,
      released,
      persistent_released:persistentReleased,
      longitudinal_released:longitudinalReleased,
      unresolved:Math.max(0,targeted.length-(downgraded+released)),
      focuses
    };
  }

  function renderHtml(summary,options={}){
    if(!summary?.ready)return '';
    const id=options.id||'routingLearningOutcomes';
    const title=options.title||'反復学習の成果';
    const releaseDetail=(summary.persistent_released||summary.longitudinal_released)
      ? ` ／ persistent解除 ${summary.persistent_released}、longitudinal解除 ${summary.longitudinal_released}`
      : '';
    const byFocus=summary.focuses?.length
      ? `<br><span>${summary.focuses.map(x=>`${x.focus_tag}: 重点${x.attempts}／解除${x.relief}${x.full_release?`（完全解除${x.full_release}）`:''}`).join(' ／ ')}</span>`
      : '';
    return `<div id="${id}" class="micro-note" style="margin-top:7px"><b>${title}：</b>重点症例 ${summary.targeted}回 ／ 改善で重点解除 ${summary.relief}回（downgrade ${summary.downgraded}、完全解除 ${summary.released}）${releaseDetail}${summary.unresolved?` ／ 未解除 ${summary.unresolved}回`:''}。${byFocus}</div>`;
  }

  function routingDelta(learningSummary){
    const e=learningSummary?.groups?.early,l=learningSummary?.groups?.late;
    if(!e||!l||!e.routing_targeted_n||!l.routing_targeted_n||e.routing_relief_rate==null||l.routing_relief_rate==null)return null;
    return l.routing_relief_rate-e.routing_relief_rate;
  }

  function learningRoutingConsistency(learningSummary){
    const metrics=Array.isArray(learningSummary?.metrics)?learningSummary.metrics:[];
    const core=CORE_LEARNING_IDS.map(id=>metrics.find(m=>m.id===id)).filter(m=>m?.change);
    if(!core.length)return {state:'insufficient',routing_delta:routingDelta(learningSummary),improved:0,worsened:0};
    const improved=core.filter(m=>m.change.improvement>0).length;
    const worsened=core.filter(m=>m.change.improvement<0).length;
    const delta=routingDelta(learningSummary);
    let state=worsened===0&&improved>0?'improving':improved===0&&worsened>0?'warning':worsened===0?'stable':'mixed';
    if(state==='improving'&&delta!=null&&delta<0)state='mixed';
    return {state,routing_delta:delta,improved,worsened};
  }

  function consistencyHtml(learningSummary){
    const c=learningRoutingConsistency(learningSummary);
    if(c.state==='insufficient')return '';
    const label=c.state==='improving'?'改善傾向':c.state==='warning'?'要注意':c.state==='stable'?'横ばい':'混在';
    const guard=c.routing_delta!=null&&c.routing_delta<0
      ? ' core learning指標だけなら改善方向でも、重点focus解除率が低下しているため改善とは確定しません。'
      : '';
    return `<div id="finalLearningRoutingConsistency" class="micro-note" style="margin-top:7px"><b>教育ループ整合：</b>${label}。LEARNING RESPONSEと同じrouting guardで最終debriefを解釈します。${guard}</div>`;
  }

  function blockLearningConsistency(longitudinal){
    const t=longitudinal?.latest_transition;
    if(!t||!Array.isArray(t.metrics))return {state:'insufficient',improved:0,worsened:0,curriculum_status:null};
    const core=CORE_LEARNING_IDS.map(id=>t.metrics.find(m=>m.id===id)).filter(Boolean);
    if(!core.length)return {state:'insufficient',improved:0,worsened:0,curriculum_status:t.curriculum?.status||null};
    const improved=core.filter(m=>m.classification==='improved').length;
    const worsened=core.filter(m=>m.classification==='worsened').length;
    const curriculumStatus=t.curriculum?.status||'no_focus';
    let state=worsened===0&&improved>0?'improving':improved===0&&worsened>0?'warning':worsened===0?'stable':'mixed';
    if(state==='improving'&&t.curriculum?.focus&&curriculumStatus!=='improved')state='mixed';
    return {state,improved,worsened,curriculum_status:curriculumStatus,focus:t.curriculum?.focus||null};
  }

  function blockConsistencyHtml(longitudinal){
    const c=blockLearningConsistency(longitudinal);
    if(c.state==='insufficient')return '';
    const label=c.state==='improving'?'改善傾向':c.state==='warning'?'要注意':c.state==='stable'?'横ばい':'混在';
    const guarded=c.state==='mixed'&&c.focus&&c.improved>0&&c.worsened===0;
    const guard=guarded?` core 3指標は改善方向ですが、前blockからの重点「${c.focus.label||c.focus.domain_id}」が${c.curriculum_status==='not_practiced'?'まだ重点練習されていない':'未改善'}ため、block間の改善とは確定しません。`:'';
    const priority=c.focus&&c.curriculum_status!=='improved'
      ? ` 次blockのrouting上の最優先は、未解決carryover focus「${c.focus.label||c.focus.domain_id}」の継続練習です。`
      : '';
    return `<div id="blockLearningRoutingConsistency" class="micro-note" style="margin-top:7px"><b>block間教育ループ整合：</b>${label}。core 3指標とcarryover focusの実際の改善を同じ結論にそろえます。${guard}${priority}</div>`;
  }

  function renderFinalHtml(summary,learningSummary=null){
    return `${renderHtml(summary,{id:'finalRoutingLearningOutcomes',title:'重点学習の到達点'})}${consistencyHtml(learningSummary)}`;
  }

  function longitudinal(root){
    const api=root?.WardFinalLearningDebrief,analyzer=root?.WardLearningAnalysis;
    if(!api?.buildLongitudinal||!analyzer?.summarize)return null;
    return api.buildLongitudinal(loadArchives(root),load(root),analyzer);
  }

  function refresh(root){
    if(!root?.document)return;
    const data=load(root);
    const summary=summarize(data);
    const learningSummary=root.WardLearningAnalysis?.summarize?.(data)||null;
    const progress=root.document.querySelector('#caseLearningProgress');
    if(progress){
      progress.querySelector('#routingLearningOutcomes')?.remove();
      const html=renderHtml(summary);
      if(html)progress.insertAdjacentHTML('beforeend',html);
    }
    const finalBody=root.document.querySelector('#finalLearningDebriefBody');
    if(finalBody){
      finalBody.querySelector('#finalRoutingLearningOutcomes')?.remove();
      finalBody.querySelector('#finalLearningRoutingConsistency')?.remove();
      const html=renderFinalHtml(summary,learningSummary);
      if(html)finalBody.insertAdjacentHTML('beforeend',html);
    }
    const longBody=root.document.querySelector('#longitudinalLearningDebriefBody');
    if(longBody){
      longBody.querySelector('#blockLearningRoutingConsistency')?.remove();
      const html=blockConsistencyHtml(longitudinal(root));
      if(html)longBody.insertAdjacentHTML('beforeend',html);
    }
  }

  function wrapRefresh(api,key,root){
    if(!api?.refresh||api.refresh[key])return;
    const original=api.refresh.bind(api);
    const wrapped=function(...args){
      const out=original(...args);
      refresh(root);
      return out;
    };
    wrapped[key]=true;
    api.refresh=wrapped;
  }

  function mount(root){
    if(!root?.document)return;
    wrapRefresh(root.CaseLearningProgress,'__routingLearningOutcomesWrapped',root);
    wrapRefresh(root.WardFinalLearningDebrief,'__routingLearningOutcomesFinalWrapped',root);
    for(const [selector,key] of [['#submitBtn','routingLearningOutcomesMounted'],['#newCaseBtn','routingLearningOutcomesMounted']]){
      const el=root.document.querySelector(selector);
      if(el&&!el.dataset[key]){el.dataset[key]='1';el.addEventListener('click',()=>setTimeout(()=>refresh(root),0))}
    }
    refresh(root);
  }

  return {load,loadArchives,focusKey,summarize,renderHtml,renderFinalHtml,routingDelta,learningRoutingConsistency,consistencyHtml,blockLearningConsistency,blockConsistencyHtml,longitudinal,refresh,mount,TARGET_REASONS,RELIEF_KINDS,FULL_RELEASE_KINDS,CORE_LEARNING_IDS,version:'1.6.0'};
});