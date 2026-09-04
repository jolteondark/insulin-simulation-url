(function(root){
  const PRESCRIPTION_SELECTOR='#prescriptionContext';
  const DECISION_STRIP_SELECTOR='#prescriptionDecisionStrip';
  const ORDER_CARD_SELECTOR='.order-card';
  const LEARNING_FOCUS_SELECTOR='#learningFocus';
  const RESULT_GLANCE_SELECTOR='#resultPanel .result-glance';
  const RESULT_PANEL_SELECTOR='#resultPanel';

  function visible(el){
    if(!el)return false;
    if(el.hidden||el.classList?.contains?.('hidden'))return false;
    if(el.getAttribute?.('aria-hidden')==='true')return false;
    if(el.style?.display==='none')return false;
    return true;
  }

  function moveToElement(target){
    if(!target||typeof target.scrollIntoView!=='function')return false;
    // Repeat-play is a throughput path. Use an immediate jump so any legacy
    // smooth-scroll started by app.js is cancelled instead of competing with
    // navigation to the next decision-relevant card.
    target.scrollIntoView({behavior:'auto',block:'start'});
    return true;
  }

  function moveTo(selector){
    if(typeof document==='undefined')return false;
    return moveToElement(document.querySelector(selector));
  }

  function prescriptionDecisionTarget(){
    if(typeof document==='undefined')return null;
    // The compact decision strip is the preferred repeat-play destination.
    // It contains the decision-critical four-point/context/meal/previous-dose
    // summary immediately beside the dose inputs. The legacy source card may
    // be display:none once PrescriptionDecisionStrip compacts the page, so do
    // not target it blindly after advancing a day.
    for(const selector of [DECISION_STRIP_SELECTOR,PRESCRIPTION_SELECTOR,ORDER_CARD_SELECTOR]){
      const target=document.querySelector(selector);
      if(visible(target))return target;
    }
    return null;
  }

  function resultReviewTarget(){
    if(typeof document==='undefined')return null;
    const glance=document.querySelector(RESULT_GLANCE_SELECTOR);
    if(visible(glance))return glance;
    const panel=document.querySelector(RESULT_PANEL_SELECTOR);
    return visible(panel)?panel:null;
  }

  function moveToPrescriptionContext(){
    return moveToElement(prescriptionDecisionTarget());
  }

  function moveToResultReview(){
    return moveToElement(resultReviewTarget());
  }

  function moveToCaseStartContext(){
    if(typeof document==='undefined')return false;
    const focus=document.querySelector(LEARNING_FOCUS_SELECTOR);
    if(visible(focus))return moveTo(LEARNING_FOCUS_SELECTOR);
    return moveToPrescriptionContext();
  }

  function afterSubmit(){
    // The canonical submit handler renders resultPanel synchronously today,
    // while result-glance is injected by a sibling listener. Defer one task so
    // navigation always sees the compact summary when available and falls back
    // to the result panel if rendering order changes later.
    setTimeout(moveToResultReview,0);
  }

  function onClick(event){
    const id=event?.target?.id;
    if(id==='submitBtn'){
      afterSubmit();
      return;
    }
    if(id==='nextDayBtn'){
      // Within the same case, keep throughput high and return directly to the
      // visible prescription decision surface rather than a compacted source
      // card or the case-level focus.
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
    moveToResultReview,
    moveToCaseStartContext,
    prescriptionDecisionTarget,
    resultReviewTarget,
    afterSubmit,
    onClick,
    mount,
    targetSelector:PRESCRIPTION_SELECTOR,
    decisionStripSelector:DECISION_STRIP_SELECTOR,
    orderCardSelector:ORDER_CARD_SELECTOR,
    learningFocusSelector:LEARNING_FOCUS_SELECTOR,
    resultGlanceSelector:RESULT_GLANCE_SELECTOR,
    version:'1.4.0'
  };
  if(root)root.RepeatPlayNavigation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
