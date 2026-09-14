(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.WardLearningTrendInterpretation=api;api.mount(root)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const REFRESH_EVENTS=[
    'ward:caseLearningHistoryUpdated',
    'ward:caseDebriefUpdated',
    'ward:caseLearningOutcomeUpdated',
    'ward:learningObjectiveUpdated',
    'ward:insulinStateChanged'
  ];
  const AXES={
    feedback_action_alignment_rate:{label:'feedback→処方反映',direction:'higher'},
    same_feedback_next_day_rate:{label:'同じfeedbackの翌日再発',direction:'lower'},
    correction_share_of_rapid:{label:'correction scale依存',direction:'lower'},
    objective_success_rate:{label:'learning focus改善',direction:'higher'}
  };
  const AXIS_ORDER=Object.keys(AXES);
  const TREND_EPSILON=0.005;
  const boundRoots=new WeakSet();

  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}

  function improvementFor(metric,spec){
    const supplied=finite(metric?.change?.improvement);
    if(supplied!=null)return supplied;
    const early=finite(metric?.early),late=finite(metric?.late);
    if(early==null||late==null)return null;
    return spec.direction==='higher'?late-early:early-late;
  }

  function classifyAxis(metric,spec){
    const improvement=improvementFor(metric,spec);
    if(improvement==null)return {status:'unknown',improvement:null};
    if(improvement>TREND_EPSILON)return {status:'improving',improvement};
    if(improvement<-TREND_EPSILON)return {status:'worsening',improvement};
    return {status:'stable',improvement};
  }

  function interpretAxes(analysis){
    if(!analysis?.ready)return [];
    const metrics=new Map((analysis.metrics||[]).map(metric=>[metric.id,metric]));
    return AXIS_ORDER.map(id=>{
      const spec=AXES[id],metric=metrics.get(id),trend=classifyAxis(metric,spec);
      return {
        id,
        label:spec.label,
        direction:spec.direction,
        early:finite(metric?.early),
        late:finite(metric?.late),
        status:trend.status,
        improvement:trend.improvement
      };
    }).filter(axis=>axis.late!=null||axis.early!=null||axis.status!=='unknown');
  }

  function labels(xs){return xs.map(x=>x.label).join('・')}

  function narrative(analysis,latestStatus=null){
    const axes=interpretAxes(analysis);
    if(!axes.length)return null;
    const improving=axes.filter(x=>x.status==='improving');
    const worsening=axes.filter(x=>x.status==='worsening');
    const stable=axes.filter(x=>x.status==='stable');
    const latestSuccess=latestStatus==='resolved'||latestStatus==='improved';
    const latestFailure=latestStatus==='not_resolved';

    if(latestSuccess&&worsening.length){
      return {
        tone:'mixed',
        title:'今回の成功は出ていますが、長期ではまだ弱点が残っています',
        body:`長期では ${labels(worsening)} が悪化傾向です。今回だけの成功で解除せず、次症例でも再現できるか確認します。`,
        improving:improving.map(x=>x.id),worsening:worsening.map(x=>x.id),stable:stable.map(x=>x.id)
      };
    }
    if(latestFailure&&improving.length&&!worsening.length){
      return {
        tone:'mixed',
        title:'今回は未達ですが、長期では改善しています',
        body:`長期では ${labels(improving)} が改善傾向です。今回の1症例だけで後退と判断せず、同じ修正方向を続けます。`,
        improving:improving.map(x=>x.id),worsening:[],stable:stable.map(x=>x.id)
      };
    }
    if(worsening.length){
      return {
        tone:'worsening',
        title:'長期で悪化している軸があります',
        body:`${labels(worsening)} が悪化傾向です。次のfocusが別領域でも、この傾向は見失わないようにします。`,
        improving:improving.map(x=>x.id),worsening:worsening.map(x=>x.id),stable:stable.map(x=>x.id)
      };
    }
    if(improving.length){
      return {
        tone:'improving',
        title:'長期でも改善が確認できます',
        body:`${labels(improving)} が改善傾向です。直近の成功を別症例でも再現して定着を確認します。`,
        improving:improving.map(x=>x.id),worsening:[],stable:stable.map(x=>x.id)
      };
    }
    return {
      tone:'stable',
      title:'長期変化はまだ明確ではありません',
      body:'既存4軸に明確な改善・悪化はまだありません。症例を重ねて傾向が出るまで、現在のfocusを優先します。',
      improving:[],worsening:[],stable:stable.map(x=>x.id)
    };
  }

  function trendIcon(result){
    return result?.tone==='improving'?'↗':result?.tone==='worsening'?'↘':result?.tone==='mixed'?'↔':'→';
  }

  function narrativeHtml(result,options={}){
    if(!result)return '';
    const icon=trendIcon(result);
    if(options.compact){
      return `<div id="learningTrendInterpretation" class="micro-note" style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(127,127,127,.24)"><b>LONG-TERM READ：</b>${icon} ${result.title}<div style="margin-top:3px">${result.body}</div></div>`;
    }
    return `<div id="learningTrendInterpretation" class="record-card" style="margin-top:8px"><div class="section-kicker">LONG-TERM READ</div><div style="font-weight:800">${icon} ${result.title}</div><div class="micro-note" style="margin-top:4px">${result.body}</div></div>`;
  }

  function load(root){
    try{return JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'{}')}
    catch{return {}}
  }

  function latestStatus(root,data){
    const viaRun=root?.WardLearningRunProgress?.summarize?.(data)?.latest_status;
    if(viaRun)return viaRun;
    const cases=(Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome));
    const latest=cases[cases.length-1];
    return latest?data?.completion_records?.[latest.case_id]?.scored?.status||null:null;
  }

  function cardsInRun(root){
    return [...(root?.document?.querySelector?.('#learningRunProgress')?.querySelectorAll?.('.record-card')||[])];
  }

  function findCardByText(root,text){
    return cardsInRun(root).find(card=>String(card?.textContent||'').includes(text))||null;
  }

  function findSnapshotCard(root){return findCardByText(root,'LONGITUDINAL SNAPSHOT')}
  function findLearningActionCard(root){return findCardByText(root,'NEXT LEARNING ACTION')}

  function render(root,dataArg){
    const data=dataArg||load(root);
    const analysis=root?.WardLearningAnalysis?.summarize?.(data)||null;
    const result=narrative(analysis,latestStatus(root,data));
    const doc=root?.document;
    if(!doc)return result;
    doc.querySelector?.('#learningTrendInterpretation')?.remove?.();
    if(!result)return null;

    const actionCard=findLearningActionCard(root);
    if(actionCard?.insertAdjacentHTML){
      actionCard.insertAdjacentHTML('beforeend',narrativeHtml(result,{compact:true}));
      return result;
    }

    const snapshot=findSnapshotCard(root);
    if(snapshot?.insertAdjacentHTML){
      snapshot.insertAdjacentHTML('afterend',narrativeHtml(result));
      return result;
    }
    const run=doc.querySelector?.('#learningRunProgress');
    run?.insertAdjacentHTML?.('beforeend',narrativeHtml(result));
    return result;
  }

  function mount(root){
    if(!root?.document)return;
    let refreshQueued=false;
    const scheduleRefresh=()=>{
      if(refreshQueued)return;
      refreshQueued=true;
      setTimeout(()=>{refreshQueued=false;render(root)},0);
    };
    scheduleRefresh();
    if(boundRoots.has(root))return;
    boundRoots.add(root);
    for(const eventName of REFRESH_EVENTS)root.addEventListener?.(eventName,scheduleRefresh);
    root.addEventListener?.('storage',event=>{if(!event?.key||event.key===STORAGE_KEY)scheduleRefresh();});
    root.document.querySelector?.('#submitBtn')?.addEventListener?.('click',scheduleRefresh);
    root.document.querySelector?.('#newCaseBtn')?.addEventListener?.('click',scheduleRefresh);
    root.document.querySelector?.('#resultPanel')?.addEventListener?.('click',event=>{if(event.target?.closest?.('#restartBtn'))scheduleRefresh();});
  }

  return {AXES,AXIS_ORDER,TREND_EPSILON,improvementFor,classifyAxis,interpretAxes,narrative,trendIcon,narrativeHtml,latestStatus,cardsInRun,findCardByText,findSnapshotCard,findLearningActionCard,render,mount,version:'1.2.0'};
});