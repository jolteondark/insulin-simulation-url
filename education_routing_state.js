(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardEducationRoutingState=api;
    if(root.PatientGenerator&&typeof root.PatientGenerator.generate==='function'&&!root.PatientGenerator.__educationRoutingWrapped){
      const rawGenerate=root.PatientGenerator.generate.bind(root.PatientGenerator);
      root.PatientGenerator.generate=function(seed){
        api.resolveStored(root);
        return rawGenerate(seed);
      };
      root.PatientGenerator.__educationRoutingWrapped=true;
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const REPEATED_UNMET_N=2;
  const LONGITUDINAL_MIN_CASES=9;
  const LONGITUDINAL_RECENT_CASES=3;
  const LONGITUDINAL_MIN_RECENT_RATE=.34;
  const LONGITUDINAL_MIN_DELTA=.15;
  const FOLLOWTHROUGH_MIN_OPPORTUNITIES=2;
  const FOLLOWTHROUGH_MAX_RATE=.5;
  const EVIDENCE_SOURCE_REASONS=new Set(['recent_tendency','recent_tendency_adaptive']);
  const DOMAIN_LABELS={
    basal:'basal',
    breakfast_rapid:'朝rapid',
    lunch_rapid:'昼rapid',
    dinner_rapid:'夕rapid',
    scale_dependence:'scale依存',
    hidden_awareness:'hidden excursion'
  };
  const DOMAIN_TAGS={
    basal:['basal_excess','basal_deficit'],
    breakfast_rapid:['breakfast_rapid_excess','breakfast_rapid_deficit'],
    lunch_rapid:['lunch_rapid_excess','lunch_rapid_deficit'],
    dinner_rapid:['dinner_rapid_excess','dinner_rapid_deficit'],
    scale_dependence:['scale_dependence'],
    hidden_awareness:['hidden_low_near_miss','hidden_high_excursion']
  };
  const DOSE_KEY_DOMAIN={basal_u:'basal',breakfast_u:'breakfast_rapid',lunch_u:'lunch_rapid',dinner_u:'dinner_rapid'};
  const TAG_LABELS={
    basal_excess:'basal過量',basal_deficit:'basal不足',
    breakfast_rapid_excess:'朝rapid過量',breakfast_rapid_deficit:'朝rapid不足',
    lunch_rapid_excess:'昼rapid過量',lunch_rapid_deficit:'昼rapid不足',
    dinner_rapid_excess:'夕rapid過量',dinner_rapid_deficit:'夕rapid不足',
    scale_dependence:'scale依存',hidden_low_near_miss:'hidden低血糖',hidden_high_excursion:'hidden高血糖'
  };

  function isPersistentStreak(streak){return Math.max(0,Number(streak)||0)>=REPEATED_UNMET_N}
  function sameObjectiveDirection(x,domainId,focusTag=null){return x?.domain_id===domainId&&(!focusTag||x?.focus_tag===focusTag)}
  function objectiveFailureStreak(data,domainId,focusTag=null){
    const xs=Array.isArray(data?.objectives)?data.objectives:[];let n=0;
    for(let i=xs.length-1;i>=0;i--){const x=xs[i];if(!sameObjectiveDirection(x,domainId,focusTag)||x?.status!=='not_resolved')break;n++}
    return n;
  }
  function persistentFromObjectiveHistory(data,domainId,focusTag=null){const streak=objectiveFailureStreak(data,domainId,focusTag);return isPersistentStreak(streak)?{domain_id:domainId,label:DOMAIN_LABELS[domainId]||domainId,focus_tag:focusTag||null,focus_label:TAG_LABELS[focusTag]||null,streak}:null}
  function makePersistentObjective(input){
    const streak=Math.max(0,Number(input?.streak)||0);if(!input?.domain_id||!isPersistentStreak(streak))return null;
    return {domain_id:input.domain_id,label:input.label||DOMAIN_LABELS[input.domain_id]||input.domain_id,focus_tag:input.focus_tag||null,focus_label:input.focus_label||TAG_LABELS[input.focus_tag]||null,source_case_id:input.source_case_id||null,source_rate:Number.isFinite(Number(input.source_rate))?Number(input.source_rate):null,created_at:input.created_at||new Date().toISOString(),persistent_streak:streak,emphasis:'high',selection_reason:'persistent',prior_cases_with_issue:streak,routing_source:input.routing_source||'objective_history'};
  }
  function scoredPracticeRows(data){return (Array.isArray(data?.cases)?data.cases:[]).map((c,index)=>({case_id:c.case_id,index,...(c.adaptive_practice||{})})).filter(x=>x.domain_id&&x.practice_opportunity&&x.practice_opportunity!=='standard_case'&&['resolved','improved','not_resolved'].includes(x.objective_status))}
  function trailingUnresolved(xs){let n=0;for(let i=xs.length-1;i>=0;i--){if(xs[i].objective_status!=='not_resolved')break;n++}return n}
  function repeatedUnmet(data){
    const rows=scoredPracticeRows(data),keys=[...new Set(rows.map(x=>`${x.domain_id}::${x.focus_tag||''}`))];
    return keys.map(key=>{const [domainId,focusTagRaw]=key.split('::'),focusTag=focusTagRaw||null,xs=rows.filter(x=>x.domain_id===domainId&&(x.focus_tag||null)===focusTag),streak=trailingUnresolved(xs),last=xs[xs.length-1]||null;return {domain_id:domainId,label:DOMAIN_LABELS[domainId]||domainId,focus_tag:focusTag,focus_label:TAG_LABELS[focusTag]||null,streak,last}}).filter(x=>isPersistentStreak(x.streak)).sort((a,b)=>b.streak-a.streak||(b.last?.index??-1)-(a.last?.index??-1)||(a.focus_label||a.label).localeCompare(b.focus_label||b.label,'ja'));
  }
  function practiceLifecycle(selection,scored){
    const before=Math.max(0,Number(selection?.persistent_streak)||0),status=scored?.status||null;
    if(!isPersistentStreak(before))return {state:'not_persistent',persistent_before:before,persistent_after:before,released:false,continued:false};
    if(status==='resolved'||status==='improved')return {state:'released',persistent_before:before,persistent_after:0,released:true,continued:false};
    if(status==='not_resolved')return {state:'continued',persistent_before:before,persistent_after:before+1,released:false,continued:true};
    return {state:'active',persistent_before:before,persistent_after:before,released:false,continued:false};
  }
  function isSafetyObjective(objective){return objective?.selection_reason==='safety'||objective?.domain_id==='hidden_awareness'&&objective?.emphasis==='high'}
  function completionObjectiveRelief(data,current){
    if(!current?.source_case_id||!current?.domain_id||isSafetyObjective(current)||EVIDENCE_SOURCE_REASONS.has(current?.selection_reason))return null;
    const scored=data?.completion_records?.[current.source_case_id]?.scored||null;
    if(!scored||!['resolved','improved'].includes(scored.status))return null;
    if(!sameObjectiveDirection(scored,current.domain_id,current.focus_tag||null))return null;
    return scored;
  }
  function completedCases(data){return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome))}
  function latestPersistentPracticeRelease(data,current){
    if(current?.selection_reason!=='persistent'||!current?.domain_id)return null;
    const rows=scoredPracticeRows(data).filter(x=>x.domain_id===current.domain_id&&(!current.focus_tag||x.focus_tag===current.focus_tag)&&['resolved','improved'].includes(x.objective_status));
    if(!rows.length)return null;
    const sourceIndex=(Array.isArray(data?.cases)?data.cases:[]).findIndex(c=>c?.case_id===current.source_case_id);
    const eligible=sourceIndex>=0?rows.filter(x=>x.index>sourceIndex):rows;
    return eligible.length?eligible[eligible.length-1]:null;
  }
  function latestLongitudinalRelease(data,domainId){
    const xs=Array.isArray(data?.objectives)?data.objectives:[];
    for(let i=xs.length-1;i>=0;i--){const x=xs[i];if(x?.domain_id===domainId&&x?.selection_reason==='longitudinal'&&['resolved','improved'].includes(x?.status)&&x?.target_case_id)return x}
    return null;
  }
  function activeLongitudinalRelease(data,domainId,casesArg){
    const release=latestLongitudinalRelease(data,domainId);if(!release)return null;
    const cases=Array.isArray(casesArg)?casesArg:completedCases(data),idx=cases.findIndex(c=>c.case_id===release.target_case_id);if(idx<0)return null;
    return idx>=cases.length-LONGITUDINAL_RECENT_CASES?release:null;
  }
  function latestAdaptivePracticeRelease(data,domainId){
    const rows=scoredPracticeRows(data).filter(x=>x.domain_id===domainId&&['resolved','improved'].includes(x.objective_status));
    return rows.length?rows[rows.length-1]:null;
  }
  function activeAdaptivePracticeRelease(data,domainId,casesArg){
    const release=latestAdaptivePracticeRelease(data,domainId);if(!release)return null;
    const cases=Array.isArray(casesArg)?casesArg:completedCases(data),idx=cases.findIndex(c=>c.case_id===release.case_id);if(idx<0)return null;
    return idx>=cases.length-LONGITUDINAL_RECENT_CASES?release:null;
  }
  function activeRecentRelease(data,domainId,casesArg){return activeAdaptivePracticeRelease(data,domainId,casesArg)||activeLongitudinalRelease(data,domainId,casesArg)}
  function caseIssueRate(data,caseIds,domainId){
    const tags=DOMAIN_TAGS[domainId]||[],days=Array.isArray(data?.days)?data.days:[];if(!caseIds.length)return null;
    let issue=0;
    for(const id of caseIds){const hit=days.some(d=>d?.case_id===id&&(Array.isArray(d.feedback_tags)?d.feedback_tags:[]).some(t=>tags.includes(t)));if(hit)issue++}
    return issue/caseIds.length;
  }
  function followthroughWeakness(data){
    const cases=completedCases(data),recent=cases.slice(-LONGITUDINAL_RECENT_CASES);if(!recent.length)return null;
    const rows=new Map();
    recent.forEach((c,caseIndex)=>{
      const actions=data?.completion_records?.[c.case_id]?.case_learning_trace?.feedback_followthrough?.actions;
      if(!Array.isArray(actions))return;
      actions.forEach((a,actionIndex)=>{
        const domainId=DOSE_KEY_DOMAIN[a?.dose_key],status=a?.status;
        if(!domainId||!['followed','unchanged','opposite'].includes(status))return;
        let row=rows.get(domainId);
        if(!row){row={domain_id:domainId,label:DOMAIN_LABELS[domainId]||domainId,opportunities:0,followed:0,unchanged:0,opposite:0,last_case_index:-1,last_action_index:-1,source_case_id:null,tag_rows:new Map()};rows.set(domainId,row)}
        row.opportunities++;row[status]++;
        if(caseIndex>row.last_case_index||caseIndex===row.last_case_index&&actionIndex>row.last_action_index){row.last_case_index=caseIndex;row.last_action_index=actionIndex;row.source_case_id=c.case_id}
        if(status!=='followed'&&typeof a?.feedback_tag==='string'){
          const tr=row.tag_rows.get(a.feedback_tag)||{tag:a.feedback_tag,count:0,last_case_index:-1,last_action_index:-1};tr.count++;
          if(caseIndex>tr.last_case_index||caseIndex===tr.last_case_index&&actionIndex>tr.last_action_index){tr.last_case_index=caseIndex;tr.last_action_index=actionIndex}row.tag_rows.set(a.feedback_tag,tr);
        }
      });
    });
    const candidates=[...rows.values()].map(row=>{
      const rate=row.opportunities?row.followed/row.opportunities:null,failureRate=row.opportunities?(row.unchanged+row.opposite)/row.opportunities:null;
      const tags=[...row.tag_rows.values()].sort((a,b)=>b.count-a.count||b.last_case_index-a.last_case_index||b.last_action_index-a.last_action_index||a.tag.localeCompare(b.tag));
      return {...row,tag_rows:undefined,followthrough_rate:rate,recent_rate:failureRate,reference_rate:null,delta:null,focus_tag:tags[0]?.tag||null,focus_label:TAG_LABELS[tags[0]?.tag]||null,prior_cases_with_issue:row.unchanged+row.opposite,evidence_type:'followthrough'};
    }).filter(x=>x.opportunities>=FOLLOWTHROUGH_MIN_OPPORTUNITIES&&x.followthrough_rate<=FOLLOWTHROUGH_MAX_RATE&&!activeRecentRelease(data,x.domain_id,cases)).sort((a,b)=>a.followthrough_rate-b.followthrough_rate||b.opposite-a.opposite||b.unchanged-a.unchanged||b.opportunities-a.opportunities||b.last_case_index-a.last_case_index||a.label.localeCompare(b.label,'ja'));
    return candidates[0]||null;
  }
  function recurringFeedbackWeakness(data){
    const cases=completedCases(data);
    if(cases.length<LONGITUDINAL_MIN_CASES)return null;
    const recent=cases.slice(-LONGITUDINAL_RECENT_CASES),reference=cases.slice(0,-LONGITUDINAL_RECENT_CASES);if(!reference.length)return null;
    const recentIds=recent.map(c=>c.case_id),referenceIds=reference.map(c=>c.case_id),lastCase=recent[recent.length-1]?.case_id||null;
    const rows=Object.keys(DOMAIN_TAGS).filter(id=>id!=='hidden_awareness'&&!activeRecentRelease(data,id,cases)).map(domainId=>{
      const recentRate=caseIssueRate(data,recentIds,domainId),referenceRate=caseIssueRate(data,referenceIds,domainId),delta=(recentRate??0)-(referenceRate??0);
      return {domain_id:domainId,label:DOMAIN_LABELS[domainId]||domainId,recent_rate:recentRate,reference_rate:referenceRate,delta,source_case_id:lastCase,prior_cases_with_issue:Math.round((referenceRate||0)*referenceIds.length),evidence_type:'recurring_feedback'};
    }).filter(x=>x.recent_rate>=LONGITUDINAL_MIN_RECENT_RATE&&x.delta>=LONGITUDINAL_MIN_DELTA).sort((a,b)=>b.recent_rate-a.recent_rate||b.delta-a.delta||a.label.localeCompare(b.label,'ja'));
    return rows[0]||null;
  }
  function longitudinalWeakness(data){return followthroughWeakness(data)||recurringFeedbackWeakness(data)}
  function makeLongitudinalObjective(w){
    if(!w)return null;
    return {domain_id:w.domain_id,label:w.label,focus_tag:w.focus_tag||null,focus_label:w.focus_label||null,source_case_id:w.source_case_id,source_rate:w.recent_rate,created_at:new Date().toISOString(),persistent_streak:0,emphasis:'normal',selection_reason:'longitudinal',prior_cases_with_issue:w.prior_cases_with_issue,routing_source:w.evidence_type==='followthrough'?'followthrough_learning':'longitudinal_learning',longitudinal_reference_rate:w.reference_rate,longitudinal_recent_rate:w.recent_rate,longitudinal_delta:w.delta,followthrough_opportunities:Number.isFinite(Number(w.opportunities))?Number(w.opportunities):null,followthrough_rate:Number.isFinite(Number(w.followthrough_rate))?Number(w.followthrough_rate):null,followthrough_unchanged:Number.isFinite(Number(w.unchanged))?Number(w.unchanged):null,followthrough_opposite:Number.isFinite(Number(w.opposite))?Number(w.opposite):null};
  }
  function routedObjective(data){
    let current=data?.active_objective||null;
    if(isSafetyObjective(current))return {objective:current,reason:'safety_preserved',repeated:repeatedUnmet(data),longitudinal:longitudinalWeakness(data),release:null};
    const completionRelease=completionObjectiveRelief(data,current);
    if(completionRelease)current=null;
    const repeated=repeatedUnmet(data),top=repeated[0]||null;
    if(top){const last=top.last||{},sourceRate=Number.isFinite(Number(last.target_rate))?Number(last.target_rate):Number.isFinite(Number(current?.source_rate))?Number(current.source_rate):null;const objective=makePersistentObjective({domain_id:top.domain_id,label:top.label,focus_tag:top.focus_tag,focus_label:top.focus_label,source_case_id:last.case_id||current?.source_case_id||null,source_rate:sourceRate,streak:top.streak,routing_source:'adaptive_practice'});return {objective,reason:'repeated_unmet',repeated,longitudinal:longitudinalWeakness(data),release:completionRelease}}
    const persistentRelease=latestPersistentPracticeRelease(data,current);
    const releasedPersistent=Boolean(persistentRelease&&current?.selection_reason==='persistent');
    if(releasedPersistent)current=null;
    const longitudinalRelease=current?.domain_id?activeLongitudinalRelease(data,current.domain_id):null;
    const releasedLongitudinal=Boolean(longitudinalRelease&&current?.selection_reason==='longitudinal'&&longitudinalRelease?.domain_id===current?.domain_id);
    if(releasedLongitudinal)current=null;
    const release=completionRelease||persistentRelease||longitudinalRelease||null;
    const longitudinal=longitudinalWeakness(data);
    if(current?.selection_reason==='longitudinal')return {objective:current,reason:'longitudinal_preserved',repeated,longitudinal,release};
    if(longitudinal&&current?.selection_reason!=='persistent')return {objective:makeLongitudinalObjective(longitudinal),reason:'longitudinal_weakness',repeated,longitudinal,release};
    const reason=completionRelease?'objective_released':releasedPersistent?'persistent_released':releasedLongitudinal?'longitudinal_released':'existing';
    return {objective:current,reason,repeated,longitudinal,release};
  }
  function resolveData(data){const base={...(data||{}),cases:Array.isArray(data?.cases)?data.cases:[]};const routed=routedObjective(base),before=base.active_objective||null,changed=JSON.stringify(before)!==JSON.stringify(routed.objective);return {data:{...base,active_objective:routed.objective},objective:routed.objective,reason:routed.reason,repeated:routed.repeated,longitudinal:routed.longitudinal,release:routed.release,changed}}
  function resolveStored(root){try{const raw=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}'),out=resolveData(raw);if(out.changed)root.localStorage.setItem(STORAGE_KEY,JSON.stringify(out.data));return out}catch{return {data:null,objective:null,reason:'storage_error',repeated:[],longitudinal:null,release:null,changed:false}}}
  return {scoredPracticeRows,trailingUnresolved,repeatedUnmet,practiceLifecycle,isPersistentStreak,objectiveFailureStreak,persistentFromObjectiveHistory,makePersistentObjective,isSafetyObjective,completionObjectiveRelief,completedCases,latestPersistentPracticeRelease,latestLongitudinalRelease,activeLongitudinalRelease,latestAdaptivePracticeRelease,activeAdaptivePracticeRelease,activeRecentRelease,caseIssueRate,followthroughWeakness,recurringFeedbackWeakness,longitudinalWeakness,makeLongitudinalObjective,routedObjective,resolveData,resolveStored,REPEATED_UNMET_N,LONGITUDINAL_MIN_CASES,LONGITUDINAL_RECENT_CASES,LONGITUDINAL_MIN_RECENT_RATE,LONGITUDINAL_MIN_DELTA,FOLLOWTHROUGH_MIN_OPPORTUNITIES,FOLLOWTHROUGH_MAX_RATE,EVIDENCE_SOURCE_REASONS,DOMAIN_LABELS,DOMAIN_TAGS,DOSE_KEY_DOMAIN,TAG_LABELS,version:'1.11.0'};
});
