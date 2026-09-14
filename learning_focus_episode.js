(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardLearningFocusEpisode=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SCORE_STATUSES=new Set(['resolved','improved','not_resolved']);

  function objectiveKey(x){
    if(!x?.domain_id)return null;
    return `${x.domain_id}::${x.focus_tag||''}`;
  }

  function objectiveLabel(x){
    return x?.focus_label||x?.label||x?.focus_tag||x?.domain_id||'学習課題';
  }

  function buildEpisodes(data){
    const xs=Array.isArray(data?.objectives)?data.objectives.filter(x=>SCORE_STATUSES.has(x?.status)&&objectiveKey(x)):[];
    const episodes=[];
    let current=null;
    for(const x of xs){
      const key=objectiveKey(x);
      if(!current||current.key!==key){
        if(current)episodes.push(current);
        current={key,domain_id:x.domain_id,focus_tag:x.focus_tag||null,label:objectiveLabel(x),attempts:[],closed:false};
      }
      current.attempts.push({case_id:x.target_case_id||null,status:x.status,source_rate:x.source_rate,target_rate:x.target_rate});
      current.label=objectiveLabel(x)||current.label;
      if(x.status==='resolved'||x.status==='improved'){
        current.closed=true;
        current.result=x.status;
        episodes.push(current);
        current=null;
      }
    }
    if(current)episodes.push(current);
    return episodes;
  }

  function recurrenceFlags(episodes){
    const seen=new Set();
    return episodes.map(x=>{
      const recurrent=seen.has(x.key);
      seen.add(x.key);
      return recurrent;
    });
  }

  function learningTrend(data){
    const episodes=buildEpisodes(data);
    const completed=episodes.filter(x=>x.closed);
    const parts=[];

    if(completed.length>=2){
      const latest=completed[completed.length-1];
      const prior=completed.slice(0,-1);
      const priorMean=prior.reduce((a,x)=>a+x.attempts.length,0)/prior.length;
      const delta=latest.attempts.length-priorMean;
      const direction=delta<=-0.5?'短縮':delta>=0.5?'延長':'同等';
      parts.push(`改善速度：直近 ${latest.attempts.length}症例 / 以前平均 ${priorMean.toFixed(1)}症例（${direction}）`);
    }

    if(episodes.length>=6){
      const flags=recurrenceFlags(episodes);
      const recent=flags.slice(-3).filter(Boolean).length;
      const previous=flags.slice(-6,-3).filter(Boolean).length;
      const direction=recent<previous?'減少':recent>previous?'増加':'横ばい';
      parts.push(`同一focus再発：前3episode ${previous}/3 → 直近3episode ${recent}/3（${direction}）`);
    }

    return {text:parts.join(' ／ ')||null,episodes,completed_count:completed.length};
  }

  function summary(data){
    const episodes=buildEpisodes(data);
    const latest=episodes[episodes.length-1]||null;
    const completed=episodes.filter(x=>x.closed);
    const meanAttempts=completed.length?completed.reduce((a,x)=>a+x.attempts.length,0)/completed.length:null;
    const active=data?.active_objective||null;
    let primary='重点課題の改善速度は、症例目標が蓄積すると表示されます。';
    if(latest&&!latest.closed){
      const misses=latest.attempts.filter(x=>x.status==='not_resolved').length;
      primary=`現在の重点課題：${latest.label} — ${latest.attempts.length}症例取り組み中${misses?`（未達 ${misses}）`:''}`;
    }else if(active){
      primary=`現在の重点課題：${objectiveLabel(active)} — 次症例から評価`;
    }else if(latest?.closed){
      const result=latest.result==='resolved'?'達成':'改善';
      const misses=latest.attempts.filter(x=>x.status==='not_resolved').length;
      primary=`直近の重点課題：${latest.label} — ${latest.attempts.length}症例で${result}${misses?`（未達 ${misses} → ${result}）`:''}`;
    }
    const aggregate=completed.length?`改善/達成まで平均 ${meanAttempts.toFixed(1)}症例（完了episode ${completed.length}）`:null;
    const trend=learningTrend(data).text;
    return {primary,aggregate,trend,episodes,completed_count:completed.length,mean_attempts:meanAttempts};
  }

  function refresh(root){
    if(typeof document==='undefined')return;
    const body=document.querySelector('#learningCurveBody');
    if(!body)return;
    let el=document.querySelector('#learningFocusEpisodeSummary');
    if(!el){
      el=document.createElement('div');
      el.id='learningFocusEpisodeSummary';
      el.className='micro-note';
      el.style.marginTop='6px';
      body.parentNode.insertBefore(el,body.nextSibling);
    }
    const data=root?.LearningCurve?.load?root.LearningCurve.load():{};
    const s=summary(data);
    const text=[s.primary,s.aggregate,s.trend].filter(Boolean).join(' ／ ');
    if(el.textContent!==text)el.textContent=text;
  }

  function mount(root){
    if(typeof document==='undefined')return;
    const start=()=>{
      refresh(root);
      const body=document.querySelector('#learningCurveBody');
      if(body&&typeof MutationObserver!=='undefined'){
        const observer=new MutationObserver(()=>refresh(root));
        observer.observe(body,{childList:true,subtree:true,characterData:true});
      }
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
    else start();
  }

  return {objectiveKey,objectiveLabel,buildEpisodes,recurrenceFlags,learningTrend,summary,refresh,mount,version:'1.1.0'};
});
