(function(root){
  const PRESCRIPTION_SELECTOR='#prescriptionContext';
  const LEARNING_FOCUS_SELECTOR='#learningFocus';

  function visible(el){
    if(!el)return false;
    return !el.classList?.contains?.('hidden');
  }

  function moveTo(selector){
    if(typeof document==='undefined')return false;
    const target=document.querySelector(selector);
    if(!target||typeof target.scrollIntoView!=='function')return false;
    // Repeat-play is a throughput path. Use an immediate jump so any legacy
    // smooth-scroll started by app.js is cancelled instead of competing with
    // navigation to the next decision-relevant card.
    target.scrollIntoView({behavior:'auto',block:'start'});
    return true;
  }

  function moveToPrescriptionContext(){
    return moveTo(PRESCRIPTION_SELECTOR);
  }

  function moveToCaseStartContext(){
    if(typeof document==='undefined')return false;
    const focus=document.querySelector(LEARNING_FOCUS_SELECTOR);
    if(visible(focus))return moveTo(LEARNING_FOCUS_SELECTOR);
    return moveToPrescriptionContext();
  }

  function onClick(event){
    const id=event?.target?.id;
    if(id==='nextDayBtn'){
      // Within the same case, keep throughput high and return directly to the
      // current four-point context rather than replaying the case-level focus.
      moveToPrescriptionContext();
      return;
    }
    if(id==='restartBtn'){
      // A new case may carry a prospective learning objective from the prior
      // debrief. Surface it once at the case boundary before the first order.
      moveToCaseStartContext();
    }
  }

  function mount(){
    if(typeof document==='undefined'||document.documentElement?.dataset?.repeatPlayNavigationMounted)return;
    if(document.documentElement)document.documentElement.dataset.repeatPlayNavigationMounted='1';
    document.addEventListener('click',onClick);
  }

  const api={
    moveToPrescriptionContext,
    moveToCaseStartContext,
    onClick,
    mount,
    targetSelector:PRESCRIPTION_SELECTOR,
    learningFocusSelector:LEARNING_FOCUS_SELECTOR,
    version:'1.2.0'
  };
  if(root)root.RepeatPlayNavigation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
