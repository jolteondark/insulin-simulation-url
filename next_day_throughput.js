// Keep the repeated-day loop anchored on the compact prescription area.
(function(){
  const MODULE='next-day-throughput';

  function target(){
    return document.getElementById('prescriptionDecisionStrip')
      || document.getElementById('doseGrid')?.closest('.order-card')
      || document.getElementById('doseGrid');
  }

  function returnToPrescription(){
    // RepeatPlayNavigation owns repeat-play positioning. Reuse it when present
    // so next-day flow has one navigation policy.
    const nav=window.RepeatPlayNavigation;
    if(nav?.moveToPrescriptionContext)return nav.moveToPrescriptionContext();
    const el=target();
    if(!el)return false;
    el.scrollIntoView({behavior:'auto',block:'start'});
    return true;
  }

  function bindFallbackNextDayButton(){
    // The canonical RepeatPlayNavigation click delegate handles dynamically
    // rendered next-day buttons. Do not attach a second direct click listener
    // when that delegate is available, otherwise one click scrolls twice.
    if(window.RepeatPlayNavigation?.moveToPrescriptionContext)return false;
    const btn=document.getElementById('nextDayBtn');
    if(!btn||btn.dataset.nextDayThroughputFallbackBound==='1')return false;
    btn.dataset.nextDayThroughputFallbackBound='1';
    btn.addEventListener('click',returnToPrescription);
    return true;
  }

  function typingTarget(el){
    if(!el)return false;
    const tag=String(el.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||tag==='select'||el.isContentEditable===true;
  }

  function interactiveTarget(el){
    if(!el)return false;
    if(typingTarget(el))return true;
    const tag=String(el.tagName||'').toLowerCase();
    return tag==='button'||tag==='a'||el.getAttribute?.('role')==='button';
  }

  function visibleNextDayButton(){
    const btn=document.getElementById('nextDayBtn');
    if(!btn||btn.disabled)return null;
    // offsetParent can be null for the canonical mobile CTA because the fixed
    // repeat-play dock intentionally hides it while proxying the same action.
    // In that state, let the dock/native focus path own keyboard activation.
    if(btn.offsetParent===null)return null;
    return btn;
  }

  function handleShortcut(event){
    if(event.defaultPrevented||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return false;
    const key=String(event.key||'').toLowerCase();
    const btn=visibleNextDayButton();
    if(!btn)return false;

    // N remains an explicit power-user shortcut. Enter is the zero-learning-cost
    // path after reading a result: only claim it when focus is not already on an
    // interactive element, otherwise native button/link/input behavior wins.
    const isN=key==='n'&&!typingTarget(event.target);
    const isEnter=key==='enter'&&!interactiveTarget(event.target);
    if(!isN&&!isEnter)return false;

    event.preventDefault();
    // Click the real CTA so keyboard and pointer activation share the canonical
    // navigation/state path and ActionableDoseTarget can focus the next dose.
    btn.click();
    return true;
  }

  function boot(){
    const panel=document.getElementById('resultPanel');
    if(!panel)return;
    const canonicalNavigationAvailable=!!window.RepeatPlayNavigation?.moveToPrescriptionContext;
    if(!canonicalNavigationAvailable){
      bindFallbackNextDayButton();
      new MutationObserver(bindFallbackNextDayButton).observe(panel,{subtree:true,childList:true});
    }
    document.addEventListener('keydown',handleShortcut);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.NextDayThroughput={target,returnToPrescription,bindFallbackNextDayButton,typingTarget,interactiveTarget,visibleNextDayButton,handleShortcut,version:'1.4.0',module:MODULE};
})();
