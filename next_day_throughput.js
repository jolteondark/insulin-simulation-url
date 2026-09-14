// Keep the repeated-day loop anchored on the compact prescription area.
(function(){
  const MODULE='next-day-throughput';
  const RESPONSE_CLASS='feedback-action-response';

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

  function visibleSubmitButton(){
    const btn=document.getElementById('submitBtn');
    if(!btn||btn.disabled||btn.offsetParent===null)return null;
    return btn;
  }

  function submitCurrentOrder(event){
    const btn=visibleSubmitButton();
    // Never let the prescription shortcut compete with a rendered next-day CTA.
    // This keeps the key contract state-specific even if stale DOM briefly keeps
    // the submit button mounted while the result surface is becoming active.
    if(!btn||visibleNextDayButton())return false;
    event.preventDefault();
    btn.click();
    return true;
  }

  function handleShortcut(event){
    if(event.defaultPrevented||event.repeat||event.altKey)return false;
    const key=String(event.key||'').toLowerCase();

    // Deliberately require a modifier for prescribing. Plain Enter remains a
    // result/navigation shortcut and must never become an accidental dose submit.
    if(key==='enter'&&(event.ctrlKey||event.metaKey))return submitCurrentOrder(event);
    if(event.ctrlKey||event.metaKey)return false;

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

  function installSubmitShortcutHint(){
    const btn=document.getElementById('submitBtn');
    if(!btn)return false;
    btn.setAttribute?.('aria-keyshortcuts','Control+Enter Meta+Enter');
    const hint='Ctrl/⌘+Enterで処方を確定';
    if(!String(btn.title||'').includes(hint))btn.title=[btn.title,hint].filter(Boolean).join(' · ');
    return true;
  }

  // Presentation wrapper around the canonical feedback-action semantics. This is
  // not a dosing rule: the shared module only checks whether the learner changed
  // the already-selected target in the already-selected feedback direction.
  function classifyDoseResponse(current,previous,direction){
    const response=window.WardFeedbackActionSemantics?.classifyDelta?.(current,previous,direction);
    if(!response)return null;
    const delta=response.delta;
    if(response.status==='unchanged')return {status:'unchanged',delta:0,text:'未変更'};
    const signed=`${delta>0?'+':''}${Number.isInteger(delta)?delta:delta.toFixed(1)} U`;
    return {status:response.status,delta,text:response.status==='followed'?`反映 ${signed} ✓`:`逆方向 ${signed}`};
  }

  function clearFeedbackResponse(){
    document.querySelectorAll?.('.'+RESPONSE_CLASS).forEach(el=>el.remove());
  }

  function updateFeedbackResponseElement(el,response){
    if(!el||!response)return false;
    let changed=false;
    if(el.dataset.status!==response.status){el.dataset.status=response.status;changed=true;}
    // The decision strip observer also watches this subtree. Avoid rewriting the
    // same text on every observer callback; otherwise our own textContent write
    // can continuously enqueue another render microtask while the strip is idle.
    if(el.textContent!==response.text){el.textContent=response.text;changed=true;}
    return changed;
  }

  function renderFeedbackResponse(){
    const feedback=document.querySelector?.('#prescriptionDecisionStrip .decision-strip-feedback');
    const targetInfo=window.ActionableDoseTarget?.currentTarget?.();
    const input=targetInfo?.inputId?document.getElementById(targetInfo.inputId):null;
    const response=classifyDoseResponse(input?.value,input?.dataset?.previousScheduledDose,targetInfo?.direction);
    if(!feedback||!response){clearFeedbackResponse();return null;}
    let el=feedback.querySelector?.('.'+RESPONSE_CLASS);
    if(!el){
      el=document.createElement('span');
      el.className=RESPONSE_CLASS;
      feedback.appendChild(el);
    }
    updateFeedbackResponseElement(el,response);
    return response;
  }

  function installFeedbackResponseStyle(){
    if(document.getElementById('feedbackActionResponseStyle'))return;
    const style=document.createElement('style');
    style.id='feedbackActionResponseStyle';
    style.textContent=`
      .${RESPONSE_CLASS}{display:inline-flex;width:max-content;margin-left:8px;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:850;white-space:nowrap;background:#fff;border:1px solid currentColor}
      .${RESPONSE_CLASS}[data-status="unchanged"]{opacity:.62}
      .${RESPONSE_CLASS}[data-status="opposite"]{text-decoration:underline;text-underline-offset:2px}
      @media(max-width:430px){.${RESPONSE_CLASS}{display:flex;margin:5px 0 0}}
    `;
    document.head?.appendChild(style);
  }

  function bindFeedbackResponse(){
    installFeedbackResponseStyle();
    renderFeedbackResponse();
    const grid=document.getElementById('doseGrid');
    if(grid&&!grid.dataset.feedbackActionResponseBound){
      grid.dataset.feedbackActionResponseBound='1';
      grid.addEventListener('input',renderFeedbackResponse);
    }
    const strip=document.getElementById('prescriptionDecisionStrip');
    if(strip&&typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>queueMicrotask(renderFeedbackResponse)).observe(strip,{subtree:true,childList:true,characterData:true});
    }
  }

  function boot(){
    installSubmitShortcutHint();
    bindFeedbackResponse();
    const panel=document.getElementById('resultPanel');
    if(panel){
      const canonicalNavigationAvailable=!!window.RepeatPlayNavigation?.moveToPrescriptionContext;
      if(!canonicalNavigationAvailable){
        bindFallbackNextDayButton();
        new MutationObserver(bindFallbackNextDayButton).observe(panel,{subtree:true,childList:true});
      }
    }
    document.addEventListener('keydown',handleShortcut);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.NextDayThroughput={target,returnToPrescription,bindFallbackNextDayButton,typingTarget,interactiveTarget,visibleNextDayButton,visibleSubmitButton,submitCurrentOrder,handleShortcut,installSubmitShortcutHint,classifyDoseResponse,updateFeedbackResponseElement,renderFeedbackResponse,bindFeedbackResponse,version:'1.8.0',module:MODULE};
})();
