(function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const ROUTING_ONLY_TAG='__active_objective__';
  const conciseByTag={
    basal_excess:'basal：減量方向を再検討',
    basal_deficit:'basal：増量方向を再検討',
    breakfast_rapid_excess:'朝rapid：減量方向を再検討',
    breakfast_rapid_deficit:'朝rapid：増量方向を再検討',
    lunch_rapid_excess:'昼rapid：減量方向を再検討',
    lunch_rapid_deficit:'昼rapid：増量方向を再検討',
    dinner_rapid_excess:'夕rapid：減量方向を再検討',
    dinner_rapid_deficit:'夕rapid：増量方向を再検討',
    scale_dependence:'補正scale依存：定時量とscale設定を分けて再検討',
    hidden_low_near_miss:'hidden低血糖：4検だけを見て増量しない',
    hidden_high_excursion:'hidden高血糖：食後高血糖を残していないか確認'
  };

  function storedLearningData(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}
  }

  function storedTerminalFeedback(){
    const data=storedLearningData();
    const x=data?.last_terminal_feedback;
    if(!x?.text)return null;
    return {case_id:x.case_id||null,day:Number(x.day)||null,tag:x.primary_tag||null,text:String(x.text)};
  }

  function activeObjective(){
    return storedLearningData()?.active_objective||null;
  }

  function activeFocusTag(){
    return activeObjective()?.focus_tag||null;
  }

  function routingOnlyCarry(objective,currentCaseId,prior=null){
    if(!objective||objective.source_case_id===currentCaseId)return null;
    return {
      source:'previous_case',
      case_id:objective.source_case_id||prior?.case_id||null,
      day:prior?.day??null,
      tag:objective.focus_tag||ROUTING_ONLY_TAG,
      text:prior?.text||'',
      routing_only:true
    };
  }

  function latestCarryover(){
    try{
      if(typeof state==='undefined'||!state||state.over)return null;
      if(Array.isArray(state.history)&&state.history.length){
        const rec=state.history[state.history.length-1];
        if(!rec?.education_feedback?.primary_text)return null;
        if(Number(rec.day)>=Number(state.day))return null;
        return {
          source:'previous_day',
          day:Number(rec.day),
          tag:rec.education_feedback.primary_tag||null,
          text:String(rec.education_feedback.primary_text)
        };
      }
      if(Number(state.day)!==1)return null;
      const prior=storedTerminalFeedback();
      const currentCaseId=state.case?.case_id||null;
      const priorBelongsToPreviousCase=Boolean(prior?.case_id&&prior.case_id!==currentCaseId);
      if(priorBelongsToPreviousCase&&prior.tag)return prior;
      // The prospective active objective is the canonical case-boundary handoff.
      // Some terminal outcomes have no actionable primary_tag, so requiring a tagged
      // terminal sentence here can break the chain even though routing succeeded.
      // Emit a routing-only carry for downstream dose targeting; the visual carryover
      // card suppresses it so we do not invent or duplicate terminal feedback text.
      const routed=routingOnlyCarry(activeObjective(),currentCaseId,priorBelongsToPreviousCase?prior:null);
      if(routed)return routed;
      if(priorBelongsToPreviousCase)return prior;
      return null;
    }catch{return null}
  }

  function shouldDisplay(carry,focusVisible,focusTag=null){
    if(!carry)return false;
    if(carry.routing_only)return false;
    // A prospective LEARNING FOCUS is already the actionable handoff from the
    // prior debrief. Repeating the old terminal sentence beneath it adds
    // cognitive load without adding a new decision. Keep previous-case
    // feedback only as a fallback when no focus was created.
    if(carry.source==='previous_case'&&focusVisible)return false;
    // On later days, keep yesterday's point unless LEARNING FOCUS is visibly
    // giving the exact same directional instruction. Exact tag matching is
    // deliberate: domain-only matching could hide an opposite-dose warning.
    if(carry.source==='previous_day'&&focusVisible&&carry.tag&&focusTag&&carry.tag===focusTag)return false;
    return true;
  }

  function compactCarryText(carry){
    if(!carry)return '';
    if(carry.tag&&conciseByTag[carry.tag])return conciseByTag[carry.tag];
    try{
      const compact=root?.DailyFeedback?.compactDisplayText;
      if(typeof compact==='function')return compact(carry.text);
    }catch{}
    return String(carry.text||'')
      .replace(/(朝前|昼前|夕前|眠前) \d+ mg\/dL：/g,'')
      .replace(/定時 [\d.]+ U \+ scale [\d.]+ U = 実投与 [\d.]+ Uでした。/g,'')
      .replace(/hidden glucose は \d+ mg\/dL まで低下しました。/g,'hidden低血糖がありました。')
      .replace(/hidden glucose は \d+ mg\/dL まで上昇しました。/g,'hidden高血糖がありました。')
      .replace(/\s{2,}/g,' ')
      .trim();
  }

  function learningFocusVisible(){
    if(typeof document==='undefined')return false;
    const focus=document.querySelector('#learningFocus');
    return Boolean(focus&&!focus.classList?.contains?.('hidden'));
  }

  function render(){
    if(typeof document==='undefined')return;
    const el=document.querySelector('#previousFeedback');
    if(!el)return;
    const body=el.querySelector('#previousFeedbackBody');
    const title=el.querySelector('.learning-focus-title');
    const kicker=el.querySelector('.learning-focus-kicker');
    const carry=latestCarryover();
    if(!shouldDisplay(carry,learningFocusVisible(),activeFocusTag())){
      el.classList.add('hidden');
      if(body)body.textContent='';
      return;
    }
    if(body)body.textContent=compactCarryText(carry);
    if(carry.source==='previous_case'){
      if(title)title.textContent='前症例の1点';
      if(kicker)kicker.textContent='CASE → NEXT CASE';
    }else{
      if(title)title.textContent='前日の1点';
      if(kicker)kicker.textContent='YESTERDAY → TODAY';
    }
    el.classList.remove('hidden');
  }

  function mount(){
    if(typeof document==='undefined')return;
    render();
    const result=document.querySelector('#resultPanel');
    if(result&&!result.dataset.feedbackCarryoverMounted){
      result.dataset.feedbackCarryoverMounted='1';
      result.addEventListener('click',event=>{
        if(event.target?.closest?.('#nextDayBtn,#restartBtn'))render();
      });
    }
    const newCase=document.querySelector('#newCaseBtn');
    if(newCase)newCase.addEventListener('click',()=>queueMicrotask(render));
  }

  const api={storedTerminalFeedback,activeObjective,activeFocusTag,routingOnlyCarry,latestCarryover,shouldDisplay,compactCarryText,render,ROUTING_ONLY_TAG,version:'1.6.0'};
  if(root)root.FeedbackCarryover=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
