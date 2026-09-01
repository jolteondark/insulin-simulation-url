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

  function refreshTerminalUi(root){
    root.CaseTransitionCta?.refresh?.();
  }

  function renderCommitted(root,data,caseId){
    const debrief=root.WardCaseDebrief,tracking=root.WardAdaptivePracticeTracking,learning=root.LearningCurve;
    debrief?.renderCompletion?.(data,caseId);
    const practice=data?.cases?.find?.(c=>c.case_id===caseId)?.adaptive_practice||null;
    if(practice)tracking?.render?.(root,practice);
    learning?.render?.();
    root.CaseLearningProgress?.refresh?.();
    refreshTerminalUi(root);
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
        return {data:before,model:null,scored:priorCommitted.scored||null,practice,reused:true};
      }

      const withBase=learning.applyLatest(before,s);
      const model=debrief.analyze(withBase,caseId);
      const applied=debrief.applyCompletion(withBase,caseId,model);
      const selection=tracking.getCapturedSelection(caseId);
      const attached=tracking.attachPractice(applied.data,caseId,selection);
      const next=attached.data;
      const feedback=terminalFeedback(s);
      if(feedback)next.last_terminal_feedback=feedback;
      const prior=next.completion_records?.[caseId]||{};
      next.completion_records={...(next.completion_records||{}),[caseId]:{
        ...prior,
        completion_transaction:{
          version:5,
          learning_curve_attached:true,
          adaptive_practice_attached:Boolean(attached.record),
          terminal_feedback_attached:Boolean(feedback),
          write_count:1,
          committed_at:new Date().toISOString()
        }
      }};

      save(root,next);
      debrief.renderCompletion?.(next,caseId);
      if(attached.record)tracking.render?.(root,attached.record);
      learning.render?.();
      root.CaseLearningProgress?.refresh?.();
      refreshTerminalUi(root);
      return {data:next,model,scored:applied.scored||null,practice:attached.record||null,terminal_feedback:feedback,reused:false};
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

  return {complete,currentState,load,ownsTerminalCompletion,completedRecord,terminalFeedback,refreshTerminalUi,mount,version:'1.4.0'};
});