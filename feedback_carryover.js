(function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
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

  function storedTerminalFeedback(){
    try{
      const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      const x=data?.last_terminal_feedback;
      if(!x?.text)return null;
      return {case_id:x.case_id||null,day:Number(x.day)||null,tag:x.primary_tag||null,text:String(x.text)};
    }catch{return null}
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
      if(!prior||!prior.case_id||prior.case_id===currentCaseId)return null;
      return {...prior,source:'previous_case'};
    }catch{return null}
  }

  function shouldDisplay(carry,focusVisible){
    if(!carry)return false;
    // A prospective LEARNING FOCUS is already the actionable handoff from the
    // prior debrief. Repeating the old terminal sentence beneath it adds
    // cognitive load without adding a new decision. Keep previous-case
    // feedback only as a fallback when no focus was created.
    if(carry.source==='previous_case'&&focusVisible)return false;
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
    if(!shouldDisplay(carry,learningFocusVisible())){
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

  const api={storedTerminalFeedback,latestCarryover,shouldDisplay,compactCarryText,render,version:'1.3.0'};
  if(root)root.FeedbackCarryover=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
