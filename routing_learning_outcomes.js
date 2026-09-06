(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardRoutingLearningOutcomes=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';

  function load(root){
    try{
      const x=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      return {...x,cases:Array.isArray(x.cases)?x.cases:[],completion_records:x.completion_records&&typeof x.completion_records==='object'?x.completion_records:{}};
    }catch{return {cases:[],completion_records:{}}}
  }

  function focusKey(x){return x?.focus_tag||x?.domain_id||'unknown'}

  function summarize(data){
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const targeted=cases
      .map(c=>({case_id:c.case_id,...(c.adaptive_practice||{})}))
      .filter(x=>x.selection_reason==='recent_tendency_adaptive');
    const transitions=Object.values(data?.completion_records||{})
      .map(x=>x?.routing_transition)
      .filter(Boolean)
      .filter(x=>x.kind==='recent_tendency_downgraded'||x.kind==='recent_tendency_released');
    const downgraded=transitions.filter(x=>x.kind==='recent_tendency_downgraded').length;
    const released=transitions.filter(x=>x.kind==='recent_tendency_released').length;
    const keys=[...new Set([...targeted.map(focusKey),...transitions.map(focusKey)].filter(x=>x&&x!=='unknown'))];
    const focuses=keys.map(key=>{
      const attempts=targeted.filter(x=>focusKey(x)===key).length;
      const relief=transitions.filter(x=>focusKey(x)===key).length;
      const full_release=transitions.filter(x=>focusKey(x)===key&&x.kind==='recent_tendency_released').length;
      return {focus_tag:key,attempts,relief,full_release};
    }).sort((a,b)=>b.attempts-a.attempts||b.relief-a.relief||a.focus_tag.localeCompare(b.focus_tag));
    return {
      ready:targeted.length>0||transitions.length>0,
      targeted:targeted.length,
      relief:downgraded+released,
      downgraded,
      released,
      unresolved:Math.max(0,targeted.length-(downgraded+released)),
      focuses
    };
  }

  function renderHtml(summary,options={}){
    if(!summary?.ready)return '';
    const id=options.id||'routingLearningOutcomes';
    const title=options.title||'反復傾向の学習成果';
    const byFocus=summary.focuses?.length
      ? `<br><span>${summary.focuses.map(x=>`${x.focus_tag}: 重点${x.attempts}／解除${x.relief}${x.full_release?`（完全解除${x.full_release}）`:''}`).join(' ／ ')}</span>`
      : '';
    return `<div id="${id}" class="micro-note" style="margin-top:7px"><b>${title}：</b>重点症例 ${summary.targeted}回 ／ 改善で重点解除 ${summary.relief}回（通常focusへ ${summary.downgraded}、focus完全解除 ${summary.released}）${summary.unresolved?` ／ 未解除 ${summary.unresolved}回`:''}。${byFocus}</div>`;
  }

  function renderFinalHtml(summary){
    return renderHtml(summary,{id:'finalRoutingLearningOutcomes',title:'重点学習の到達点'});
  }

  function refresh(root){
    if(!root?.document)return;
    const summary=summarize(load(root));
    const progress=root.document.querySelector('#caseLearningProgress');
    if(progress){
      progress.querySelector('#routingLearningOutcomes')?.remove();
      const html=renderHtml(summary);
      if(html)progress.insertAdjacentHTML('beforeend',html);
    }
    const finalBody=root.document.querySelector('#finalLearningDebriefBody');
    if(finalBody){
      finalBody.querySelector('#finalRoutingLearningOutcomes')?.remove();
      const html=renderFinalHtml(summary);
      if(html)finalBody.insertAdjacentHTML('beforeend',html);
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
    refresh(root);
  }

  return {load,focusKey,summarize,renderHtml,renderFinalHtml,refresh,mount,version:'1.1.0'};
});
