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
  const DOMAIN_LABELS={
    basal:'basal',
    breakfast_rapid:'朝rapid',
    lunch_rapid:'昼rapid',
    dinner_rapid:'夕rapid',
    scale_dependence:'scale依存',
    hidden_awareness:'hidden excursion'
  };

  function isPersistentStreak(streak){
    return Math.max(0,Number(streak)||0)>=REPEATED_UNMET_N;
  }

  function objectiveFailureStreak(data,domainId){
    const xs=Array.isArray(data?.objectives)?data.objectives:[];
    let n=0;
    for(let i=xs.length-1;i>=0;i--){
      const x=xs[i];
      if(x?.domain_id!==domainId||x?.status!=='not_resolved')break;
      n++;
    }
    return n;
  }

  function persistentFromObjectiveHistory(data,domainId){
    const streak=objectiveFailureStreak(data,domainId);
    if(!isPersistentStreak(streak))return null;
    return {domain_id:domainId,label:DOMAIN_LABELS[domainId]||domainId,streak};
  }

  function makePersistentObjective(input){
    const streak=Math.max(0,Number(input?.streak)||0);
    if(!input?.domain_id||!isPersistentStreak(streak))return null;
    return {
      domain_id:input.domain_id,
      label:input.label||DOMAIN_LABELS[input.domain_id]||input.domain_id,
      source_case_id:input.source_case_id||null,
      source_rate:Number.isFinite(Number(input.source_rate))?Number(input.source_rate):null,
      created_at:input.created_at||new Date().toISOString(),
      persistent_streak:streak,
      emphasis:'high',
      selection_reason:'persistent',
      prior_cases_with_issue:streak,
      routing_source:input.routing_source||'objective_history'
    };
  }

  function scoredPracticeRows(data){
    return (Array.isArray(data?.cases)?data.cases:[])
      .map((c,index)=>({case_id:c.case_id,index,...(c.adaptive_practice||{})}))
      .filter(x=>x.domain_id&&x.practice_opportunity&&x.practice_opportunity!=='standard_case'&&['resolved','improved','not_resolved'].includes(x.objective_status));
  }

  function trailingUnresolved(xs){
    let n=0;
    for(let i=xs.length-1;i>=0;i--){
      if(xs[i].objective_status!=='not_resolved')break;
      n++;
    }
    return n;
  }

  function repeatedUnmet(data){
    const rows=scoredPracticeRows(data);
    const domains=[...new Set(rows.map(x=>x.domain_id))];
    return domains.map(domainId=>{
      const xs=rows.filter(x=>x.domain_id===domainId);
      const streak=trailingUnresolved(xs);
      const last=xs[xs.length-1]||null;
      return {domain_id:domainId,label:DOMAIN_LABELS[domainId]||domainId,streak,last};
    }).filter(x=>isPersistentStreak(x.streak))
      .sort((a,b)=>b.streak-a.streak||(b.last?.index??-1)-(a.last?.index??-1)||a.label.localeCompare(b.label,'ja'));
  }

  function practiceLifecycle(selection,scored){
    const before=Math.max(0,Number(selection?.persistent_streak)||0);
    const status=scored?.status||null;
    if(!isPersistentStreak(before))return {state:'not_persistent',persistent_before:before,persistent_after:before,released:false,continued:false};
    if(status==='resolved'||status==='improved')return {state:'released',persistent_before:before,persistent_after:0,released:true,continued:false};
    if(status==='not_resolved')return {state:'continued',persistent_before:before,persistent_after:before+1,released:false,continued:true};
    return {state:'active',persistent_before:before,persistent_after:before,released:false,continued:false};
  }

  function isSafetyObjective(objective){
    return objective?.selection_reason==='safety'||objective?.domain_id==='hidden_awareness'&&objective?.emphasis==='high';
  }

  function routedObjective(data){
    const current=data?.active_objective||null;
    if(isSafetyObjective(current))return {objective:current,reason:'safety_preserved',repeated:repeatedUnmet(data)};
    const repeated=repeatedUnmet(data);
    const top=repeated[0]||null;
    if(!top)return {objective:current,reason:'existing',repeated};
    const last=top.last||{};
    const sourceRate=Number.isFinite(Number(last.target_rate))?Number(last.target_rate):Number.isFinite(Number(current?.source_rate))?Number(current.source_rate):null;
    const objective=makePersistentObjective({
      domain_id:top.domain_id,
      label:top.label,
      source_case_id:last.case_id||current?.source_case_id||null,
      source_rate:sourceRate,
      streak:top.streak,
      routing_source:'adaptive_practice'
    });
    return {objective,reason:'repeated_unmet',repeated};
  }

  function resolveData(data){
    const base={...(data||{}),cases:Array.isArray(data?.cases)?data.cases:[]};
    const routed=routedObjective(base);
    const before=base.active_objective||null;
    const changed=JSON.stringify(before)!==JSON.stringify(routed.objective);
    return {data:{...base,active_objective:routed.objective},objective:routed.objective,reason:routed.reason,repeated:routed.repeated,changed};
  }

  function resolveStored(root){
    try{
      const raw=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      const out=resolveData(raw);
      if(out.changed)root.localStorage.setItem(STORAGE_KEY,JSON.stringify(out.data));
      return out;
    }catch{return {data:null,objective:null,reason:'storage_error',repeated:[],changed:false}}
  }

  return {scoredPracticeRows,trailingUnresolved,repeatedUnmet,practiceLifecycle,isPersistentStreak,objectiveFailureStreak,persistentFromObjectiveHistory,makePersistentObjective,isSafetyObjective,routedObjective,resolveData,resolveStored,REPEATED_UNMET_N,DOMAIN_LABELS,version:'1.2.0'};
});