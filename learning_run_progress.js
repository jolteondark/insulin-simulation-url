(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.WardLearningRunProgress=api;api.mount(root)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const REFRESH_EVENTS=[
    'ward:caseLearningHistoryUpdated',
    'ward:caseDebriefUpdated',
    'ward:caseLearningOutcomeUpdated',
    'ward:learningObjectiveUpdated',
    'ward:insulinStateChanged'
  ];
  const boundRoots=new WeakSet();
  const DOMAIN_LABELS={
    basal:'basal',breakfast_rapid:'朝rapid',lunch_rapid:'昼rapid',dinner_rapid:'夕rapid',
    scale_dependence:'scale依存',hidden_awareness:'hidden excursion',safety_response:'安全対応'
  };
  const LEARNING_ACTIONS={
    feedback_action_alignment_rate:{label:'feedbackを処方へ反映',direction:'higher',action:'指摘された方向へ、翌日のscheduled doseを実際に動かす'},
    same_feedback_next_day_rate:{label:'同じfeedbackの翌日再発を減らす',direction:'lower',action:'同じ指摘を翌日に残さず、その日のうちに次のscheduled doseへ反映する'},
    correction_share_of_rapid:{label:'correction scale依存を減らす',direction:'lower',action:'rapidをscaleで後追いせず、scheduled rapidの調整で先回りする'},
    objective_success_rate:{label:'learning focusを改善まで持っていく',direction:'higher',action:'提示されたfocusを、次症例で改善または解除まで進める'}
  };
  const LEARNING_ACTION_PRIORITY=['feedback_action_alignment_rate','same_feedback_next_day_rate','correction_share_of_rapid','objective_success_rate'];

  function load(root){
    try{return JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'{}')}
    catch{return {}}
  }

  function orderedCompletedCases(data){
    return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome));
  }

  function scoredStatus(data,caseId){
    return data?.completion_records?.[caseId]?.scored?.status||null;
  }

  function improvementStreak(data,cases){
    let streak=0;
    for(let i=cases.length-1;i>=0;i--){
      const status=scoredStatus(data,cases[i].case_id);
      if(status==='resolved'||status==='improved')streak++;
      else break;
    }
    return streak;
  }

  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function unresolvedStreak(xs){
    let streak=0;
    for(let i=xs.length-1;i>=0;i--){
      if(xs[i]?.objective_status==='not_resolved')streak++;
      else break;
    }
    return streak;
  }

  function nextFocusMeta(activeObjective,domainId){
    if(!activeObjective||activeObjective.domain_id!==domainId)return {next_focus:false,next_reason:null,next_focus_tag:null,next_routing_source:null,learning_curve_signal_cases:null,learning_curve_failure_cases:null,learning_curve_failure_score:null};
    return {
      next_focus:true,
      next_reason:activeObjective.selection_reason||'existing',
      next_focus_tag:activeObjective.focus_tag||null,
      next_routing_source:activeObjective.routing_source||null,
      learning_curve_signal_cases:finite(activeObjective.learning_curve_signal_cases),
      learning_curve_failure_cases:finite(activeObjective.learning_curve_failure_cases),
      learning_curve_failure_score:finite(activeObjective.learning_curve_failure_score)
    };
  }

  function domainPracticeSummary(cases,activeObjective=null){
    const grouped=new Map();
    cases.forEach((c,caseIndex)=>{
      const p=c?.adaptive_practice;
      if(!p?.domain_id||!['resolved','improved','not_resolved'].includes(p.objective_status))return;
      if(!grouped.has(p.domain_id))grouped.set(p.domain_id,[]);
      grouped.get(p.domain_id).push({...p,_case_index:caseIndex});
    });
    if(activeObjective?.domain_id&&!grouped.has(activeObjective.domain_id))grouped.set(activeObjective.domain_id,[]);
    return [...grouped.entries()].map(([domainId,xs])=>{
      const recent=xs.slice(-3);
      const rates=recent.map(x=>finite(x.target_rate)).filter(x=>x!=null);
      const improved=xs.filter(x=>x.objective_status==='resolved'||x.objective_status==='improved').length;
      return {
        domain_id:domainId,
        label:DOMAIN_LABELS[domainId]||domainId,
        attempts:xs.length,
        recent_n:recent.length,
        recent_problem_rate:rates.length?rates.reduce((a,b)=>a+b,0)/rates.length:null,
        improvement_rate:xs.length?improved/xs.length:null,
        unresolved_streak:unresolvedStreak(xs),
        latest_status:xs[xs.length-1]?.objective_status||null,
        last_practice_index:finite(xs[xs.length-1]?._case_index),
        ...nextFocusMeta(activeObjective,domainId)
      };
    }).sort((a,b)=>Number(b.next_focus)-Number(a.next_focus)||b.unresolved_streak-a.unresolved_streak||(b.recent_problem_rate??-1)-(a.recent_problem_rate??-1)||b.attempts-a.attempts||a.label.localeCompare(b.label));
  }

  function focusTransition(cases,activeObjective=null){
    if(!cases.length||!activeObjective?.domain_id)return null;
    const latest=cases[cases.length-1];
    const practice=latest?.adaptive_practice;
    const fromDomain=practice?.domain_id;
    const toDomain=activeObjective.domain_id;
    if(!fromDomain||fromDomain===toDomain)return null;
    const status=practice?.objective_status;
    const released=practice?.routing_lifecycle?.state==='released';
    if(status!=='resolved'&&!released)return null;
    return {
      from_domain:fromDomain,
      from_label:DOMAIN_LABELS[fromDomain]||fromDomain,
      to_domain:toDomain,
      to_label:DOMAIN_LABELS[toDomain]||toDomain,
      status:status||null,
      released:Boolean(released),
      case_id:latest.case_id||null
    };
  }

  function focusEntryOutcome(cases){
    if(!cases.length)return null;
    const latest=cases[cases.length-1];
    const current=latest?.adaptive_practice;
    if(!current?.domain_id||!['resolved','improved','not_resolved'].includes(current.objective_status))return null;
    let previousCase=null,previous=null;
    for(let i=cases.length-2;i>=0;i--){
      const p=cases[i]?.adaptive_practice;
      if(!p?.domain_id)continue;
      previousCase=cases[i];
      previous=p;
      break;
    }
    if(!previous||previous.domain_id===current.domain_id)return null;
    const released=previous?.routing_lifecycle?.state==='released';
    if(previous.objective_status!=='resolved'&&!released)return null;
    return {
      from_domain:previous.domain_id,
      from_label:DOMAIN_LABELS[previous.domain_id]||previous.domain_id,
      to_domain:current.domain_id,
      to_label:DOMAIN_LABELS[current.domain_id]||current.domain_id,
      status:current.objective_status,
      target_rate:finite(current.target_rate),
      case_id:latest.case_id||null,
      previous_case_id:previousCase?.case_id||null
    };
  }

  function summarize(data){
    const cases=orderedCompletedCases(data);
    const statuses=cases.map(c=>scoredStatus(data,c.case_id)).filter(Boolean);
    const focusClear=statuses.filter(x=>x==='resolved').length;
    const improved=statuses.filter(x=>x==='improved').length;
    const persistentReleased=cases.filter(c=>c?.adaptive_practice?.routing_lifecycle?.state==='released').length;
    const discharged=cases.filter(c=>c.outcome==='discharged').length;
    const latest=cases.length?cases[cases.length-1]:null;
    const latestStatus=latest?scoredStatus(data,latest.case_id):null;
    const latestReleased=latest?.adaptive_practice?.routing_lifecycle?.state==='released';
    return {
      ready:cases.length>0,
      cases:cases.length,
      discharged,
      focus_clear:focusClear,
      improved,
      persistent_released:persistentReleased,
      improvement_streak:improvementStreak(data,cases),
      latest_status:latestStatus,
      latest_persistent_released:Boolean(latestReleased),
      focus_transition:focusTransition(cases,data?.active_objective||null),
      focus_entry_outcome:focusEntryOutcome(cases),
      domains:domainPracticeSummary(cases,data?.active_objective||null)
    };
  }

  function badge(label,value,icon){
    return `<div class="prev-dose"><div class="name">${icon} ${label}</div><div class="value" style="font-size:18px">${value}</div></div>`;
  }

  function latestReward(summary){
    const streak=Number(summary?.improvement_streak)||0;
    if(streak>=3)return {kicker:'🔥 ON A ROLL',title:`${streak}症例連続で改善`,body:'別症例でも処方判断を再現できています。この流れのまま次の重点へ進みます。'};
    if(summary?.latest_persistent_released)return {kicker:'🔓 BREAKTHROUGH',title:'persistent弱点を解除',body:'繰り返していた処方傾向を今回の症例で抜けました。次は別の重点へ進めます。'};
    if(summary?.latest_status==='resolved')return {kicker:'✓ FOCUS CLEAR',title:'今回の重点をクリア',body:'前症例から狙っていた1方向を改善できました。次症例で再現性を確認します。'};
    if(summary?.latest_status==='improved')return {kicker:'↗ NICE ADJUST',title:'処方方向が改善',body:'まだ完全解除ではありませんが、修正方向は合っています。次症例でも続けます。'};
    return {kicker:'▶ WARD RUN',title:'次の重点へ',body:'結果とfeedbackを使って、次症例でも1つずつ処方判断を詰めます。'};
  }

  function focusTransitionHtml(summary){
    const shift=summary?.focus_transition;
    if(!shift)return '';
    const why=shift.released?'persistent弱点を解除':'重点をクリア';
    return `<div class="record-card" style="margin-top:8px"><div class="section-kicker">FOCUS SHIFT</div><div style="font-weight:800">${shift.from_label} → ${shift.to_label}</div><div class="micro-note" style="margin-top:4px">${shift.from_label}を${why}。次症例は${shift.to_label}へ進みます。</div></div>`;
  }

  function pct(x){return Number.isFinite(Number(x))?`${Math.round(100*Number(x))}%`:'—'}

  function focusEntryOutcomeHtml(summary){
    const entry=summary?.focus_entry_outcome;
    if(!entry)return '';
    const result=entry.status==='resolved'?'✓解消':entry.status==='improved'?'↗改善':'未達';
    const rate=entry.target_rate==null?'':` ／ 問題率 ${pct(entry.target_rate)}`;
    const body=entry.status==='resolved'
      ?'新しい重点を初回症例でそのまま解消できました。次のroutingへ進める状態です。'
      :entry.status==='improved'
        ?'新しい重点への最初の処方で改善方向を確認できました。次症例で再現・解除を狙います。'
        :'新しい重点の初回症例では未達でした。原因feedbackを次の処方へ反映して再挑戦します。';
    return `<div class="record-card" style="margin-top:8px"><div class="section-kicker">NEW FOCUS CHECK</div><div style="font-weight:800">${entry.to_label} 初回：${result}${rate}</div><div class="micro-note" style="margin-top:4px">${entry.from_label}から切替後の初回成績。${body}</div></div>`;
  }

  function learningMetricMap(analysis){return new Map((analysis?.metrics||[]).map(m=>[m.id,m]))}
  function learningGap(metric,spec){const late=finite(metric?.late);if(late==null)return null;return spec.direction==='higher'?1-late:late}
  function nextLearningAction(analysis){
    if(!analysis?.ready)return null;
    const map=learningMetricMap(analysis),items=[];
    for(const id of LEARNING_ACTION_PRIORITY){
      const spec=LEARNING_ACTIONS[id],metric=map.get(id),gap=learningGap(metric,spec);
      if(gap==null)continue;
      items.push({id,...spec,early:metric.early,late:metric.late,change:metric.change,gap,priority:LEARNING_ACTION_PRIORITY.indexOf(id)});
    }
    items.sort((a,b)=>b.gap-a.gap||a.priority-b.priority);
    return items[0]||null;
  }
  function bestLearningImprovement(analysis){
    if(!analysis?.ready)return null;
    const map=learningMetricMap(analysis),items=[];
    for(const id of LEARNING_ACTION_PRIORITY){
      const spec=LEARNING_ACTIONS[id],metric=map.get(id),improvement=finite(metric?.change?.improvement);
      if(improvement==null||improvement<=0)continue;
      items.push({id,...spec,early:metric.early,late:metric.late,improvement,priority:LEARNING_ACTION_PRIORITY.indexOf(id)});
    }
    items.sort((a,b)=>b.improvement-a.improvement||a.priority-b.priority);
    return items[0]||null;
  }

  function routedLearningAction(summary){
    const focus=(Array.isArray(summary?.domains)?summary.domains:[]).find(d=>d?.next_focus);
    if(!focus)return null;
    const tag=String(focus.next_focus_tag||'');
    const domain=String(focus.domain_id||'');
    if(focus.next_reason==='safety'||domain==='safety_response'){
      return {id:'routed_safety',label:'安全対応',action:'安全上の異常を最優先で修正してから、通常の処方最適化へ戻る',source:'routing'};
    }
    if(domain==='scale_dependence'||/scale|correction/i.test(tag)){
      return {id:'correction_share_of_rapid',label:LEARNING_ACTIONS.correction_share_of_rapid.label,action:LEARNING_ACTIONS.correction_share_of_rapid.action,source:'routing'};
    }
    if(domain==='basal'||/^basal_/.test(tag)){
      return {id:'routed_basal',label:'basal調整',action:'overnight patternに合わせてbasalを調整し、翌朝の血糖で方向を確認する',source:'routing'};
    }
    if(domain==='breakfast_rapid'||/^breakfast_rapid_/.test(tag)){
      return {id:'routed_breakfast_rapid',label:'朝rapid調整',action:'昼前血糖へつながる朝rapidを重点的に調整する',source:'routing'};
    }
    if(domain==='lunch_rapid'||/^lunch_rapid_/.test(tag)){
      return {id:'routed_lunch_rapid',label:'昼rapid調整',action:'夕前血糖へつながる昼rapidを重点的に調整する',source:'routing'};
    }
    if(domain==='dinner_rapid'||/^dinner_rapid_/.test(tag)){
      return {id:'routed_dinner_rapid',label:'夕rapid調整',action:'眠前血糖へつながる夕rapidを重点的に調整する',source:'routing'};
    }
    return {id:'routed_objective',label:focus.label||'重点課題',action:'現在routingされているlearning focusを、次症例で改善または解除まで進める',source:'routing'};
  }

  function learningActionHtml(analysis,summary=null){
    const routed=routedLearningAction(summary);
    if(!analysis?.ready&&!routed)return '';
    const best=bestLearningImprovement(analysis),aggregate=nextLearningAction(analysis),next=routed||aggregate;
    if(!best&&!next)return '';
    const improved=best?`<div class="micro-note"><b>伸びた点：</b>${best.label} ${pct(best.early)}→${pct(best.late)}（+${(best.improvement*100).toFixed(1)}pt）</div>`:'<div class="micro-note"><b>伸びた点：</b>まだ明確な改善は出ていません。</div>';
    const action=next?(routed
      ?`<div style="font-weight:800;margin-top:6px">次の1点：${next.label}</div><div class="micro-note" style="margin-top:4px">${next.action}。</div>`
      :`<div style="font-weight:800;margin-top:6px">次の1点：${next.label}</div><div class="micro-note" style="margin-top:4px">現在 ${pct(next.late)}。${next.action}。</div>`):'';
    const basis=routed
      ?'次の1点は、実際に次症例へroutingされているfocusを優先します。長期の行動指標は「伸びた点」の確認に使います。'
      :'activeなfocusがないため、既存の行動指標のうち現在もっとも改善余地が大きい1点を表示します。';
    return `<div class="record-card" style="margin-top:8px"><div class="section-kicker">NEXT LEARNING ACTION</div>${improved}${action}<div class="micro-note" style="margin-top:4px">${basis}</div></div>`;
  }

  function learningAxesHtml(analysis){
    if(!analysis?.ready)return '';
    const map=learningMetricMap(analysis);
    const cells=LEARNING_ACTION_PRIORITY.map(id=>{
      const spec=LEARNING_ACTIONS[id],metric=map.get(id),early=finite(metric?.early),late=finite(metric?.late),improvement=finite(metric?.change?.improvement);
      if(late==null)return '';
      const trend=improvement==null||Math.abs(improvement)<0.005?'→':improvement>0?'↗':'↘';
      const delta=improvement==null?'':` <span style="font-weight:700">${trend}${Math.abs(improvement*100).toFixed(1)}pt</span>`;
      return `<div class="prev-dose"><div class="name">${spec.label}</div><div class="value" style="font-size:17px">${pct(late)}</div><div class="micro-note">初期 ${pct(early)}${delta}</div></div>`;
    }).filter(Boolean);
    if(!cells.length)return '';
    return `<div class="record-card" style="margin-top:8px"><div class="section-kicker">LONGITUDINAL SNAPSHOT</div><div class="micro-note">既存の4軸を同じ場所で確認。新しい総合点は作りません。</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:7px">${cells.join('')}</div></div>`;
  }

  function latestStatusLabel(d){
    if(d.latest_status==='resolved')return ' ／ <b>今回 ✓解消</b>';
    if(d.latest_status==='improved')return ' ／ <b>今回 ↗改善</b>';
    if(d.latest_status==='not_resolved')return ' ／ <b>今回 未達</b>';
    return '';
  }
  function nextFocusLabel(d){
    if(!d.next_focus)return '';
    let reason;
    if(d.next_routing_source==='learning_curve_curriculum'){
      const signal=finite(d.learning_curve_signal_cases),failures=finite(d.learning_curve_failure_cases),score=finite(d.learning_curve_failure_score);
      reason='少数症例curriculum';
      if(signal!=null&&failures!=null)reason+=` ${failures}/${signal}症例`;
      if(score!=null)reason+=`・重み${score}`;
    }else reason=d.next_reason==='persistent'?'未達継続':d.next_reason==='longitudinal'?'最近の傾向悪化':d.next_reason==='safety'?'安全重点':'次の重点';
    return ` ／ <b>次の重点</b>（${reason}）`;
  }
  function domainRow(d){
    const unresolved=d.unresolved_streak?` ／ 未達 ${d.unresolved_streak}回連続`:'';
    return `<div class="micro-note" style="display:grid;grid-template-columns:minmax(72px,.8fr) 1fr 1fr;gap:6px;align-items:center;margin-top:5px"><b>${d.label}</b><span>最近 ${pct(d.recent_problem_rate)}</span><span>改善 ${pct(d.improvement_rate)}${unresolved}${latestStatusLabel(d)}${nextFocusLabel(d)}</span></div>`;
  }

  function domainDisplayRows(xs){
    const current=xs.filter(d=>d?.next_focus||Number(d?.unresolved_streak)>0);
    const historical=xs.filter(d=>!d?.next_focus&&!(Number(d?.unresolved_streak)>0)).sort((a,b)=>(b.last_practice_index??-1)-(a.last_practice_index??-1)||b.attempts-a.attempts||a.label.localeCompare(b.label));
    const shown=current.slice(0,4);
    const historySlots=current.length?Math.min(1,Math.max(0,4-shown.length)):Math.min(2,Math.max(0,4-shown.length));
    shown.push(...historical.slice(0,historySlots));
    return {shown,omitted:Math.max(0,xs.length-shown.length)};
  }

  function domainProgressHtml(summary){
    const xs=Array.isArray(summary?.domains)?summary.domains:[];
    if(!xs.length)return '<div class="micro-note" style="margin-top:9px">領域別の学習変化は、重点症例を完了すると表示されます。</div>';
    const display=domainDisplayRows(xs),hidden=display.omitted?`<div class="micro-note" style="margin-top:5px">解除・改善済みの過去 ${display.omitted}領域は省略しています。</div>`:'';
    return `<div class="micro-note" style="margin-top:10px"><b>領域別 learning curve</b> — 現在の重点・未達を優先表示</div>${display.shown.map(domainRow).join('')}${hidden}`;
  }

  function renderHtml(summary,analysis=null){
    if(!summary.ready)return '';
    const reward=latestReward(summary);
    const streak=summary.improvement_streak;
    const streakCopy=streak>=3?`<div class="micro-note" style="margin-top:7px"><b>連続改善 ${streak}症例。</b> 同じ考え方を別症例でも再現できています。</div>`:'';
    return `<section id="learningRunProgress" class="learning-focus" aria-live="polite"><div class="learning-focus-kicker">${reward.kicker}</div><div class="learning-focus-title">${reward.title}</div><div class="learning-focus-body" style="margin-top:3px">${reward.body}</div>${focusTransitionHtml(summary)}${focusEntryOutcomeHtml(summary)}${learningActionHtml(analysis,summary)}${learningAxesHtml(analysis)}<div class="micro-note" style="margin-top:9px"><b>WARD RUN</b> — 症例を重ねた攻略状況</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px">${badge('完了症例',summary.cases,'🏁')}${badge('FOCUS CLEAR',summary.focus_clear,'✓')}${badge('persistent解除',summary.persistent_released,'🔓')}${badge('連続改善',summary.improvement_streak,'↗')}</div>${streakCopy}${domainProgressHtml(summary)}<div class="micro-note" style="margin-top:7px">DISCHARGE ${summary.discharged}件。新しい点数は付けず、実際の学習履歴だけを表示しています。</div></section>`;
  }

  function ensurePanel(root){
    const doc=root?.document;if(!doc)return null;
    let el=doc.querySelector('#learningRunProgress');if(el)return el;
    const momentum=doc.querySelector('#learningMomentum');
    const debrief=doc.querySelector('#caseDebrief');
    const result=doc.querySelector('#resultPanel');
    const anchor=momentum||debrief||result;
    if(!anchor)return null;
    const holder=doc.createElement('div');
    holder.id='learningRunProgressHolder';
    anchor.parentNode.insertBefore(holder,anchor.nextSibling);
    return holder;
  }

  function render(root,dataArg){
    const data=dataArg||load(root),summary=summarize(data),holder=ensurePanel(root);
    if(!holder)return summary;
    const analysis=root?.WardLearningAnalysis?.summarize?.(data)||null;
    const html=renderHtml(summary,analysis);
    if(holder.id==='learningRunProgress')holder.outerHTML=html||'<div id="learningRunProgressHolder"></div>';
    else holder.innerHTML=html;
    return summary;
  }

  function refresh(root){return render(root)}

  function mount(root){
    if(!root?.document)return;
    let refreshQueued=false;
    const scheduleRefresh=()=>{
      if(refreshQueued)return;
      refreshQueued=true;
      setTimeout(()=>{refreshQueued=false;refresh(root)},0);
    };
    scheduleRefresh();
    if(boundRoots.has(root))return;
    boundRoots.add(root);
    for(const eventName of REFRESH_EVENTS)root.addEventListener?.(eventName,scheduleRefresh);
    root.addEventListener?.('storage',(event)=>{
      if(!event?.key||event.key===STORAGE_KEY)scheduleRefresh();
    });
    root.document.querySelector('#submitBtn')?.addEventListener('click',scheduleRefresh);
    root.document.querySelector('#newCaseBtn')?.addEventListener('click',scheduleRefresh);
    root.document.querySelector('#resultPanel')?.addEventListener('click',e=>{if(e.target?.closest?.('#restartBtn'))scheduleRefresh()});
  }

  return {orderedCompletedCases,scoredStatus,improvementStreak,unresolvedStreak,nextFocusMeta,domainPracticeSummary,focusTransition,focusEntryOutcome,domainDisplayRows,summarize,latestReward,focusTransitionHtml,focusEntryOutcomeHtml,latestStatusLabel,nextFocusLabel,domainProgressHtml,nextLearningAction,bestLearningImprovement,routedLearningAction,learningActionHtml,learningAxesHtml,renderHtml,render,refresh,mount,version:'1.11.0'};
});