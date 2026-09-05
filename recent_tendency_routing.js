(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardRecentTendencyRouting=api;
    api.install(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const RECENT_CASES=3;
  const MIN_CASE_HITS=2;
  const TAG_DOMAIN={
    basal_excess:'basal',basal_deficit:'basal',
    breakfast_rapid_excess:'breakfast_rapid',breakfast_rapid_deficit:'breakfast_rapid',
    lunch_rapid_excess:'lunch_rapid',lunch_rapid_deficit:'lunch_rapid',
    dinner_rapid_excess:'dinner_rapid',dinner_rapid_deficit:'dinner_rapid',
    scale_dependence:'scale_dependence'
  };
  const TAG_LABELS={
    basal_excess:'basal過量',basal_deficit:'basal不足',
    breakfast_rapid_excess:'朝rapid過量',breakfast_rapid_deficit:'朝rapid不足',
    lunch_rapid_excess:'昼rapid過量',lunch_rapid_deficit:'昼rapid不足',
    dinner_rapid_excess:'夕rapid過量',dinner_rapid_deficit:'夕rapid不足',
    scale_dependence:'scale依存'
  };
  const PROTECTED_REASONS=new Set(['safety','persistent','longitudinal']);

  function completedCases(data){
    return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome));
  }
  function caseDays(data,caseId){return (Array.isArray(data?.days)?data.days:[]).filter(d=>d?.case_id===caseId)}
  function tagRate(data,caseId,tag){
    const xs=caseDays(data,caseId);if(!xs.length)return null;
    const hit=xs.filter(d=>Array.isArray(d?.feedback_tags)&&d.feedback_tags.includes(tag)).length;
    return hit/xs.length;
  }
  function directionalWeakness(data){
    const recent=completedCases(data).slice(-RECENT_CASES);if(recent.length<MIN_CASE_HITS)return null;
    const rows=Object.keys(TAG_DOMAIN).map(tag=>{
      const rates=recent.map((c,index)=>({case_id:c.case_id,index,rate:tagRate(data,c.case_id,tag)})).filter(x=>x.rate!=null&&x.rate>0);
      const hits=rates.length,last=rates.length?rates[rates.length-1].index:-1;
      const meanRate=hits?rates.reduce((a,x)=>a+x.rate,0)/hits:null;
      return {tag,domain_id:TAG_DOMAIN[tag],label:TAG_LABELS[tag],hits,recent_n:recent.length,last,mean_rate:meanRate,source_case_id:recent[recent.length-1]?.case_id||null};
    }).filter(x=>x.hits>=MIN_CASE_HITS).sort((a,b)=>b.hits-a.hits||b.last-a.last||(b.mean_rate??0)-(a.mean_rate??0)||a.tag.localeCompare(b.tag));
    return rows[0]||null;
  }
  function makeObjective(w){
    if(!w)return null;
    return {domain_id:w.domain_id,label:w.label,focus_tag:w.tag,focus_label:w.label,source_case_id:w.source_case_id,source_rate:w.mean_rate,created_at:new Date().toISOString(),persistent_streak:0,emphasis:'normal',selection_reason:'recent_tendency',prior_cases_with_issue:w.hits,routing_source:'recent_prescribing_tendency',tendency_recent_cases:w.recent_n,tendency_case_hits:w.hits};
  }
  function apply(data,routed){
    const out=routed&&typeof routed==='object'?{...routed}:{objective:data?.active_objective||null,reason:'existing',changed:false};
    const current=out.objective||data?.active_objective||null;
    if(current&&PROTECTED_REASONS.has(current.selection_reason))return {...out,tendency:directionalWeakness(data)};
    const tendency=directionalWeakness(data);if(!tendency)return {...out,tendency:null};
    if(current?.focus_tag===tendency.tag)return {...out,tendency};
    const objective=makeObjective(tendency);
    return {...out,objective,reason:'recent_directional_tendency',tendency,changed:JSON.stringify(current)!==JSON.stringify(objective)};
  }
  function install(root){
    const routing=root?.WardEducationRoutingState;if(!routing||routing.__recentTendencyInstalled)return false;
    const raw=routing.resolveStored;if(typeof raw!=='function')return false;
    routing.resolveStored=function(r){
      const base=raw.call(routing,r);
      try{
        const data=JSON.parse(r.localStorage.getItem(STORAGE_KEY)||'{}')||{};
        const next=apply(data,base);
        if(next.changed){const saved={...data,active_objective:next.objective};r.localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));next.data=saved}
        return next;
      }catch{return base}
    };
    routing.__recentTendencyInstalled=true;
    return true;
  }
  return {completedCases,caseDays,tagRate,directionalWeakness,makeObjective,apply,install,TAG_DOMAIN,TAG_LABELS,PROTECTED_REASONS,RECENT_CASES,MIN_CASE_HITS,version:'1.0.0'};
});
