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
    // At a new-case boundary, PrescriptionDecisionStrip can already mirror the
    // prospective learning focus beside the first dose inputs. Prefer that
    // integrated surface so the learner does not have to read a separate focus
    // card and then scroll again before prescribing. If the strip has not
    // mounted/settled, keep the dedicated focus card as the graceful fallback.
    const strip=document.querySelector(DECISION_STRIP_SELECTOR);
    if(visible(strip))return moveToElement(strip);
    const focus=document.querySelector(LEARNING_FOCUS_SELECTOR);
    if(visible(focus))return moveTo(LEARNING_FOCUS_SELECTOR);
    return moveToPrescriptionContext();
  }

  function focusResultAction(){
    try{return root?.DoseAdjustControls?.focusResultAction?.()||false}
    catch(e){console.error('repeat-play result action focus',e);return false}
  }

  function focusPreferredDose(){
    try{return root?.DoseAdjustControls?.focusPreferredDose?.()||false}
    catch(e){console.error('repeat-play preferred dose focus',e);return false}
  }

  function afterSubmit(){
    // Submit aftermath has one owner for every activation path (mouse, touch,
    // Enter, Ctrl/Cmd+Enter): first move to the compact result summary, then
    // place keyboard focus on the canonical next action. Keeping both effects
    // in one deferred task prevents a disabled submit button from retaining
    // focus after pointer submission and avoids duplicate timers in dose input
    // helpers.
    setTimeout(()=>{
      moveToResultReview();
      focusResultAction();
    },0);
  }

  function afterDayAdvance(){
    // Day advance is one atomic throughput handoff, matching the case-boundary
    // contract below. Wait once for app.js plus compact mirrors to render the
    // new day's decision state, then move and focus in a deterministic order.
    // DoseAdjustControls keeps only a fallback for older/partial embeddings so
    // the mounted app never has competing scroll/focus timers.
    setTimeout(()=>{
      moveToPrescriptionContext();
      focusPreferredDose();
    },0);
    return true;
  }

  function afterCaseStart(){
    // A case boundary is likewise one atomic throughput handoff. Wait once for
    // regenerated DOM + compact mirrors, then move to the integrated decision
    // surface and select the dose input mapped to the canonical learning focus.
    // This replaces competing navigation/focus timers with one ordered task.
    setTimeout(()=>{
      moveToCaseStartContext();
      focusPreferredDose();
    },0);
    return true;
  }

  function onClick(event){
    const id=event?.target?.id;
    if(id==='submitBtn'){
      afterSubmit();
      return;
    }
    if(id==='nextDayBtn'){
      afterDayAdvance();
      return;
    }
    if(id==='restartBtn'){
      // Legacy restart remains compatible when the canonical terminal CTA is
      // unavailable. CaseTransitionCta owns its normal case-start handoff.
      afterCaseStart();
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
    focusResultAction,
    focusPreferredDose,
    prescriptionDecisionTarget,
    resultReviewTarget,
    afterSubmit,
    afterDayAdvance,
    afterCaseStart,
    onClick,
    mount,
    targetSelector:PRESCRIPTION_SELECTOR,
    decisionStripSelector:DECISION_STRIP_SELECTOR,
    orderCardSelector:ORDER_CARD_SELECTOR,
    learningFocusSelector:LEARNING_FOCUS_SELECTOR,
    resultGlanceSelector:RESULT_GLANCE_SELECTOR,
    version:'1.8.0'
  };
  if(root)root.RepeatPlayNavigation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
