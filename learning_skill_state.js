(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardLearningSkillState=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const RETENTION_CASES=3;
  const TARGET_REASONS=new Set(['recent_tendency_adaptive','persistent','longitudinal']);

  function load(root){
    try{
      const x=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      return {...x,cases:Array.isArray(x.cases)?x.cases:[],completion_records:x.completion_records&&typeof x.completion_records==='object'?x.completion_records:{}};
    }catch{return {cases:[],completion_records:{}}}
  }

  function completed(caseRow){return caseRow?.case_id&&['discharged','game_over'].includes(caseRow.outcome)}
  function masteryEvents(data){
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const index=new Map(cases.map((c,i)=>[c?.case_id,i]));
    return Object.entries(data?.completion_records||{}).map(([caseId,record])=>{
      const x=record?.followthrough_objective_release||{};
      const focus=x.focus_tag||x.domain_id||null;
      return x.action_status==='followed'&&focus?{case_id:caseId,case_index:index.has(caseId)?index.get(caseId):-1,focus_tag:focus,domain_id:x.domain_id||null}:null;
    }).filter(Boolean);
  }
  function recurrenceAfter(data,event,unresolved){
    if(!event?.focus_tag)return false;
    if(unresolved?.focus_tag===event.focus_tag)return true;
    const cases=Array.isArray(data?.cases)?data.cases:[];
    for(let i=Math.max(0,event.case_index+1);i<cases.length;i++){
      const p=cases[i]?.adaptive_practice||{};
      if((p.focus_tag||p.domain_id)===event.focus_tag&&p.objective_status==='not_resolved')return true;
    }
    const objectives=Array.isArray(data?.objectives)?data.objectives:[];
    const laterIds=new Set(cases.slice(Math.max(0,event.case_index+1)).map(c=>c?.case_id).filter(Boolean));
    return objectives.some(x=>(x?.focus_tag||x?.domain_id)===event.focus_tag&&x?.status==='not_resolved'&&(laterIds.has(x?.source_case_id)||laterIds.has(x?.target_case_id)));
  }
  function retentionState(data,mastered,unresolved){
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const events=masteryEvents(data);
    return mastered.map(item=>{
      const same=events.filter(e=>e.focus_tag===item.focus_tag).sort((a,b)=>b.case_index-a.case_index);
      const event=same[0]||null;
      if(!event)return {...item,retention:'unknown',subsequent_cases:0};
      const subsequent=cases.slice(Math.max(0,event.case_index+1)).filter(completed).length;
      const recurred=recurrenceAfter(data,event,unresolved);
      const retention=recurred?'reappeared':subsequent>=RETENTION_CASES?'retained':subsequent>0?'maintaining':'newly_mastered';
      return {...item,retention,subsequent_cases:subsequent,mastered_case_id:event.case_id};
    });
  }

  function focusTimeline(data){
    return (Array.isArray(data?.cases)?data.cases:[]).map((c,index)=>{
      const p=c?.adaptive_practice||{};
      const focus=p.focus_tag||p.domain_id||null;
      return focus&&TARGET_REASONS.has(p.selection_reason)?{case_id:c.case_id,index,focus_tag:focus,domain_id:p.domain_id||null}:null;
    }).filter(Boolean);
  }
  function focusLifecycle(data){
    const timeline=focusTimeline(data);
    if(!timeline.length)return {ready:false,targeted_cases:0,episodes:0,switches:0,mean_dwell:0,max_dwell:0,current_dwell:0,current_focus:null};
    const episodes=[];
    for(const row of timeline){
      const last=episodes[episodes.length-1];
      if(last&&last.focus_tag===row.focus_tag){
        last.n++;
        last.end_case_id=row.case_id;
      }else episodes.push({focus_tag:row.focus_tag,domain_id:row.domain_id,start_case_id:row.case_id,end_case_id:row.case_id,n:1});
    }
    const total=timeline.length;
    const maxDwell=Math.max(...episodes.map(x=>x.n));
    const current=episodes[episodes.length-1];
    return {
      ready:true,
      targeted_cases:total,
      episodes:episodes.length,
      switches:Math.max(0,episodes.length-1),
      mean_dwell:total/episodes.length,
      max_dwell:maxDwell,
      current_dwell:current.n,
      current_focus:current.focus_tag,
      focus_episodes:episodes
    };
  }

  function buildState(data,routingApi,outcomesApi){
    const masteredRaw=outcomesApi?.summarize?.(data)?.mastered_focuses||[];
    const routed=routingApi?.resolveData?.(data)||{};
    const objective=routed.objective||null;
    const unresolved=objective?{
      domain_id:objective.domain_id||null,
      focus_tag:objective.focus_tag||objective.domain_id||null,
      label:objective.focus_label||objective.label||routingApi?.TAG_LABELS?.[objective.focus_tag]||routingApi?.DOMAIN_LABELS?.[objective.domain_id]||objective.focus_tag||objective.domain_id||'未解決focus',
      routing_source:objective.routing_source||null,
      selection_reason:objective.selection_reason||null
    }:null;
    const mastered=retentionState(data,masteredRaw,unresolved);
    const regressed=mastered.some(x=>x.retention==='reappeared');
    const masteryEpisodes=mastered.reduce((sum,x)=>sum+Math.max(1,Number(x.episodes)||1),0);
    const reacquiredN=mastered.filter(x=>Math.max(1,Number(x.episodes)||1)>1||x.reacquired===true).length;
    return {
      ready:mastered.length>0||Boolean(unresolved),
      mastered,
      unresolved,
      regressed,
      mastered_n:mastered.length,
      mastery_episodes:masteryEpisodes,
      reacquired_n:reacquiredN,
      retained_n:mastered.filter(x=>x.retention==='retained').length,
      maintaining_n:mastered.filter(x=>x.retention==='maintaining'||x.retention==='newly_mastered').length,
      reappeared_n:mastered.filter(x=>x.retention==='reappeared').length,
      focus_lifecycle:focusLifecycle(data)
    };
  }

  function skillLabel(x){
    const base=x.label||x.focus_tag;
    const episodes=Math.max(1,Number(x.episodes)||1);
    const reacquisition=episodes>1?`・再克服 ${episodes-1}回`:'';
    if(x.retention==='retained')return `${base}：定着${reacquisition}`;
    if(x.retention==='reappeared')return `${base}：再出現${reacquisition}`;
    if(x.retention==='maintaining')return `${base}：維持確認中 ${x.subsequent_cases}/${RETENTION_CASES}症例${reacquisition}`;
    if(x.retention==='newly_mastered')return `${base}：克服直後${reacquisition}`;
    return `${base}${reacquisition}`;
  }
  function lifecycleText(state){
    const x=state?.focus_lifecycle;
    if(!x?.ready)return '';
    const currentLabel=state?.unresolved?.focus_tag===x.current_focus?state.unresolved.label:x.current_focus;
    return ` ／ 重点推移：${x.targeted_cases}症例・切替 ${x.switches}回・平均滞在 ${x.mean_dwell.toFixed(1)}症例・最長 ${x.max_dwell}症例${currentLabel?`・現在 ${currentLabel} ${x.current_dwell}症例連続`:''}`;
  }
  function renderHtml(state,options={}){
    if(!state?.ready)return '';
    const id=options.id||'learningSkillState';
    const title=options.title||'獲得済みスキルと現在の課題';
    const episodeDetail=state.mastered_n&&state.mastery_episodes>state.mastered_n
      ? `／克服エピソード ${state.mastery_episodes}回（再克服skill ${state.reacquired_n}件）`
      : '';
    const mastered=state.mastered_n
      ? `克服済み ${state.mastered_n}件${episodeDetail}（${state.mastered.map(skillLabel).join('・')}）`
      : '克服済み 0件';
    const unresolved=state.unresolved
      ? `現在の重点：${state.unresolved.label}${state.regressed&&state.mastered.some(x=>x.focus_tag===state.unresolved.focus_tag&&x.retention==='reappeared')?'（再出現）':''}`
      : '現在の重点：なし';
    return `<div id="${id}" class="micro-note" style="margin-top:7px"><b>${title}：</b>${mastered} ／ ${unresolved}${lifecycleText(state)}。</div>`;
  }

  function refresh(root){
    if(!root?.document)return;
    const state=buildState(load(root),root.WardEducationRoutingState,root.WardRoutingLearningOutcomes);
    const progress=root.document.querySelector('#caseLearningProgress');
    if(progress){
      progress.querySelector('#learningSkillState')?.remove();
      const html=renderHtml(state);
      if(html)progress.insertAdjacentHTML('beforeend',html);
    }
    const finalBody=root.document.querySelector('#finalLearningDebriefBody');
    if(finalBody){
      finalBody.querySelector('#finalLearningSkillState')?.remove();
      const html=renderHtml(state,{id:'finalLearningSkillState',title:'スキル到達状況'});
      if(html)finalBody.insertAdjacentHTML('beforeend',html);
    }
  }

  function wrapRefresh(api,key,root){
    if(!api?.refresh||api.refresh[key])return;
    const original=api.refresh.bind(api);
    const wrapped=function(...args){const out=original(...args);refresh(root);return out};
    wrapped[key]=true;
    api.refresh=wrapped;
  }

  function mount(root){
    if(!root?.document)return;
    wrapRefresh(root.CaseLearningProgress,'__learningSkillStateWrapped',root);
    wrapRefresh(root.WardFinalLearningDebrief,'__learningSkillStateFinalWrapped',root);
    for(const selector of ['#submitBtn','#newCaseBtn']){
      const el=root.document.querySelector(selector);
      if(el&&!el.dataset.learningSkillStateMounted){
        el.dataset.learningSkillStateMounted='1';
        el.addEventListener('click',()=>setTimeout(()=>refresh(root),0));
      }
    }
    refresh(root);
  }

  return {load,completed,masteryEvents,recurrenceAfter,retentionState,focusTimeline,focusLifecycle,buildState,skillLabel,lifecycleText,renderHtml,refresh,mount,RETENTION_CASES,TARGET_REASONS,version:'1.3.0'};
});