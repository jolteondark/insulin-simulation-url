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

  function completed(caseRow){return caseRow?.case_id&&['discharged','game_over'].includes(caseRow.outcome)}
  function caseIndexMap(data){return new Map((Array.isArray(data?.cases)?data.cases:[]).map((c,i)=>[c?.case_id,i]))}
  function focusOf(x){return x?.focus_tag||x?.domain_id||null}
  function masteryEvents(data){
    const index=caseIndexMap(data);
    return Object.entries(data?.completion_records||{}).map(([caseId,record])=>{
      const x=record?.[RELEASE_KEY]||{};
      const focus=focusOf(x);
      if(x.action_status!=='followed'||!focus)return null;
      return {case_id:caseId,case_index:index.has(caseId)?index.get(caseId):-1,focus_tag:focus,domain_id:x.domain_id||null};
    }).filter(Boolean);
  }
  function latestMasteryByFocus(data){
    const out=new Map();
    for(const event of masteryEvents(data)){
      const prev=out.get(event.focus_tag);
      if(!prev||event.case_index>prev.case_index)out.set(event.focus_tag,event);
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
  function candidateFromBase(data,base,mastered,index){
    const objective=base?.objective||null,focus=focusOf(objective),event=focus?mastered.get(focus):null;
    if(!objective||!event||objective?.selection_reason==='safety')return null;
    if(!eligibleAfterMastery(objective,event,index))return null;
    return {objective,evidence_index:rowEvidenceIndex(objective,index),focus_tag:focus,domain_id:objective.domain_id||event.domain_id||null,source:'existing_route'};
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
        evidence_index:index.get(c.case_id)??-1,focus_tag:focus,domain_id:p.domain_id||event.domain_id||null,source:'adaptive_practice'
      });
    }
    for(const x of Array.isArray(data?.objectives)?data.objectives:[]){
      const focus=focusOf(x),event=focus?mastered.get(focus):null;
      if(!event||x?.status!=='not_resolved'||!eligibleAfterMastery(x,event,index))continue;
      rows.push({
        objective:{...x,emphasis:'high',selection_reason:x.selection_reason==='persistent'?'persistent':'longitudinal',prior_routing_source:x.routing_source||x.selection_reason||'objective_history',routing_source:'mastery_recurrence'},
        evidence_index:rowEvidenceIndex(x,index),focus_tag:focus,domain_id:x.domain_id||event.domain_id||null,source:'objective_history'
      });
    }
    return rows.sort((a,b)=>b.evidence_index-a.evidence_index||String(a.focus_tag).localeCompare(String(b.focus_tag)));
  }
  function markReappeared(candidate){
    if(!candidate?.objective)return null;
    const objective={...candidate.objective};
    if(objective.routing_source!=='mastery_recurrence')objective.prior_routing_source=objective.routing_source||objective.selection_reason||candidate.source||null;
    objective.routing_source='mastery_recurrence';
    objective.mastery_state='reappeared';
    objective.mastery_priority=true;
    objective.emphasis='high';
    if(!['persistent','longitudinal'].includes(objective.selection_reason))objective.selection_reason='longitudinal';
    return objective;
  }
  function applyResolvedData(data,base,routingApi){
    const current=base?.objective||data?.active_objective||null;
    if(routingApi?.isSafetyObjective?.(current))return {...base,mastery_recurrence:null};
    const candidates=recurrenceCandidates(data,base,routingApi),top=candidates[0]||null;
    if(!top)return {...base,mastery_recurrence:null};
    const objective=markReappeared(top);
    const before=base?.objective||null;
    const finalData={...(base?.data||data||{}),active_objective:objective};
    return {...base,data:finalData,objective,reason:'mastery_reappeared',mastery_recurrence:{focus_tag:top.focus_tag,domain_id:top.domain_id,source:top.source,evidence_index:top.evidence_index},changed:JSON.stringify(before)!==JSON.stringify(objective)};
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
  return {completed,caseIndexMap,focusOf,masteryEvents,latestMasteryByFocus,rowEvidenceIndex,eligibleAfterMastery,candidateFromBase,recurrenceCandidates,markReappeared,applyResolvedData,install,version:'1.0.0'};
});