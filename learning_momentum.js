(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.WardLearningMomentum=api;api.mount(root)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const TAG_LABELS={
    basal_excess:'basal過量',basal_deficit:'basal不足',
    breakfast_rapid_excess:'朝rapid過量',breakfast_rapid_deficit:'朝rapid不足',
    lunch_rapid_excess:'昼rapid過量',lunch_rapid_deficit:'昼rapid不足',
    dinner_rapid_excess:'夕rapid過量',dinner_rapid_deficit:'夕rapid不足',
    scale_dependence:'scale依存',hidden_low_near_miss:'hidden低血糖',hidden_high_excursion:'hidden高血糖'
  };
  function label(x){return x?.focus_label||TAG_LABELS[x?.focus_tag]||x?.label||x?.domain_id||'学習目標'}
  function statusFromRecord(data,caseId){
    const rec=data?.completion_records?.[caseId]||null;if(!rec)return null;
    const scored=rec.scored||null,next=rec.active_objective||data?.active_objective||null;
    if(scored?.status==='resolved'){
      const nextText=next&&next.source_case_id===caseId?` → 次は「${label(next)}」` : '';
      return {tone:'clear',kicker:'FOCUS CLEAR',title:`「${label(scored)}」を解除`,body:`同じ方向の問題はこの症例で消えました${nextText}。`,icon:'✓'};
    }
    if(scored?.status==='improved')return {tone:'improved',kicker:'NICE ADJUST',title:`「${label(scored)}」が改善`,body:'処方→結果→修正の方向が合っています。次症例でも再現できるか確認します。',icon:'↗'};
    if(scored?.status==='not_resolved')return {tone:'continue',kicker:'KEEP GOING',title:`「${label(scored)}」を重点継続`,body:'失敗扱いで終わらせず、次症例で同じ1方向をもう一度練習します。',icon:'→'};
    if(next&&next.source_case_id===caseId)return {tone:'next',kicker:'NEXT TARGET',title:`次は「${label(next)}」`,body:'今回の結果から、次症例で見る1点を設定しました。',icon:'◎'};
    return null;
  }
  function ensurePanel(root){
    const doc=root?.document;if(!doc)return null;let el=doc.querySelector('#learningMomentum');if(el)return el;
    const debrief=doc.querySelector('#caseDebrief'),result=doc.querySelector('#resultPanel');const anchor=debrief||result;if(!anchor)return null;
    el=doc.createElement('section');el.id='learningMomentum';el.className='learning-momentum hidden';anchor.parentNode.insertBefore(el,anchor.nextSibling);return el;
  }
  function render(root,data,caseId){
    const el=ensurePanel(root);if(!el)return null;const model=statusFromRecord(data,caseId);
    if(!model){el.className='learning-momentum hidden';el.innerHTML='';return null}
    el.className=`learning-momentum ${model.tone}`;
    el.innerHTML=`<div class="momentum-icon">${model.icon}</div><div class="momentum-copy"><div class="momentum-kicker">${model.kicker}</div><div class="momentum-title">${model.title}</div><div class="momentum-body">${model.body}</div></div>`;
    return model;
  }
  function load(root){try{return JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function latestCompletedCaseId(data){const xs=Array.isArray(data?.cases)?data.cases.filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome)):[];return xs.length?xs[xs.length-1].case_id:null}
  function refresh(root,dataArg,caseIdArg){const data=dataArg||load(root),caseId=caseIdArg||latestCompletedCaseId(data);return caseId?render(root,data,caseId):null}
  function mount(root){if(!root?.document)return;setTimeout(()=>refresh(root),0)}
  return {label,statusFromRecord,render,refresh,latestCompletedCaseId,mount,version:'1.0.0'};
});
