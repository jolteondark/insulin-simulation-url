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

  function complete(root){
    try{
      const s=currentState(root);
      if(!s?.over||!s?.case?.case_id)return null;
      const debrief=root.WardCaseDebrief,tracking=root.WardAdaptivePracticeTracking;
      if(!debrief?.analyze||!debrief?.applyCompletion)throw new Error('WardCaseDebrief completion API is required');
      if(!tracking?.attachPractice||!tracking?.getCapturedSelection)throw new Error('WardAdaptivePracticeTracking transaction API is required');

      const caseId=s.case.case_id;
      const before=load(root);
      const model=debrief.analyze(before,caseId);
      const applied=debrief.applyCompletion(before,caseId,model);
      const selection=tracking.getCapturedSelection(caseId);
      const attached=tracking.attachPractice(applied.data,caseId,selection);
      const next=attached.data;
      const prior=next.completion_records?.[caseId]||{};
      next.completion_records={...(next.completion_records||{}),[caseId]:{
        ...prior,
        completion_transaction:{
          version:1,
          adaptive_practice_attached:Boolean(attached.record),
          committed_at:new Date().toISOString()
        }
      }};

      save(root,next);
      debrief.renderCompletion?.(next,caseId);
      if(attached.record)tracking.render?.(root,attached.record);
      root.LearningCurve?.render?.();
      root.CaseLearningProgress?.refresh?.();
      return {data:next,model,scored:applied.scored||null,practice:attached.record||null};
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

  return {complete,currentState,load,mount,version:'1.0.0'};
});
