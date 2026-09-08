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
  const EARLY_CASES=3;
  const MIN_TREND_CASES=EARLY_CASES+RECENT_CASES;
  const MIN_CASE_HITS=2;
  const ADAPTIVE_MIN_CASE_HITS=3;
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
  const RECENT_REASONS=new Set(['recent_tendency','recent_tendency_adaptive']);

  function completedCases(data){
    return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome));
  }
  function caseDays(data,caseId){return (Array.isArray(data?.days)?data.days:[]).filter(d=>d?.case_id===caseId)}
  function tagRate(data,caseId,tag){
    const xs=caseDays(data,caseId);if(!xs.length)return null;
    const hit=xs.filter(d=>Array.isArray(d?.feedback_tags)&&d.feedback_tags.includes(tag)).length;
    return hit/xs.length;
  }
  function casePresenceRate(data,cases,tag){
    if(!Array.isArray(cases)||!cases.length)return null;
    const observed=cases.map(c=>tagRate(data,c.case_id,tag)).filter(x=>x!=null);
    if(!observed.length)return null;
    return observed.filter(x=>x>0).length/observed.length;
  }
  function trendForTag(data,tag,allCases){
    const completed=Array.isArray(allCases)?allCases:completedCases(data);
    if(completed.length<MIN_TREND_CASES)return {ready:false,early_rate:null,recent_rate:null,delta:null,delta_pp:null,label:null};
    const early=completed.slice(0,EARLY_CASES),recent=completed.slice(-RECENT_CASES);
    const earlyRate=casePresenceRate(data,early,tag),recentRate=casePresenceRate(data,recent,tag);
    if(earlyRate==null||recentRate==null)return {ready:false,early_rate:earlyRate,recent_rate:recentRate,delta:null,delta_pp:null,label:null};
    const delta=recentRate-earlyRate;
    return {ready:true,early_rate:earlyRate,recent_rate:recentRate,delta,delta_pp:Math.round(delta*100),label:delta>0.05?'worsening':delta<-0.05?'improving':'stable'};
  }
  function directionalWeakness(data){
    const all=completedCases(data),recent=all.slice(-RECENT_CASES);if(recent.length<MIN_CASE_HITS)return null;
    const rows=Object.keys(TAG_DOMAIN).map(tag=>{
      const rates=recent.map((c,index)=>({case_id:c.case_id,index,rate:tagRate(data,c.case_id,tag)})).filter(x=>x.rate!=null&&x.rate>0);
      const hits=rates.length,last=rates.length?rates[rates.length-1].index:-1;
      const meanRate=hits?rates.reduce((a,x)=>a+x.rate,0)/hits:null;
      const trend=trendForTag(data,tag,all);
      return {tag,domain_id:TAG_DOMAIN[tag],label:TAG_LABELS[tag],hits,recent_n:recent.length,last,mean_rate:meanRate,source_case_id:rates.length?rates[rates.length-1].case_id:null,trend_history_ready:trend.ready,trend_early_rate:trend.early_rate,trend_recent_rate:trend.recent_rate,trend_delta:trend.delta,trend_delta_pp:trend.delta_pp,trend_label:trend.label};
    }).filter(x=>x.hits>=MIN_CASE_HITS).sort((a,b)=>b.hits-a.hits||((b.trend_history_ready?b.trend_delta:0)-(a.trend_history_ready?a.trend_delta:0))||b.last-a.last||(b.mean_rate??0)-(a.mean_rate??0)||a.tag.localeCompare(b.tag));
    return rows[0]||null;
  }
  function shouldEscalate(w){return Boolean(w&&w.recent_n>=RECENT_CASES&&w.hits>=ADAPTIVE_MIN_CASE_HITS)}
  function tendencyFields(w){
    return {source_case_id:w.source_case_id,source_rate:w.mean_rate,prior_cases_with_issue:w.hits,tendency_recent_cases:w.recent_n,tendency_case_hits:w.hits,tendency_trend_history_ready:Boolean(w.trend_history_ready),tendency_early_rate:w.trend_early_rate??null,tendency_recent_rate:w.trend_recent_rate??null,tendency_trend_delta_pp:w.trend_delta_pp??null,tendency_trend_label:w.trend_label??null};
  }
  function makeObjective(w){
    if(!w)return null;
    const adaptive=shouldEscalate(w);
    return {domain_id:w.domain_id,label:w.label,focus_tag:w.tag,focus_label:w.label,...tendencyFields(w),created_at:new Date().toISOString(),persistent_streak:0,emphasis:adaptive?'high':'normal',selection_reason:adaptive?'recent_tendency_adaptive':'recent_tendency',routing_source:'recent_prescribing_tendency',adaptive_escalated:adaptive};
  }
  function refreshObjective(current,w){
    return {...current,...tendencyFields(w)};
  }
  function apply(data,routed){
    const out=routed&&typeof routed==='object'?{...routed}:{objective:data?.active_objective||null,reason:'existing',changed:false};
    const current=out.objective||data?.active_objective||null;
    if(current&&PROTECTED_REASONS.has(current.selection_reason))return {...out,tendency:directionalWeakness(data)};
    const tendency=directionalWeakness(data);
    if(!tendency){
      if(current&&RECENT_REASONS.has(current.selection_reason))return {...out,objective:null,reason:'recent_tendency_released',tendency:null,changed:true};
      return {...out,tendency:null};
    }
    const objective=makeObjective(tendency);
    if(current?.focus_tag===objective.focus_tag&&current?.selection_reason===objective.selection_reason){
      const refreshed=refreshObjective(current,tendency);
      return {...out,objective:refreshed,tendency,changed:JSON.stringify(current)!==JSON.stringify(refreshed)};
    }
    return {...out,objective,reason:objective.selection_reason==='recent_tendency_adaptive'?'recent_directional_tendency_adaptive':'recent_directional_tendency',tendency,changed:JSON.stringify(current)!==JSON.stringify(objective)};
  }
  function applyResolvedData(data,base){
    const next=apply(base?.data||data,base);
    const finalData={...(base?.data||data||{}),active_objective:next.objective||null};
    return {...base,...next,data:finalData,changed:JSON.stringify(data?.active_objective||null)!==JSON.stringify(next.objective||null)};
  }
  function install(root){
    const routing=root?.WardEducationRoutingState;if(!routing||routing.__recentTendencyInstalled)return false;
    const rawData=routing.resolveData,rawStored=routing.resolveStored;
    if(typeof rawData!=='function'||typeof rawStored!=='function')return false;
    routing.resolveData=function(data){
      const base=rawData.call(routing,data);
      return applyResolvedData(data,base);
    };
    routing.resolveStored=function(r){
      try{
        const data=JSON.parse(r.localStorage.getItem(STORAGE_KEY)||'{}')||{};
        const next=routing.resolveData(data);
        if(next.changed)r.localStorage.setItem(STORAGE_KEY,JSON.stringify(next.data));
        return next;
      }catch{return rawStored.call(routing,r)}
    };
    routing.__recentTendencyInstalled=true;
    return true;
  }
  return {completedCases,caseDays,tagRate,casePresenceRate,trendForTag,directionalWeakness,shouldEscalate,tendencyFields,makeObjective,refreshObjective,apply,applyResolvedData,install,TAG_DOMAIN,TAG_LABELS,PROTECTED_REASONS,RECENT_REASONS,RECENT_CASES,EARLY_CASES,MIN_TREND_CASES,MIN_CASE_HITS,ADAPTIVE_MIN_CASE_HITS,version:'1.3.2'};
});