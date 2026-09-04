(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.WardLearningRunProgress=api;api.mount(root)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';

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
      latest_persistent_released:Boolean(latestReleased)
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

  function renderHtml(summary){
    if(!summary.ready)return '';
    const reward=latestReward(summary);
    const streak=summary.improvement_streak;
    const streakCopy=streak>=3?`<div class="micro-note" style="margin-top:7px"><b>連続改善 ${streak}症例。</b> 同じ考え方を別症例でも再現できています。</div>`:'';
    return `<section id="learningRunProgress" class="learning-focus" aria-live="polite"><div class="learning-focus-kicker">${reward.kicker}</div><div class="learning-focus-title">${reward.title}</div><div class="learning-focus-body" style="margin-top:3px">${reward.body}</div><div class="micro-note" style="margin-top:9px"><b>WARD RUN</b> — 症例を重ねた攻略状況</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px">${badge('完了症例',summary.cases,'🏁')}${badge('FOCUS CLEAR',summary.focus_clear,'✓')}${badge('persistent解除',summary.persistent_released,'🔓')}${badge('連続改善',summary.improvement_streak,'↗')}</div>${streakCopy}<div class="micro-note" style="margin-top:7px">DISCHARGE ${summary.discharged}件。新しい点数は付けず、実際の学習履歴だけを表示しています。</div></section>`;
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
    const html=renderHtml(summary);
    if(holder.id==='learningRunProgress')holder.outerHTML=html||'<div id="learningRunProgressHolder"></div>';
    else holder.innerHTML=html;
    return summary;
  }

  function refresh(root){return render(root)}

  function mount(root){
    if(!root?.document)return;
    const delayed=()=>setTimeout(()=>refresh(root),0);
    root.document.querySelector('#submitBtn')?.addEventListener('click',delayed);
    root.document.querySelector('#newCaseBtn')?.addEventListener('click',delayed);
    root.document.querySelector('#resultPanel')?.addEventListener('click',e=>{if(e.target?.closest?.('#restartBtn'))delayed()});
    delayed();
  }

  return {orderedCompletedCases,scoredStatus,improvementStreak,summarize,latestReward,renderHtml,render,refresh,mount,version:'1.1.0'};
});
