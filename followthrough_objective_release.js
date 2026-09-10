(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardFollowthroughObjectiveRelease=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const DOSE_KEY_DOMAIN={basal_u:'basal',breakfast_u:'breakfast_rapid',lunch_u:'lunch_rapid',dinner_u:'dinner_rapid'};
  const RELEASABLE_ROUTING_SOURCES=new Set(['followthrough_learning','mastery_recurrence']);

  function sameDirection(x,y){
    if(!x||!y||x.domain_id!==y.domain_id)return false;
    return !x.focus_tag||!y.focus_tag||x.focus_tag===y.focus_tag;
  }

  function followedAction(trace,objective){
    const actions=trace?.feedback_followthrough?.actions;
    if(!Array.isArray(actions)||!objective?.domain_id)return null;
    for(let i=actions.length-1;i>=0;i--){
      const a=actions[i];
      if(a?.status!=='followed'||DOSE_KEY_DOMAIN[a?.dose_key]!==objective.domain_id)continue;
      if(objective.focus_tag&&a?.feedback_tag!==objective.focus_tag)continue;
      return a;
    }
    return null;
  }

  function latestReleasedObjective(data,caseId){
    const xs=Array.isArray(data?.objectives)?data.objectives:[];
    for(let i=xs.length-1;i>=0;i--){
      const x=xs[i];
      if(x?.target_case_id!==caseId||x?.selection_reason!=='longitudinal')continue;
      if(!['resolved','improved'].includes(x?.status))continue;
      if(!RELEASABLE_ROUTING_SOURCES.has(x?.routing_source))continue;
      return x;
    }
    return null;
  }

  function masteryEpisode(data,objective,caseId){
    const focus=objective?.focus_tag||objective?.domain_id||null;
    if(!focus)return 1;
    let previous=0;
    for(const [id,record] of Object.entries(data?.completion_records||{})){
      if(id===caseId)continue;
      const x=record?.followthrough_objective_release||{};
      if(x.action_status!=='followed')continue;
      if((x.focus_tag||x.domain_id)===focus)previous++;
    }
    return previous+1;
  }

  function applyRelease(data,caseId){
    const next={...(data||{}),completion_records:{...(data?.completion_records||{})}};
    const objective=latestReleasedObjective(next,caseId);
    const rec=next.completion_records?.[caseId];
    const trace=rec?.case_learning_trace;
    const action=followedAction(trace,objective);
    const current=next.active_objective||null;
    if(!objective||!action||!current||!sameDirection(current,objective)||current.source_case_id!==caseId){
      return {data:next,released:false,objective,action,current};
    }
    const episode=masteryEpisode(next,objective,caseId);
    next.active_objective=null;
    next.completion_records[caseId]={
      ...rec,
      routing_transition:rec?.routing_transition||{
        kind:'longitudinal_released',
        before:'longitudinal',
        after:null,
        domain_id:objective.domain_id,
        focus_tag:objective.focus_tag||null,
        message:episode>1
          ? '再出現した重点focusでfeedbackに沿った処方変更ができ、同方向のobjectiveも改善したため、再克服としてfocusを解除しました。'
          : '重点症例でfeedbackに沿った処方変更ができ、同方向のobjectiveも改善したため、このfollowthrough focusを解除しました。'
      },
      followthrough_objective_release:{
        version:2,
        domain_id:objective.domain_id,
        focus_tag:objective.focus_tag||null,
        target_case_id:caseId,
        score_status:objective.status,
        action_status:action.status,
        routing_source:objective.routing_source||null,
        mastery_episode:episode,
        reacquired:episode>1,
        released_at:new Date().toISOString()
      }
    };
    return {data:next,released:true,objective,action,current,mastery_episode:episode,reacquired:episode>1};
  }

  function load(root){try{return JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return {}}}
  function save(root,data){try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}}
  function currentCaseId(root){
    try{if(typeof state!=='undefined')return state?.case?.case_id||null}catch{}
    return root?.state?.case?.case_id||null;
  }
  function reconcile(root){
    const caseId=currentCaseId(root);if(!caseId)return null;
    const out=applyRelease(load(root),caseId);
    if(!out.released)return out;
    save(root,out.data);
    root.WardEducationRoutingState?.resolveStored?.(root);
    root.CaseLearningProgress?.refresh?.();
    root.WardRoutingLearningOutcomes?.refresh?.(root);
    root.WardCaseDebrief?.renderActiveFocus?.(out.data,caseId);
    return out;
  }
  function afterTerminal(root){setTimeout(()=>setTimeout(()=>reconcile(root),0),0)}
  function mount(root){
    if(!root?.document)return;
    root.document.querySelector('#submitBtn')?.addEventListener('click',()=>afterTerminal(root));
    afterTerminal(root);
  }

  return {sameDirection,followedAction,latestReleasedObjective,masteryEpisode,applyRelease,load,reconcile,mount,DOSE_KEY_DOMAIN,RELEASABLE_ROUTING_SOURCES,version:'1.1.0'};
});
