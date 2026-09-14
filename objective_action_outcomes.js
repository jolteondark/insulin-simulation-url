(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardObjectiveActionOutcomes=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const RETENTION_CASES=3;
  const DOMAIN_DOSE_KEY={basal:'basal_u',breakfast_rapid:'breakfast_u',lunch_rapid:'lunch_u',dinner_rapid:'dinner_u'};
  const FOCUS_DIRECTION={
    basal_excess:-1,basal_deficit:1,
    breakfast_rapid_excess:-1,breakfast_rapid_deficit:1,
    lunch_rapid_excess:-1,lunch_rapid_deficit:1,
    dinner_rapid_excess:-1,dinner_rapid_deficit:1
  };
  const SUCCESS_STATUSES=new Set(['resolved','improved']);
  const COMPLETED_OUTCOMES=new Set(['discharged','game_over']);

  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function load(root){
    try{
      const x=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}');
      return {
        ...x,
        cases:Array.isArray(x.cases)?x.cases:[],
        objectives:Array.isArray(x.objectives)?x.objectives:[],
        completion_records:x.completion_records&&typeof x.completion_records==='object'?x.completion_records:{}
      };
    }catch{return {cases:[],objectives:[],completion_records:{}}}
  }

  function objectiveDoseAction(record,objective){
    const doseKey=DOMAIN_DOSE_KEY[objective?.domain_id];
    const days=record?.case_learning_trace?.days;
    if(!doseKey||!Array.isArray(days)||!days.length)return null;
    const expectedDirection=FOCUS_DIRECTION[objective?.focus_tag]||0;
    const deltas=[];
    for(const day of days){
      const before=finite(day?.previous_order_u?.[doseKey]);
      const after=finite(day?.prescribed_order_u?.[doseKey]);
      if(before==null||after==null)continue;
      deltas.push(after-before);
    }
    if(!deltas.length)return null;
    const nonzero=deltas.filter(x=>x!==0);
    const aligned=expectedDirection?nonzero.some(x=>x*expectedDirection>0):nonzero.length>0;
    const opposed=expectedDirection?nonzero.some(x=>x*expectedDirection<0):false;
    return {
      dose_key:doseKey,
      changed:nonzero.length>0,
      aligned,
      opposed,
      expected_direction:expectedDirection||null,
      deltas_u:deltas
    };
  }

  function focusKey(x){return x?.focus_tag||x?.domain_id||null}
  function releaseForCase(data,caseId){
    const x=data?.completion_records?.[caseId]?.followthrough_objective_release||null;
    if(!x||!['followed','changed'].includes(x.action_status))return null;
    return x;
  }
  function rows(data){
    const out=[];
    for(const objective of Array.isArray(data?.objectives)?data.objectives:[]){
      const caseId=objective?.target_case_id;
      if(!caseId||!DOMAIN_DOSE_KEY[objective?.domain_id])continue;
      const action=objectiveDoseAction(data?.completion_records?.[caseId],objective);
      if(!action)continue;
      const success=SUCCESS_STATUSES.has(objective.status);
      const actionMatched=action.expected_direction?action.aligned:action.changed;
      const release=releaseForCase(data,caseId);
      out.push({
        case_id:caseId,
        domain_id:objective.domain_id,
        focus_tag:objective.focus_tag||null,
        status:objective.status||null,
        success,
        action_matched:actionMatched,
        mastered:success&&actionMatched,
        mastery_episode:release?.mastery_episode||null,
        reacquired:release?.reacquired===true,
        release_action_status:release?.action_status||null,
        ...action
      });
    }
    return out;
  }

  function caseIndex(data,caseId){
    const cases=Array.isArray(data?.cases)?data.cases:[];
    return cases.findIndex(c=>c?.case_id===caseId);
  }
  function laterCompletedCases(data,caseId){
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const index=caseIndex(data,caseId);
    if(index<0)return [];
    return cases.slice(index+1).filter(c=>COMPLETED_OUTCOMES.has(c?.outcome));
  }
  function focusReappeared(data,row){
    const key=focusKey(row);
    if(!key)return false;
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const index=caseIndex(data,row.case_id);
    if(index<0)return false;
    const laterIds=new Set(cases.slice(index+1).map(c=>c?.case_id).filter(Boolean));
    for(const c of cases.slice(index+1)){
      const p=c?.adaptive_practice||{};
      if(focusKey(p)===key&&p.objective_status==='not_resolved')return true;
    }
    return (Array.isArray(data?.objectives)?data.objectives:[]).some(o=>
      focusKey(o)===key&&o?.status==='not_resolved'&&
      (laterIds.has(o?.source_case_id)||laterIds.has(o?.target_case_id))
    );
  }
  function retentionForRow(data,row){
    if(!row?.mastered)return {...row,retention:'not_mastered',subsequent_cases:0};
    const subsequent=laterCompletedCases(data,row.case_id).length;
    const reappeared=focusReappeared(data,row);
    const retention=reappeared?'reappeared':subsequent>=RETENTION_CASES?'retained':subsequent>0?'maintaining':'newly_mastered';
    return {...row,retention,subsequent_cases:subsequent};
  }
  function withRetention(data,inputRows=rows(data)){
    return inputRows.map(row=>retentionForRow(data,row));
  }

  function group(xs){
    const n=xs.length,success=xs.filter(x=>x.success).length;
    return {n,success,rate:n?success/n:null};
  }
  function retentionGroup(xs){
    const mastered=xs.filter(x=>x.mastered);
    return {
      n:mastered.length,
      retained:mastered.filter(x=>x.retention==='retained').length,
      maintaining:mastered.filter(x=>x.retention==='maintaining'||x.retention==='newly_mastered').length,
      reappeared:mastered.filter(x=>x.retention==='reappeared').length
    };
  }
  function episodeHistory(data,xs){
    const mastered=xs.filter(x=>x.mastered);
    const byFocus=new Map();
    for(const row of mastered){
      const key=focusKey(row);if(!key)continue;
      if(!byFocus.has(key))byFocus.set(key,[]);
      byFocus.get(key).push(row);
    }
    const histories=[];
    for(const [focus,items] of byFocus.entries()){
      items.sort((a,b)=>caseIndex(data,a.case_id)-caseIndex(data,b.case_id));
      const episodes=items.map((row,i)=>({
        episode:Number(row.mastery_episode)||i+1,
        case_id:row.case_id,
        retention:row.retention,
        subsequent_cases:row.subsequent_cases,
        reacquired:row.reacquired===true||Number(row.mastery_episode)>1,
        action_status:row.release_action_status||null
      }));
      const latest=episodes[episodes.length-1];
      histories.push({
        focus_tag:focus,
        domain_id:items[items.length-1]?.domain_id||null,
        episodes,
        episode_count:episodes.length,
        reacquired_count:episodes.filter(x=>x.reacquired).length,
        latest_retention:latest?.retention||null,
        latest_case_id:latest?.case_id||null
      });
    }
    return histories.sort((a,b)=>caseIndex(data,a.latest_case_id)-caseIndex(data,b.latest_case_id));
  }

  function summarize(data){
    const raw=rows(data);
    const all=withRetention(data,raw);
    const acted=all.filter(x=>x.changed);
    const notActed=all.filter(x=>!x.changed);
    const directional=all.filter(x=>x.expected_direction);
    const aligned=directional.filter(x=>x.aligned);
    const histories=episodeHistory(data,all);
    return {
      ready:all.length>0,
      n:all.length,
      acted:group(acted),
      not_acted:group(notActed),
      directional:group(directional),
      aligned:group(aligned),
      retention:retentionGroup(all),
      episode_histories:histories,
      reacquired_focuses:histories.filter(x=>x.episode_count>1||x.reacquired_count>0).length,
      rows:all
    };
  }

  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}
  function retentionLabel(x){
    if(x==='retained')return '定着';
    if(x==='reappeared')return '再出現';
    if(x==='maintaining')return '維持確認';
    if(x==='newly_mastered')return '克服直後';
    return '評価待ち';
  }
  function episodeHistoryText(summary){
    const histories=Array.isArray(summary?.episode_histories)?summary.episode_histories:[];
    if(!histories.length)return '';
    return histories.slice(-4).map(h=>{
      const trail=h.episodes.map(e=>`episode ${e.episode} ${retentionLabel(e.retention)}`).join(' → ');
      return `${h.focus_tag}: ${trail}`;
    }).join(' ／ ');
  }
  function renderHtml(summary,options={}){
    if(!summary?.ready)return '';
    const id=options.id||'objectiveActionOutcomeComparison';
    const title=options.title||'重点dose反映と結果';
    const a=summary.acted,u=summary.not_acted;
    const actionText=`変更あり ${a.success}/${a.n}症例が改善・達成（${pct(a.rate)}） ／ 変更なし ${u.success}/${u.n}症例が改善・達成（${pct(u.rate)}）`;
    const aligned=summary.aligned.n?` ／ 方向指定ありのうち一致変更 ${summary.aligned.success}/${summary.aligned.n}症例が改善・達成（${pct(summary.aligned.rate)}）`:'';
    const r=summary.retention;
    const retention=r?.n?`<br><span>改善・達成かつ重点doseへ反映した ${r.n}症例の長期追跡：定着 ${r.retained}、維持確認 ${r.maintaining}、再出現 ${r.reappeared}。</span>`:'';
    const history=episodeHistoryText(summary);
    const historyLine=history?`<br><span>focus履歴：${history}${summary.reacquired_focuses?` ／ 再克服focus ${summary.reacquired_focuses}件`:''}。</span>`:'';
    return `<div id="${id}" class="micro-note" style="margin-top:7px"><b>${title}：</b>${actionText}${aligned}。<span>これは教育ログの記述比較で、dose変更の因果効果を示すものではありません。</span>${retention}${historyLine}</div>`;
  }

  function refresh(root){
    if(!root?.document)return;
    const summary=summarize(load(root));
    const progress=root.document.querySelector('#caseLearningProgress');
    if(progress){
      progress.querySelector('#objectiveActionOutcomeComparison')?.remove();
      const details=progress.querySelector('details');
      const html=renderHtml(summary);
      if(html)(details||progress).insertAdjacentHTML('beforeend',html);
    }
    const finalBody=root.document.querySelector('#finalLearningDebriefBody');
    if(finalBody){
      finalBody.querySelector('#finalObjectiveActionOutcomeComparison')?.remove();
      const html=renderHtml(summary,{id:'finalObjectiveActionOutcomeComparison',title:'重点dose行動とobjective結果'});
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
    wrapRefresh(root.CaseLearningProgress,'__objectiveActionOutcomesWrapped',root);
    wrapRefresh(root.WardFinalLearningDebrief,'__objectiveActionOutcomesFinalWrapped',root);
    for(const selector of ['#submitBtn','#newCaseBtn']){
      root.document.querySelector(selector)?.addEventListener('click',()=>setTimeout(()=>refresh(root),0));
    }
    refresh(root);
  }

  return {finite,objectiveDoseAction,focusKey,releaseForCase,rows,caseIndex,laterCompletedCases,focusReappeared,retentionForRow,withRetention,group,retentionGroup,episodeHistory,summarize,pct,retentionLabel,episodeHistoryText,renderHtml,refresh,mount,DOMAIN_DOSE_KEY,FOCUS_DIRECTION,SUCCESS_STATUSES,COMPLETED_OUTCOMES,RETENTION_CASES,version:'1.2.0'};
});
