(function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';

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
    if(carry.source==='previous_case'&&focusVisible)return false;
    return true;
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
    if(body)body.textContent=carry.text;
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

  const api={storedTerminalFeedback,latestCarryover,shouldDisplay,render,version:'1.2.0'};
  if(root)root.FeedbackCarryover=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
