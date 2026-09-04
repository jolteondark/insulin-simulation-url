(function(root){
  const CTA_ID='caseNextCta';
  const PREVIEW_ID='caseNextChallenge';
  const STORAGE_KEY='ward_glucose_learning_curve_v1';

  function doc(){return root?.document||(typeof document!=='undefined'?document:null)}

  function terminalRestartButton(){
    const d=doc();
    if(!d)return null;
    return d.querySelector('#resultPanel #restartBtn');
  }

  function navigateCaseStart(){
    try{
      const nav=root?.RepeatPlayNavigation;
      if(nav?.moveToCaseStartContext)return nav.moveToCaseStartContext();
      return nav?.moveToPrescriptionContext?.();
    }catch(e){console.error('case transition navigation',e)}
  }

  function loadLearningData(){
    try{return JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'{}')}
    catch{return {}}
  }

  function objectiveLabel(objective){
    return objective?.focus_label||objective?.label||objective?.domain_id||'現在の処方判断';
  }

  function nextChallengeModel(dataArg){
    const data=dataArg||loadLearningData();
    const objective=data?.active_objective||null;
    let run=null;
    try{run=root?.WardLearningRunProgress?.summarize?.(data)||null}catch{}
    if(!objective){
      return {
        label:'安全な処方を別症例でも再現',
        reason:'固定された弱点はありません。4検・食事・実投与量・hidden safetyを見ながら、同じ判断を別患者でも再現します。',
        streak:Number(run?.improvement_streak)||0,
        adaptive:false
      };
    }
    const streak=Number(objective.persistent_streak)||0;
    const recurrentN=Number(objective.prior_cases_with_issue)||0;
    let reason='前症例で残った1方向を、次症例でも結果ベースで確認します。';
    if(streak>=2)reason=`${streak}症例連続で残った弱点です。次症例も同じ方向を重点練習し、解除できるか確認します。`;
    else if(objective.selection_reason==='safety')reason='前症例のhidden safety signalを優先します。安全性を保ちながら処方方向を修正できるか確認します。';
    else if(objective.selection_reason==='recurrent'&&recurrentN>0)reason=`過去${recurrentN}症例でも出た反復弱点です。単発の誤差より、繰り返す処方傾向の修正を優先します。`;
    return {label:objectiveLabel(objective),reason,streak:Number(run?.improvement_streak)||0,adaptive:true};
  }

  function ensurePreview(body){
    const d=doc();if(!d||!body)return null;
    let el=body.querySelector('#'+PREVIEW_ID);
    if(el)return el;
    el=d.createElement('div');
    el.id=PREVIEW_ID;
    el.className='learning-focus';
    el.style.marginTop='10px';
    body.appendChild(el);
    return el;
  }

  function renderPreview(dataArg){
    const d=doc();if(!d)return null;
    const body=d.querySelector('#caseDebriefBody');if(!body)return null;
    const model=nextChallengeModel(dataArg);
    const el=ensurePreview(body);if(!el)return model;
    el.textContent='';
    const kicker=d.createElement('div');kicker.className='learning-focus-kicker';kicker.textContent='NEXT CHALLENGE';
    const title=d.createElement('div');title.className='learning-focus-title';title.textContent=model.label;
    const reason=d.createElement('div');reason.className='learning-focus-body';reason.textContent=model.reason;
    el.append(kicker,title,reason);
    if(model.streak>=3){
      const note=d.createElement('div');note.className='micro-note';note.style.marginTop='7px';note.textContent=`WARD RUN：${model.streak}症例連続で改善中。次も再現できれば学習の定着を確認できます。`;el.appendChild(note);
    }
    return model;
  }

  function ensureCta(){
    const d=doc();
    if(!d)return null;
    const body=d.querySelector('#caseDebriefBody');
    if(!body)return null;
    renderPreview();
    let btn=body.querySelector('#'+CTA_ID);
    if(btn)return btn;
    btn=d.createElement('button');
    btn.id=CTA_ID;
    btn.className='next-btn';
    btn.type='button';
    btn.textContent='次の重点症例へ';
    btn.style.marginTop='10px';
    btn.addEventListener('click',()=>{
      if(typeof root?.startGenerated!=='function')return;
      root.startGenerated();
      try{root.WardCaseDebrief?.refresh?.()}catch(e){console.error('case transition debrief refresh',e)}
      navigateCaseStart();
    });
    body.appendChild(btn);
    return btn;
  }

  function refresh(){
    try{
      const d=doc();
      if(!d)return;
      const s=root?.state||(typeof state!=='undefined'?state:null);
      if(!s)return;
      const original=terminalRestartButton();
      const debrief=d.querySelector('#caseDebrief');
      const terminal=Boolean(s?.over)&&debrief&&!debrief.classList.contains('hidden');
      if(terminal){
        ensureCta();
        renderPreview();
        if(original)original.style.display='none';
      }else{
        if(original)original.style.display='';
        d.querySelector('#'+CTA_ID)?.remove();
        d.querySelector('#'+PREVIEW_ID)?.remove();
      }
    }catch(e){console.error('case transition CTA',e)}
  }

  function mount(){
    const d=doc();
    if(!d)return;
    const submit=d.querySelector('#submitBtn');
    if(submit&&!submit.dataset.caseTransitionCtaMounted){
      submit.dataset.caseTransitionCtaMounted='1';
      submit.addEventListener('click',refresh);
    }
    const newCase=d.querySelector('#newCaseBtn');
    if(newCase)newCase.addEventListener('click',refresh);
    refresh();
  }

  const api={ensureCta,refresh,mount,navigateCaseStart,loadLearningData,objectiveLabel,nextChallengeModel,renderPreview,version:'1.3.0'};
  if(root)root.CaseTransitionCta=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  const d=doc();
  if(d){
    if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
