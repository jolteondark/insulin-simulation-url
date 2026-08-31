(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardAdaptivePracticeTracking=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
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

  function capture(root){
    try{
      const s=currentState(root);
      if(!s?.case?.case_id||!root.PatientGenerator?.generate)return null;
      const caseId=s.case.case_id;
      const bundle=root.PatientGenerator.generate(s.seed);
      if(bundle?.case?.case_id!==caseId)return null;
      const selection=clone(bundle.adaptive_selection);
      captured.set(caseId,selection);
      return selection;
    }catch{return null}
  }

  function scoredObjective(data,caseId,domainId){
    const xs=(data.objectives||[]).filter(x=>x?.target_case_id===caseId);
    if(domainId){
      const same=xs.filter(x=>x?.domain_id===domainId);
      if(same.length)return same[same.length-1];
    }
    return xs.length?xs[xs.length-1]:null;
  }

  function practiceRecord(selection,scored){
    if(!selection)return null;
    return {
      domain_id:selection.domain_id||null,
      persistent_streak:Number(selection.persistent_streak)||0,
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
      recorded_at:new Date().toISOString()
    };
  }

  function persist(root){
    try{
      const s=currentState(root);
      if(!s?.over)return null;
      const caseId=s.case?.case_id;
      if(!caseId)return null;
      const selection=captured.has(caseId)?captured.get(caseId):null;
      if(!selection)return null;
      const data=load(root);
      const idx=data.cases.findIndex(c=>c.case_id===caseId);
      if(idx<0)return null;
      const scored=scoredObjective(data,caseId,selection.domain_id);
      const record=practiceRecord(selection,scored);
      data.cases[idx]={...data.cases[idx],adaptive_practice:record};
      save(root,data);
      render(root,record);
      root.CaseLearningProgress?.refresh?.();
      return record;
    }catch{return null}
  }

  function statusLabel(x){return x==='resolved'?'達成':x==='improved'?'改善':x==='not_resolved'?'未達':'評価待ち'}
  function domainLabel(id){return ({basal:'basal',breakfast_rapid:'朝rapid',lunch_rapid:'昼rapid',dinner_rapid:'夕rapid',scale_dependence:'scale依存',hidden_awareness:'hidden excursion'})[id]||id||'重点領域'}
  function pct(x){return Number.isFinite(Number(x))?`${Math.round(100*Number(x))}%`:'—'}

  function render(root,record){
    if(!record||!root.document)return;
    const body=root.document.querySelector('#caseDebriefBody');
    if(!body)return;
    body.querySelector('#adaptivePracticeOutcome')?.remove();
    const aligned=record.practice_opportunity==='domain_aligned'?'通常generator候補から重点領域を練習しやすい症例を選択':record.practice_opportunity==='standard_case'?'drift guardにより標準症例を維持':'安全範囲内の候補を使用';
    const score=record.objective_status?`${pct(record.source_rate)} → ${pct(record.target_rate)}（${statusLabel(record.objective_status)}）`:'症例目標の採点記録を待機';
    body.insertAdjacentHTML('beforeend',`<div id="adaptivePracticeOutcome" class="micro-note" style="margin-top:8px"><b>重点練習の追跡：</b>${domainLabel(record.domain_id)} ／ ${aligned}<br><b>結果：</b>${score}</div>`);
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

  return {practiceRecord,scoredObjective,statusLabel,domainLabel,currentState,mount,version:'1.0.2'};
});
