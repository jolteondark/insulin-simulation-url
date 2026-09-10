(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardCaseCompletionTransaction=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';

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
        completion_records:x.completion_records&&typeof x.completion_records==='object'?x.completion_records:{}
      };
    }catch{return {days:[],cases:[],objectives:[],completion_records:{}}}
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

  function renderRoutingTransition(root,transition){
    if(!root?.document)return;
    const body=root.document.querySelector('#caseDebriefBody');
    if(!body)return;
    body.querySelector('#routingTransitionOutcome')?.remove();
    if(!transition?.message)return;
    body.insertAdjacentHTML('beforeend',`<div id="routingTransitionOutcome" class="micro-note" style="margin-top:8px"><b>学習routing更新：</b>${transition.message}</div>`);
  }

  function refreshTerminalUi(root,data=null,caseId=null){
    root.CaseTransitionCta?.refresh?.();
    root.WardLearningMomentum?.refresh?.(root,data,caseId);
    root.WardLearningRunProgress?.refresh?.(root,data);
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
      const beforeObjective=attached.data?.active_objective||null;
      const routed=resolveNextObjective(root,attached.data);
      const next=routed.data;
      const transition=routingTransition(beforeObjective,routed.routing);
      const nextObjective=routed.routing?.objective||next?.active_objective||null;
      const feedback=terminalFeedback(s);
      if(feedback)next.last_terminal_feedback=feedback;
      const prior=next.completion_records?.[caseId]||{};
      next.completion_records={...(next.completion_records||{}),[caseId]:{
        ...prior,
        routing_transition:transition,
        next_objective:nextObjective,
        completion_transaction:{
          version:11,
          learning_curve_attached:true,
          adaptive_practice_attached:Boolean(attached.record),
          terminal_feedback_attached:Boolean(feedback),
          next_objective_resolved:Boolean(routed.routing),
          next_objective_attached:Boolean(nextObjective),
          routing_transition_attached:Boolean(transition),
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
      return {data:next,model,scored:applied.scored||null,practice:attached.record||null,routing:routed.routing,routing_transition:transition,next_objective:nextObjective,terminal_feedback:feedback,reused:false};
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

  return {complete,currentState,load,ownsTerminalCompletion,completedRecord,terminalFeedback,resolveNextObjective,releaseTransition,routingTransition,renderRoutingTransition,refreshTerminalUi,mount,version:'1.10.0'};
});