(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardMasteryAwareRouting=api;
    api.install(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const RELEASE_KEY='followthrough_objective_release';
  const MASTERY_ACTION_STATUSES=new Set(['followed','changed']);
  const RELEARNING_PREFIX='再学習：';
  const RETENTION_CASES=3;
  const CURRICULUM_RECENT_CASES=4;
  const CURRICULUM_MIN_SIGNAL_CASES=2;

  function completed(caseRow){return caseRow?.case_id&&['discharged','game_over'].includes(caseRow.outcome)}
  function caseIndexMap(data){return new Map((Array.isArray(data?.cases)?data.cases:[]).map((c,i)=>[c?.case_id,i]))}
  function focusOf(x){return x?.focus_tag||x?.domain_id||null}
  function masteryEvents(data){
    const index=caseIndexMap(data);
    return Object.entries(data?.completion_records||{}).map(([caseId,record])=>{
      const x=record?.[RELEASE_KEY]||{};
      const focus=focusOf(x);
      if(!MASTERY_ACTION_STATUSES.has(x.action_status)||!focus)return null;
      const episode=Math.max(1,Number(x.mastery_episode)||1);
      return {
        case_id:caseId,
        case_index:index.has(caseId)?index.get(caseId):-1,
        focus_tag:focus,
        domain_id:x.domain_id||null,
        action_status:x.action_status,
        mastery_episode:episode,
        reacquired:x.reacquired===true||episode>1
      };
    }).filter(Boolean);
  }
  function latestMasteryByFocus(data){
    const out=new Map();
    for(const event of masteryEvents(data)){
      const prev=out.get(event.focus_tag);
      if(!prev||event.case_index>prev.case_index||event.case_index===prev.case_index&&event.mastery_episode>prev.mastery_episode)out.set(event.focus_tag,event);
    }
    return out;
  }
  function rowEvidenceIndex(row,index){
    const ids=[row?.target_case_id,row?.source_case_id,row?.case_id];
    let best=-1;
    for(const id of ids)if(index.has(id))best=Math.max(best,index.get(id));
    return best;
  }
  function eligibleAfterMastery(row,mastery,index){return Boolean(mastery&&rowEvidenceIndex(row,index)>mastery.case_index)}
  function completedAfterMastery(data,mastery){
    if(!mastery)return 0;
    const cases=Array.isArray(data?.cases)?data.cases:[];
    return cases.slice(Math.max(0,mastery.case_index+1)).filter(completed).length;
  }
  function stableMasteryState(data,mastery){
    const subsequent=completedAfterMastery(data,mastery);
    return subsequent>=RETENTION_CASES?'retained':subsequent>0?'maintaining':'newly_mastered';
  }
  function staleMasteredBase(data,base,mastered,index){
    const objective=base?.objective||data?.active_objective||null;
    const focus=focusOf(objective),event=focus?mastered.get(focus):null;
    if(!objective||!event||objective?.selection_reason==='safety')return null;
    if(eligibleAfterMastery(objective,event,index))return null;
    return {objective,focus_tag:focus,domain_id:objective.domain_id||event.domain_id||null,mastery_event:event,mastery_state:stableMasteryState(data,event),subsequent_cases:completedAfterMastery(data,event)};
  }
  function candidateFromBase(data,base,mastered,index){
    const objective=base?.objective||null,focus=focusOf(objective),event=focus?mastered.get(focus):null;
    if(!objective||!event||objective?.selection_reason==='safety')return null;
    if(!eligibleAfterMastery(objective,event,index))return null;
    return {objective,evidence_index:rowEvidenceIndex(objective,index),focus_tag:focus,domain_id:objective.domain_id||event.domain_id||null,source:'existing_route',mastery_event:event};
  }
  function recurrenceCandidates(data,base,routingApi){
    const cases=Array.isArray(data?.cases)?data.cases:[],index=caseIndexMap(data),mastered=latestMasteryByFocus(data),rows=[];
    if(!mastered.size)return rows;
    const baseCandidate=candidateFromBase(data,base,mastered,index);if(baseCandidate)rows.push(baseCandidate);
    for(const c of cases){
      if(!completed(c))continue;
      const p=c?.adaptive_practice||{},focus=focusOf(p),event=focus?mastered.get(focus):null;
      if(!event||p.objective_status!=='not_resolved'||!eligibleAfterMastery({...p,case_id:c.case_id},event,index))continue;
      rows.push({
        objective:{domain_id:p.domain_id||event.domain_id||null,label:routingApi?.DOMAIN_LABELS?.[p.domain_id]||p.domain_id||'重点',focus_tag:p.focus_tag||null,focus_label:routingApi?.TAG_LABELS?.[p.focus_tag]||null,source_case_id:c.case_id,created_at:new Date().toISOString(),persistent_streak:Number(p.persistent_after||p.persistent_streak||0),emphasis:'high',selection_reason:'longitudinal',prior_cases_with_issue:Number(p.persistent_after||p.persistent_streak||1),routing_source:'mastery_recurrence'},
        evidence_index:index.get(c.case_id)??-1,focus_tag:focus,domain_id:p.domain_id||event.domain_id||null,source:'adaptive_practice',mastery_event:event
      });
    }
    for(const x of Array.isArray(data?.objectives)?data.objectives:[]){
      const focus=focusOf(x),event=focus?mastered.get(focus):null;
      if(!event||x?.status!=='not_resolved'||!eligibleAfterMastery(x,event,index))continue;
      rows.push({
        objective:{...x,emphasis:'high',selection_reason:x.selection_reason==='persistent'?'persistent':'longitudinal',prior_routing_source:x.routing_source||x.selection_reason||'objective_history',routing_source:'mastery_recurrence'},
        evidence_index:rowEvidenceIndex(x,index),focus_tag:focus,domain_id:x.domain_id||event.domain_id||null,source:'objective_history',mastery_event:event
      });
    }
    return rows.sort((a,b)=>b.evidence_index-a.evidence_index||String(a.focus_tag).localeCompare(String(b.focus_tag)));
  }
  function relearningLabel(objective){
    const base=objective?.focus_label||objective?.label||null;
    if(!base)return null;
    return String(base).startsWith(RELEARNING_PREFIX)?String(base):`${RELEARNING_PREFIX}${base}`;
  }
  function markReappeared(candidate){
    if(!candidate?.objective)return null;
    const objective={...candidate.objective};
    const mastery=candidate.mastery_event||null;
    if(objective.routing_source!=='mastery_recurrence')objective.prior_routing_source=objective.routing_source||objective.selection_reason||candidate.source||null;
    objective.routing_source='mastery_recurrence';
    objective.mastery_state='reappeared';
    objective.mastery_priority=true;
    objective.relearning_episode=true;
    objective.previous_mastery_case_id=mastery?.case_id||null;
    objective.previous_mastery_episode=Math.max(1,Number(mastery?.mastery_episode)||1);
    objective.mastery_episode_target=objective.previous_mastery_episode+1;
    const relabel=relearningLabel(objective);
    if(relabel)objective.focus_label=relabel;
    objective.emphasis='high';
    if(!['persistent','longitudinal'].includes(objective.selection_reason))objective.selection_reason='longitudinal';
    return objective;
  }
  function suppressStaleMasteredBase(data,base,stale){
    if(!stale)return null;
    const before=base?.objective||data?.active_objective||null;
    const finalData={...(base?.data||data||{}),active_objective:null};
    return {...base,data:finalData,objective:null,reason:'mastery_stable_suppressed',mastery_recurrence:null,mastery_suppression:{focus_tag:stale.focus_tag,domain_id:stale.domain_id,state:stale.mastery_state,subsequent_cases:stale.subsequent_cases,mastered_case_id:stale.mastery_event?.case_id||null,mastery_episode:Math.max(1,Number(stale.mastery_event?.mastery_episode)||1)},changed:Boolean(before)};
  }
  function persistentObjectiveFromRow(row,routingApi){
    if(!row?.domain_id)return null;
    const last=row.last||{};
    const input={domain_id:row.domain_id,label:row.label||routingApi?.DOMAIN_LABELS?.[row.domain_id]||row.domain_id,focus_tag:row.focus_tag||null,focus_label:row.focus_label||routingApi?.TAG_LABELS?.[row.focus_tag]||null,source_case_id:last.case_id||null,source_rate:Number.isFinite(Number(last.target_rate))?Number(last.target_rate):null,streak:Number(row.streak)||0,routing_source:'objective_history'};
    if(typeof routingApi?.makePersistentObjective==='function')return routingApi.makePersistentObjective(input);
    if(input.streak<2)return null;
    return {...input,created_at:new Date().toISOString(),persistent_streak:input.streak,emphasis:'high',selection_reason:'persistent',prior_cases_with_issue:input.streak};
  }
  function longitudinalObjectiveFromRow(row,routingApi){
    if(!row?.domain_id)return null;
    if(typeof routingApi?.makeLongitudinalObjective==='function')return routingApi.makeLongitudinalObjective(row);
    return {domain_id:row.domain_id,label:row.label||routingApi?.DOMAIN_LABELS?.[row.domain_id]||row.domain_id,focus_tag:row.focus_tag||null,focus_label:row.focus_label||routingApi?.TAG_LABELS?.[row.focus_tag]||null,source_case_id:row.source_case_id||null,source_rate:Number.isFinite(Number(row.recent_rate))?Number(row.recent_rate):null,created_at:new Date().toISOString(),persistent_streak:0,emphasis:'normal',selection_reason:'longitudinal',prior_cases_with_issue:Number(row.prior_cases_with_issue)||0,routing_source:row.evidence_type==='followthrough'?'followthrough_learning':'longitudinal_learning'};
  }
  function candidateIsEligible(data,objective,mastered,index){
    if(!objective)return false;
    const focus=focusOf(objective),event=focus?mastered.get(focus):null;
    return !event||eligibleAfterMastery(objective,event,index);
  }
  function domainForFeedbackTag(tag,routingApi){
    if(!tag)return null;
    for(const [domainId,tags] of Object.entries(routingApi?.DOMAIN_TAGS||{}))if(Array.isArray(tags)&&tags.includes(tag))return domainId;
    return null;
  }
  function curriculumCandidate(data,routingApi,mastered=latestMasteryByFocus(data),index=caseIndexMap(data)){
    const completedRows=(Array.isArray(data?.cases)?data.cases:[]).filter(completed).slice(-CURRICULUM_RECENT_CASES);
    const rows=new Map();
    function ensure(domainId,focusTag){
      const key=focusTag||domainId;if(!domainId||!key||mastered.has(key))return null;
      let row=rows.get(key);
      if(!row){row={domain_id:domainId,label:routingApi?.DOMAIN_LABELS?.[domainId]||domainId,focus_tag:focusTag||null,focus_label:routingApi?.TAG_LABELS?.[focusTag]||null,signal_cases:new Set(),failure_cases:new Set(),success_cases:new Set(),failure_score:0,last_failure_index:-1,last_success_index:-1,source_case_id:null};rows.set(key,row)}
      return row;
    }
    for(const c of completedRows){
      const caseId=c.case_id,caseIndex=index.get(caseId)??-1,p=c?.adaptive_practice||{};
      if(p.domain_id&&p.focus_tag&&['resolved','improved','not_resolved'].includes(p.objective_status)){
        const row=ensure(p.domain_id,p.focus_tag);
        if(row){
          row.signal_cases.add(caseId);
          if(p.objective_status==='not_resolved'){row.failure_cases.add(caseId);row.failure_score+=2;row.last_failure_index=Math.max(row.last_failure_index,caseIndex);row.source_case_id=caseId}
          else{row.success_cases.add(caseId);row.last_success_index=Math.max(row.last_success_index,caseIndex)}
        }
      }
      const actions=data?.completion_records?.[caseId]?.case_learning_trace?.feedback_followthrough?.actions;
      if(!Array.isArray(actions))continue;
      for(const a of actions){
        if(!['followed','unchanged','opposite'].includes(a?.status)||!a?.feedback_tag)continue;
        const domainId=routingApi?.DOSE_KEY_DOMAIN?.[a.dose_key]||domainForFeedbackTag(a.feedback_tag,routingApi),row=ensure(domainId,a.feedback_tag);
        if(!row)continue;
        row.signal_cases.add(caseId);
        if(a.status==='unchanged'||a.status==='opposite'){
          row.failure_cases.add(caseId);row.failure_score+=a.status==='opposite'?2:1;row.last_failure_index=Math.max(row.last_failure_index,caseIndex);row.source_case_id=caseId;
        }else{row.success_cases.add(caseId);row.last_success_index=Math.max(row.last_success_index,caseIndex)}
      }
    }
    const candidates=[...rows.values()].filter(row=>row.signal_cases.size>=CURRICULUM_MIN_SIGNAL_CASES&&row.failure_cases.size>=1&&row.failure_score>=2&&row.last_failure_index>row.last_success_index).map(row=>({
      domain_id:row.domain_id,label:row.label,focus_tag:row.focus_tag,focus_label:row.focus_label,source_case_id:row.source_case_id,recent_rate:row.failure_cases.size/row.signal_cases.size,reference_rate:null,delta:null,prior_cases_with_issue:row.failure_cases.size,evidence_type:'learning_curve',signal_cases:row.signal_cases.size,failure_cases:row.failure_cases.size,failure_score:row.failure_score,evidence_index:row.last_failure_index
    })).sort((a,b)=>b.failure_score-a.failure_score||b.failure_cases-a.failure_cases||b.evidence_index-a.evidence_index||String(a.focus_tag).localeCompare(String(b.focus_tag)));
    return candidates[0]||null;
  }
  function curriculumObjective(candidate,routingApi){
    if(!candidate)return null;
    const base=longitudinalObjectiveFromRow(candidate,routingApi);
    return base?{...base,routing_source:'learning_curve_curriculum',learning_curve_signal_cases:candidate.signal_cases,learning_curve_failure_cases:candidate.failure_cases,learning_curve_failure_score:candidate.failure_score}:null;
  }
  function nextBestObjective(data,base,stale,mastered,index,routingApi){
    for(const row of Array.isArray(base?.repeated)?base.repeated:[]){
      if(focusOf(row)===stale.focus_tag)continue;
      const objective=persistentObjectiveFromRow(row,routingApi);
      if(candidateIsEligible(data,objective,mastered,index))return {objective,source:'repeated'};
    }
    const longitudinal=base?.longitudinal||null;
    if(longitudinal&&focusOf(longitudinal)!==stale.focus_tag){
      const objective=longitudinalObjectiveFromRow(longitudinal,routingApi);
      if(candidateIsEligible(data,objective,mastered,index))return {objective,source:'longitudinal'};
    }
    const curriculum=curriculumCandidate(data,routingApi,mastered,index);
    if(curriculum&&focusOf(curriculum)!==stale.focus_tag){
      const objective=curriculumObjective(curriculum,routingApi);
      if(candidateIsEligible(data,objective,mastered,index))return {objective,source:'learning_curve_curriculum'};
    }
    return null;
  }
  function rerouteAfterSuppression(data,base,stale,suppressed,mastered,index,routingApi){
    if(!suppressed)return null;
    const next=nextBestObjective(data,base,stale,mastered,index,routingApi);
    if(!next)return suppressed;
    const finalData={...(suppressed.data||base?.data||data||{}),active_objective:next.objective};
    return {...suppressed,data:finalData,objective:next.objective,reason:'mastery_stable_rerouted',mastery_reroute:{suppressed_focus_tag:stale.focus_tag,suppressed_domain_id:stale.domain_id,next_focus_tag:focusOf(next.objective),next_domain_id:next.objective.domain_id||null,source:next.source},changed:true};
  }
  function applyResolvedData(data,base,routingApi){
    const current=base?.objective||data?.active_objective||null;
    if(routingApi?.isSafetyObjective?.(current))return {...base,mastery_recurrence:null,mastery_suppression:null,mastery_reroute:null,learning_curve_curriculum:null};
    const index=caseIndexMap(data),mastered=latestMasteryByFocus(data);
    const candidates=recurrenceCandidates(data,base,routingApi),top=candidates[0]||null;
    if(top){
      const objective=markReappeared(top);
      const before=base?.objective||null;
      const finalData={...(base?.data||data||{}),active_objective:objective};
      return {...base,data:finalData,objective,reason:'mastery_reappeared',mastery_recurrence:{focus_tag:top.focus_tag,domain_id:top.domain_id,source:top.source,evidence_index:top.evidence_index,previous_mastery_case_id:top.mastery_event?.case_id||null,previous_mastery_episode:Math.max(1,Number(top.mastery_event?.mastery_episode)||1),mastery_episode_target:Math.max(1,Number(top.mastery_event?.mastery_episode)||1)+1},mastery_suppression:null,mastery_reroute:null,learning_curve_curriculum:null,changed:JSON.stringify(before)!==JSON.stringify(objective)};
    }
    const stale=staleMasteredBase(data,base,mastered,index);
    const suppressed=suppressStaleMasteredBase(data,base,stale);
    if(suppressed)return rerouteAfterSuppression(data,base,stale,suppressed,mastered,index,routingApi);
    if(!base?.objective){
      const curriculum=curriculumCandidate(data,routingApi,mastered,index),objective=curriculumObjective(curriculum,routingApi);
      if(objective){
        const finalData={...(base?.data||data||{}),active_objective:objective};
        return {...base,data:finalData,objective,reason:'learning_curve_curriculum',learning_curve_curriculum:curriculum,mastery_recurrence:null,mastery_suppression:null,mastery_reroute:null,changed:true};
      }
    }
    return {...base,mastery_recurrence:null,mastery_suppression:null,mastery_reroute:null,learning_curve_curriculum:null};
  }
  function install(root){
    const routing=root?.WardEducationRoutingState;if(!routing||routing.__masteryAwareInstalled)return false;
    const rawData=routing.resolveData,rawStored=routing.resolveStored;
    if(typeof rawData!=='function'||typeof rawStored!=='function')return false;
    routing.resolveData=function(data){
      const base=rawData.call(routing,data);
      return applyResolvedData(data,base,routing);
    };
    routing.resolveStored=function(r){
      try{
        const data=JSON.parse(r.localStorage.getItem(STORAGE_KEY)||'{}')||{};
        const next=routing.resolveData(data);
        if(next.changed)r.localStorage.setItem(STORAGE_KEY,JSON.stringify(next.data));
        return next;
      }catch{return rawStored.call(routing,r)}
    };
    routing.__masteryAwareInstalled=true;
    return true;
  }
  return {completed,caseIndexMap,focusOf,masteryEvents,latestMasteryByFocus,rowEvidenceIndex,eligibleAfterMastery,completedAfterMastery,stableMasteryState,staleMasteredBase,candidateFromBase,recurrenceCandidates,relearningLabel,markReappeared,suppressStaleMasteredBase,persistentObjectiveFromRow,longitudinalObjectiveFromRow,candidateIsEligible,domainForFeedbackTag,curriculumCandidate,curriculumObjective,nextBestObjective,rerouteAfterSuppression,applyResolvedData,install,MASTERY_ACTION_STATUSES,RELEARNING_PREFIX,RETENTION_CASES,CURRICULUM_RECENT_CASES,CURRICULUM_MIN_SIGNAL_CASES,version:'1.5.0'};
});