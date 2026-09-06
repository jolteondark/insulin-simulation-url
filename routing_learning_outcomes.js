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
      focuses
    };
  }

  function renderHtml(summary){
    if(!summary?.ready)return '';
    const byFocus=summary.focuses?.length
      ? `<br><span>${summary.focuses.map(x=>`${x.focus_tag}: 重点${x.attempts}／解除${x.relief}${x.full_release?`（完全解除${x.full_release}）`:''}`).join(' ／ ')}</span>`
      : '';
    return `<div id="routingLearningOutcomes" class="micro-note" style="margin-top:7px"><b>反復傾向の学習成果：</b>重点症例 ${summary.targeted}回 ／ 改善で重点解除 ${summary.relief}回（通常focusへ ${summary.downgraded}、focus完全解除 ${summary.released}）。${byFocus}</div>`;
  }

  function refresh(root){
    if(!root?.document)return;
    const host=root.document.querySelector('#caseLearningProgress');
    if(!host)return;
    host.querySelector('#routingLearningOutcomes')?.remove();
    const html=renderHtml(summarize(load(root)));
    if(html)host.insertAdjacentHTML('beforeend',html);
  }

  function mount(root){
    if(!root?.document)return;
    const progress=root.CaseLearningProgress;
    if(progress?.refresh&&!progress.refresh.__routingLearningOutcomesWrapped){
      const original=progress.refresh.bind(progress);
      const wrapped=function(...args){
        const out=original(...args);
        refresh(root);
        return out;
      };
      wrapped.__routingLearningOutcomesWrapped=true;
      progress.refresh=wrapped;
    }
    refresh(root);
  }

  return {load,focusKey,summarize,renderHtml,refresh,mount,version:'1.0.0'};
});
