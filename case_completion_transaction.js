(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardCaseCompletionTransaction=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const MAX_IDENTITY_QUARANTINE=100;

  function currentState(root){
    try{if(typeof state!=='undefined')return state}catch{}
    return root?.state||null;
  }
  function load(root){
    try{
      const x=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      return {
        ...x,
        days:Array.isArray(x.days)?x.days:[],
        cases:Array.isArray(x.cases)?x.cases:[],
        objectives:Array.isArray(x.objectives)?x.objectives:[],
        completion_records:x.completion_records&&typeof x.completion_records==='object'?x.completion_records:{},
        identity_integrity_quarantine:Array.isArray(x.identity_integrity_quarantine)?x.identity_integrity_quarantine:[]
      };
    }catch{return {days:[],cases:[],objectives:[],completion_records:{},identity_integrity_quarantine:[]}}
  }
  function save(root,data){root.localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}

  function ownsTerminalCompletion(rootArg){
    const r=rootArg||root;
    return Boolean(r?.LearningCurve?.applyLatest);
  }

  function completedRecord(data,caseId){
    const rec=data?.completion_records?.[caseId];
    return rec?.completion_transaction?rec:null;
  }

  function terminalFeedback(s){
    const rec=s?.history?.[s.history.length-1];
    const feedback=rec?.education_feedback;
    if(!rec||!feedback?.primary_text)return null;
    return {
      case_id:s?.case?.case_id||'unknown',
      day:Number(rec.day)||null,
      primary_tag:feedback.primary_tag||null,
      text:String(feedback.primary_text),
      recorded_at:new Date().toISOString()
    };
  }

  function resolveNextObjective(root,data){
    const routing=root?.WardEducationRoutingState;
    if(!routing?.resolveData)return {data,routing:null};
    const resolved=routing.resolveData(data);
    return {data:resolved?.data||data,routing:resolved||null};
  }

  function releaseTransition(beforeObjective,routing){
    if(!beforeObjective||!routing?.release)return null;
    const released=routing.release;
    const sameDomain=released?.domain_id===beforeObjective?.domain_id;
    const sameDirection=!beforeObjective?.focus_tag||!released?.focus_tag||released.focus_tag===beforeObjective.focus_tag;
    if(!sameDomain||!sameDirection)return null;
    const focusTag=beforeObjective.focus_tag||released.focus_tag||null;
    const before=beforeObjective.selection_reason||null;
    if(before==='persistent')return {kind:'persistent_released',before,after:routing.objective?.selection_reason||null,domain_id:beforeObjective.domain_id,focus_tag:focusTag,message:'重点練習で同方向の課題が改善したため、persistent focusを解除しました。'};
    if(before==='longitudinal')return {kind:'longitudinal_released',before,after:routing.objective?.selection_reason||null,domain_id:beforeObjective.domain_id,focus_tag:focusTag,message:'縦断的な弱点が改善したため、このlongitudinal focusを解除しました。'};
    if(['resolved','improved'].includes(released?.status))return {kind:'objective_released',before,after:routing.objective?.selection_reason||null,domain_id:beforeObjective.domain_id,focus_tag:focusTag,message:'今回のlearning objectiveが改善したため、同方向のfocusを次症例へ持ち越しません。'};
    return null;
  }

  function routingTransition(beforeObjective,routing){
    if(!routing)return null;
    const before=beforeObjective?.selection_reason||null;
    const after=routing.objective?.selection_reason||null;
    if(before==='recent_tendency_adaptive'&&after==='recent_tendency'){
      const recent=Math.max(0,Math.round(Number(routing.tendency?.recent_n)||3));
      const hits=Math.max(0,Math.round(Number(routing.tendency?.hits)||2));
      return {kind:'recent_tendency_downgraded',before,after,domain_id:beforeObjective?.domain_id||null,focus_tag:routing.objective?.focus_tag||beforeObjective?.focus_tag||null,recent_cases:recent,case_hits:hits,message:`重点練習後、同方向の処方feedbackは直近${recent}症例中${hits}症例まで減少。重点症例選択を解除し、通常のlearning focusへ戻しました。`};
    }
    if((before==='recent_tendency_adaptive'||before==='recent_tendency')&&!after&&routing.reason==='recent_tendency_released'){
      return {kind:'recent_tendency_released',before,after:null,domain_id:beforeObjective?.domain_id||null,focus_tag:beforeObjective?.focus_tag||null,recent_cases:3,case_hits:routing.tendency?.hits??0,message:'同方向の処方feedbackが直近3症例で反復基準を下回ったため、このlearning focusを解除しました。'};
    }
    return releaseTransition(beforeObjective,routing);
  }

  function quarantinedPractice(practice){
    if(!practice||typeof practice!=='object')return practice;
    return {
      ...practice,
      original_selection_reason:practice.selection_reason||null,
      original_objective_status:practice.objective_status||null,
      selection_reason:'identity_mismatch_quarantined',
      objective_status:'quarantined',
      learning_attribution_excluded:true
    };
  }

  function quarantineIdentityMismatch(data,caseId,practice){
    const integrity=practice?.objective_identity_integrity;
    if(integrity?.status!=='mismatch')return {data,quarantined:false,removed_objectives:[]};
    const objectives=Array.isArray(data?.objectives)?data.objectives:[];
    const removed=objectives.filter(x=>x?.target_case_id===caseId);
    const kept=objectives.filter(x=>x?.target_case_id!==caseId);
    const priorRecord=data?.completion_records?.[caseId]||{};
    const cases=Array.isArray(data?.cases)?data.cases.map(c=>c?.case_id===caseId?{
      ...c,
      adaptive_practice:quarantinedPractice(c?.adaptive_practice||practice),
      learning_attribution_excluded:true,
      learning_attribution_exclusion_reason:'objective_identity_mismatch'
    }:c):[];
    const completionRecords={
      ...(data?.completion_records||{}),
      [caseId]:{
        ...priorRecord,
        scored:null,
        case_learning_trace:null,
        followthrough_objective_release:null,
        routing_transition:null,
        learning_attribution_excluded:true,
        learning_attribution_exclusion_reason:'objective_identity_mismatch'
      }
    };
    const quarantine=[...(Array.isArray(data?.identity_integrity_quarantine)?data.identity_integrity_quarantine:[]),{
      case_id:caseId,
      reason:'objective_identity_mismatch',
      integrity:JSON.parse(JSON.stringify(integrity)),
      adaptive_practice:practice?JSON.parse(JSON.stringify(practice)):null,
      objectives:removed.map(x=>JSON.parse(JSON.stringify(x))),
      completion_attribution:{
        scored:priorRecord?.scored?JSON.parse(JSON.stringify(priorRecord.scored)):null,
        case_learning_trace:priorRecord?.case_learning_trace?JSON.parse(JSON.stringify(priorRecord.case_learning_trace)):null,
        followthrough_objective_release:priorRecord?.followthrough_objective_release?JSON.parse(JSON.stringify(priorRecord.followthrough_objective_release)):null,
        routing_transition:priorRecord?.routing_transition?JSON.parse(JSON.stringify(priorRecord.routing_transition)):null
      },
      recorded_at:new Date().toISOString()
    }].slice(-MAX_IDENTITY_QUARANTINE);
    return {
      data:{...data,cases,objectives:kept,completion_records:completionRecords,identity_integrity_quarantine:quarantine},
      quarantined:true,
      removed_objectives:removed
    };
  }

  function renderRoutingTransition(root,transition){
    if(!root?.document)return;
    const body=root.document.querySelector('#caseDebriefBody');
    if(!body)return;
    body.querySelector('#routingTransitionOutcome')?.remove();
    if(!transition?.message)return;
    const debriefDetails=body.querySelector('[data-debrief-details="1"]');
    if(debriefDetails){
      debriefDetails.insertAdjacentHTML('beforeend',`<div id="routingTransitionOutcome" class="micro-note" style="margin-top:6px"><b>学習routing更新：</b>${transition.message}</div>`);
      return;
    }
    const learningDetails=body.querySelector('#caseLearningProgress details');
    if(learningDetails){
      learningDetails.insertAdjacentHTML('beforeend',`<div id="routingTransitionOutcome" class="micro-note" style="margin-top:6px"><b>学習routing更新：</b>${transition.message}</div>`);
    }
  }

  function suppressDuplicateLearningFocus(root){
    if(!root?.document)return false;
    const body=root.document.querySelector('#caseDebriefBody');
    const primary=body?.querySelector?.('[data-debrief-next="1"]');
    const summary=body?.querySelector?.('#caseLearningProgress > .micro-note');
    if(!primary||!summary||typeof summary.innerHTML!=='string')return false;
    const next=summary.innerHTML.replace(/<b>今回の重点：<\/b>.*?<br>/,'');
    if(next===summary.innerHTML)return false;
    summary.innerHTML=next;
    summary.dataset.primaryFocus='case-debrief';
    return true;
  }

  function collapseSecondaryTerminalLearning(root){
    if(!root?.document)return false;
    const body=root.document.querySelector('#caseDebriefBody');
    const primary=body?.querySelector?.('[data-debrief-next="1"]');
    const details=body?.querySelector?.('[data-debrief-details="1"]');
    if(!primary||!details||typeof details.appendChild!=='function')return false;
    let moved=false;
    for(const selector of ['#learningMomentum','#learningRunProgress']){
      const panel=root.document.querySelector(selector);
      if(!panel||panel===details||panel.parentNode===details)continue;
      panel.dataset.terminalSecondary='1';
      details.appendChild(panel);
      moved=true;
    }
    return moved;
  }

  function refreshTerminalUi(root,data=null,caseId=null){
    suppressDuplicateLearningFocus(root);
    root.CaseTransitionCta?.refresh?.();
    root.WardLearningMomentum?.refresh?.(root,data,caseId);
    root.WardLearningRunProgress?.refresh?.(root,data);
    collapseSecondaryTerminalLearning(root);
    root.RepeatPlayActionDock?.refresh?.();
  }

  function renderCommitted(root,data,caseId){
    const debrief=root.WardCaseDebrief,tracking=root.WardAdaptivePracticeTracking,learning=root.LearningCurve;
    debrief?.renderCompletion?.(data,caseId);
    const practice=data?.cases?.find?.(c=>c.case_id===caseId)?.adaptive_practice||null;
    if(practice)tracking?.render?.(root,practice);
    renderRoutingTransition(root,data?.completion_records?.[caseId]?.routing_transition||null);
    learning?.render?.();
    root.CaseLearningProgress?.refresh?.();
    refreshTerminalUi(root,data,caseId);
    return practice;
  }

  function complete(root){
    try{
      const s=currentState(root);
      if(!s?.over||!s?.case?.case_id)return null;
      const learning=root.LearningCurve,debrief=root.WardCaseDebrief,tracking=root.WardAdaptivePracticeTracking;
      if(!ownsTerminalCompletion(root))return null;
      if(!debrief?.analyze||!debrief?.applyCompletion)throw new Error('WardCaseDebrief completion API is required');
      if(!tracking?.attachPractice||!tracking?.getCapturedSelection)throw new Error('WardAdaptivePracticeTracking transaction API is required');

      const caseId=s.case.case_id;
      const before=load(root);
      const priorCommitted=completedRecord(before,caseId);
      if(priorCommitted){
        const practice=renderCommitted(root,before,caseId);
        return {data:before,model:null,scored:priorCommitted.scored||null,practice,routing:null,routing_transition:priorCommitted.routing_transition||null,next_objective:priorCommitted.next_objective||null,reused:true};
      }

      const withBase=learning.applyLatest(before,s);
      const model=debrief.analyze(withBase,caseId);
      const applied=debrief.applyCompletion(withBase,caseId,model);
      const selection=tracking.getCapturedSelection(caseId);
      const attached=tracking.attachPractice(applied.data,caseId,selection);
      const quarantined=quarantineIdentityMismatch(attached.data,caseId,attached.record);
      const attributionData=quarantined.data;
      const beforeObjective=attributionData?.active_objective||null;
      const routed=resolveNextObjective(root,attributionData);
      const next=routed.data;
      const transition=quarantined.quarantined?null:routingTransition(beforeObjective,routed.routing);
      const nextObjective=routed.routing?.objective||next?.active_objective||null;
      const feedback=terminalFeedback(s);
      if(feedback)next.last_terminal_feedback=feedback;
      const prior=next.completion_records?.[caseId]||{};
      next.completion_records={...(next.completion_records||{}),[caseId]:{
        ...prior,
        routing_transition:transition,
        next_objective:nextObjective,
        objective_identity_integrity:attached.record?.objective_identity_integrity||null,
        learning_attribution_quarantined:quarantined.quarantined,
        quarantined_objective_count:quarantined.removed_objectives.length,
        completion_transaction:{
          version:14,
          learning_curve_attached:true,
          adaptive_practice_attached:Boolean(attached.record),
          terminal_feedback_attached:Boolean(feedback),
          next_objective_resolved:Boolean(routed.routing),
          next_objective_attached:Boolean(nextObjective),
          routing_transition_attached:Boolean(transition),
          learning_attribution_quarantined:quarantined.quarantined,
          attribution_signals_neutralized:quarantined.quarantined,
          learning_trace_neutralized:quarantined.quarantined,
          learning_run_refreshed:Boolean(root?.WardLearningRunProgress?.refresh),
          momentum_feedback_ready:true,
          write_count:1,
          committed_at:new Date().toISOString()
        }
      }};

      save(root,next);
      debrief.renderCompletion?.(next,caseId);
      if(attached.record)tracking.render?.(root,attached.record);
      renderRoutingTransition(root,transition);
      learning.render?.();
      root.CaseLearningProgress?.refresh?.();
      refreshTerminalUi(root,next,caseId);
      return {data:next,model,scored:applied.scored||null,practice:attached.record||null,routing:routed.routing,routing_transition:transition,next_objective:nextObjective,terminal_feedback:feedback,learning_attribution_quarantined:quarantined.quarantined,reused:false};
    }catch(e){
      console.error('case completion transaction',e);
      return null;
    }
  }

  function completeAfterTerminal(root){setTimeout(()=>complete(root),0)}
  function mount(root){
    if(!root?.document)return;
    root.document.querySelector('#submitBtn')?.addEventListener('click',()=>completeAfterTerminal(root));
    completeAfterTerminal(root);
  }

  return {complete,currentState,load,ownsTerminalCompletion,completedRecord,terminalFeedback,resolveNextObjective,releaseTransition,routingTransition,quarantinedPractice,quarantineIdentityMismatch,renderRoutingTransition,suppressDuplicateLearningFocus,collapseSecondaryTerminalLearning,refreshTerminalUi,mount,version:'1.16.0'};
});