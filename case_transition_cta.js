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

  function scheduleCaseStartNavigation(){
    setTimeout(navigateCaseStart,0);
    return true;
  }

  function schedulePreferredDoseFocus(){
    setTimeout(()=>{
      try{return root?.DoseAdjustControls?.focusPreferredDose?.()}
      catch(e){console.error('case transition dose focus',e)}
    },0);
    return true;
  }

  function loadLearningData(){
    try{return JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'{}')}
    catch{return {}}
  }

  function objectiveLabel(objective){
    return objective?.focus_label||objective?.label||objective?.domain_id||'現在の処方判断';
  }

  function finiteOrNull(x){
    if(x===null||x===undefined||x==='')return null;
    const n=Number(x);
    return Number.isFinite(n)?n:null;
  }

  function percent(x){
    const n=finiteOrNull(x);
    return n===null?'—':`${Math.round(100*n)}%`;
  }

  function percentagePointDelta(x){
    const n=finiteOrNull(x);
    if(n===null)return '—';
    const p=Math.round(100*n);
    return `${p>=0?'+':''}${p}pt`;
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
    else if(objective.selection_reason==='longitudinal'){
      const recent=objective.longitudinal_recent_rate??objective.source_rate;
      const reference=objective.longitudinal_reference_rate;
      const delta=objective.longitudinal_delta;
      reason=`最近3症例で${objectiveLabel(objective)}の問題が${percent(recent)}（それ以前 ${percent(reference)}、差 ${percentagePointDelta(delta)}）に増えています。次症例ではこの処方傾向を重点練習し、改善したかを症例終了時に確認します。`;
    }
    else if(objective.selection_reason==='recurrent'&&recurrentN>0)reason=`過去${recurrentN}症例でも出た反復弱点です。単発の誤差より、繰り返す処方傾向の修正を優先します。`;
    return {label:objectiveLabel(objective),reason,streak:Number(run?.improvement_streak)||0,adaptive:true};
  }

  function removePreview(){
    const d=doc();
    d?.querySelector?.('#'+PREVIEW_ID)?.remove?.();
    return true;
  }

  function renderPreview(dataArg){
    removePreview();
    return nextChallengeModel(dataArg);
  }

  function startNextCase(){
    if(typeof root?.startGenerated!=='function')return false;
    root.startGenerated();
    try{root.WardCaseDebrief?.refresh?.()}catch(e){console.error('case transition debrief refresh',e)}
    scheduleCaseStartNavigation();
    return true;
  }

  function ensureCta(){
    const d=doc();
    if(!d)return null;
    const body=d.querySelector('#caseDebriefBody');
    if(!body)return null;
    removePreview();
    let btn=body.querySelector('#'+CTA_ID);
    if(btn)return btn;
    btn=d.createElement('button');
    btn.id=CTA_ID;
    btn.className='next-btn';
    btn.type='button';
    btn.textContent='次の重点症例へ';
    btn.title='Enter または N キーで次の重点症例を開始できます';
    btn.style.marginTop='10px';
    btn.addEventListener('click',startNextCase);
    body.appendChild(btn);
    return btn;
  }

  function isTypingTarget(target){
    const tag=String(target?.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||tag==='select'||Boolean(target?.isContentEditable);
  }

  function isNativeActivationTarget(target){
    const tag=String(target?.tagName||'').toLowerCase();
    return tag==='button'||tag==='a';
  }

  function handleKeydown(event){
    if(!event||event.ctrlKey||event.altKey||event.metaKey||isTypingTarget(event.target))return false;
    const key=String(event.key||'').toLowerCase();
    if(key!=='n'&&key!=='enter')return false;
    if(key==='enter'&&isNativeActivationTarget(event.target))return false;
    const d=doc();
    const s=root?.state||(typeof state!=='undefined'?state:null);
    const btn=d?.querySelector?.('#'+CTA_ID);
    if(!s?.over||!btn)return false;
    event.preventDefault?.();
    const started=startNextCase();
    if(started)schedulePreferredDoseFocus();
    return started;
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
        const btn=ensureCta();
        removePreview();
        if(original)original.style.display='none';
        if(btn&&!btn.dataset?.throughputFocused){
          try{btn.focus?.({preventScroll:true});if(btn.dataset)btn.dataset.throughputFocused='1'}catch{}
        }
      }else{
        if(original)original.style.display='';
        d.querySelector('#'+CTA_ID)?.remove();
        removePreview();
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
    if(!d.documentElement?.dataset?.caseTransitionHotkeyMounted){
      d.addEventListener?.('keydown',handleKeydown);
      if(d.documentElement?.dataset)d.documentElement.dataset.caseTransitionHotkeyMounted='1';
    }
    refresh();
  }

  const api={ensureCta,refresh,mount,navigateCaseStart,scheduleCaseStartNavigation,schedulePreferredDoseFocus,loadLearningData,objectiveLabel,finiteOrNull,percent,percentagePointDelta,nextChallengeModel,renderPreview,removePreview,startNextCase,isTypingTarget,isNativeActivationTarget,handleKeydown,version:'1.8.0'};
  if(root)root.CaseTransitionCta=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  const d=doc();
  if(d){
    if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
