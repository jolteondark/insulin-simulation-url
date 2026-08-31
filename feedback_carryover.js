(function(root){
  function latestCarryover(){
    try{
      if(typeof state==='undefined'||!state||state.over||!Array.isArray(state.history)||!state.history.length)return null;
      const rec=state.history[state.history.length-1];
      if(!rec?.education_feedback?.primary_text)return null;
      if(Number(rec.day)>=Number(state.day))return null;
      return {
        day:Number(rec.day),
        tag:rec.education_feedback.primary_tag||null,
        text:String(rec.education_feedback.primary_text)
      };
    }catch{return null}
  }

  function render(){
    if(typeof document==='undefined')return;
    const el=document.querySelector('#previousFeedback');
    if(!el)return;
    const body=el.querySelector('#previousFeedbackBody');
    const carry=latestCarryover();
    if(!carry){el.classList.add('hidden');if(body)body.textContent='';return;}
    if(body)body.textContent=carry.text;
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
    if(newCase)newCase.addEventListener('click',render);
  }

  const api={latestCarryover,render,version:'1.0.0'};
  if(root)root.FeedbackCarryover=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
