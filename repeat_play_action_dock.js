(function(root){
  const DOCK_ID='repeatPlayActionDock';
  const BUTTON_ID='repeatPlayActionButton';
  const FEEDBACK_ID='repeatPlayActionFeedback';

  function doc(){return root?.document||(typeof document!=='undefined'?document:null)}
  function visible(el){
    if(!el)return false;
    if(el.hidden||el.disabled)return false;
    if(el.classList?.contains?.('hidden'))return false;
    if(el.style?.display==='none')return false;
    if(el.getAttribute?.('aria-hidden')==='true')return false;
    return true;
  }

  function actionTarget(){
    const d=doc();
    if(!d)return null;
    const panel=d.querySelector('#resultPanel');
    const resultVisible=visible(panel);
    if(resultVisible){
      // Terminal debrief replaces the legacy restart button with caseNextCta.
      // Prefer the visible canonical CTA and only fall back to legacy controls.
      return [
        d.querySelector('#caseNextCta'),
        panel.querySelector('#nextDayBtn'),
        panel.querySelector('#restartBtn')
      ].find(visible)||null;
    }
    // During prescription entry, proxy the canonical submit button as well.
    // This removes the mobile-only scroll to the bottom of the order card while
    // keeping app.js as the sole owner of validation/simulation/state changes.
    const submit=d.querySelector('#submitBtn');
    return visible(submit)?submit:null;
  }

  function feedbackAlreadyInResultGlance(){
    const d=doc();
    if(!d)return false;
    const panel=d.querySelector('#resultPanel');
    if(!visible(panel))return false;
    const glance=panel.querySelector('.result-glance');
    const primary=glance?.querySelector('.daily-feedback .feedback-primary');
    return visible(glance)&&visible(primary);
  }

  function prescriptionMealContext(){
    const d=doc();
    if(!d)return '';
    const panel=d.querySelector('#resultPanel');
    if(visible(panel))return '';
    const grid=d.querySelector('#todayMealGrid');
    if(!grid)return '';
    const cards=[...grid.querySelectorAll('.meal-card')];
    if(!cards.length)return '';
    const items=cards.map(card=>{
      const name=card.querySelector('.name')?.textContent?.replace(/食$/,'')?.trim()||'';
      const pct=card.querySelector('.pct')?.textContent?.trim()||'';
      return name&&pct?`${name}${pct}`:'';
    }).filter(Boolean);
    return items.length?`今日の食事 ${items.join(' / ')}`:'';
  }

  function primaryFeedbackText(){
    const d=doc();
    if(!d)return '';
    const panel=d.querySelector('#resultPanel');
    if(!visible(panel))return prescriptionMealContext();
    if(!panel.querySelector('#nextDayBtn'))return '';
    // The compact result card now owns the normal result-review teaching text.
    // Repeating the same sentence in the fixed dock consumes scarce mobile
    // viewport height. Keep the dock copy only as a graceful fallback if the
    // one-card integration did not mount or could not move the feedback.
    if(feedbackAlreadyInResultGlance())return '';
    const primary=panel.querySelector('.daily-feedback .feedback-primary');
    const text=primary?.textContent?.replace(/\s+/g,' ')?.trim()||'';
    return text;
  }

  function ensureStyle(){
    const d=doc();
    if(!d||d.getElementById('repeatPlayActionDockStyle'))return;
    const style=d.createElement('style');
    style.id='repeatPlayActionDockStyle';
    style.textContent=`#${DOCK_ID}{display:none}@media(max-width:700px){#${DOCK_ID}{position:fixed;z-index:1000;left:0;right:0;bottom:0;padding:8px max(12px,env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(242,244,247,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(120,128,140,.18)}#${DOCK_ID}.active{display:block}#${FEEDBACK_ID}{display:none;margin:0 2px 7px;font-size:13px;line-height:1.35;font-weight:750;color:#3f4650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#${DOCK_ID}.has-feedback #${FEEDBACK_ID}{display:block}#${BUTTON_ID}{width:100%;min-height:48px;margin:0}.app-shell.repeat-play-dock-active{padding-bottom:74px}.app-shell.repeat-play-dock-active.repeat-play-dock-feedback-active{padding-bottom:100px}.app-shell.repeat-play-dock-active .repeat-play-meal-source{display:none}.app-shell.repeat-play-dock-active #submitBtn,.app-shell.repeat-play-dock-active #nextDayBtn,.app-shell.repeat-play-dock-active #restartBtn,.app-shell.repeat-play-dock-active #caseNextCta{display:none!important}}`;
    d.head.appendChild(style);
  }

  function ensureDock(){
    const d=doc();
    if(!d)return null;
    let dock=d.getElementById(DOCK_ID);
    if(dock)return dock;
    dock=d.createElement('div');
    dock.id=DOCK_ID;
    dock.setAttribute('aria-live','polite');
    const feedback=d.createElement('div');
    feedback.id=FEEDBACK_ID;
    feedback.setAttribute('aria-label','現在の判断材料');
    const btn=d.createElement('button');
    btn.id=BUTTON_ID;
    btn.type='button';
    btn.className='primary-btn';
    btn.addEventListener('click',()=>{
      const target=actionTarget();
      if(!target)return refresh();
      target.click();
      // Let the canonical handler finish rendering the next decision state
      // before deciding whether the dock should remain visible or change role.
      setTimeout(refresh,0);
    });
    dock.appendChild(feedback);
    dock.appendChild(btn);
    d.body.appendChild(dock);
    return dock;
  }

  function refresh(){
    const d=doc();
    if(!d)return false;
    ensureStyle();
    const dock=ensureDock();
    const btn=d.getElementById(BUTTON_ID);
    const feedback=d.getElementById(FEEDBACK_ID);
    const shell=d.querySelector('.app-shell');
    const target=actionTarget();
    if(!dock||!btn||!feedback)return false;
    if(!target){
      dock.classList.remove('active','has-feedback');
      shell?.classList?.remove?.('repeat-play-dock-active','repeat-play-dock-feedback-active');
      btn.textContent='';
      feedback.textContent='';
      return false;
    }
    const feedbackText=primaryFeedbackText();
    btn.textContent=target.textContent?.trim()||'次へ';
    btn.setAttribute('aria-label',btn.textContent);
    feedback.textContent=feedbackText;
    dock.classList.toggle('has-feedback',Boolean(feedbackText));
    dock.classList.add('active');
    shell?.classList?.add?.('repeat-play-dock-active');
    shell?.classList?.toggle?.('repeat-play-dock-feedback-active',Boolean(feedbackText));
    return true;
  }

  function mount(){
    const d=doc();
    if(!d||d.documentElement?.dataset?.repeatPlayActionDockMounted)return;
    if(d.documentElement)d.documentElement.dataset.repeatPlayActionDockMounted='1';
    ensureStyle();
    ensureDock();
    const submit=d.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',()=>setTimeout(refresh,0));
    const mealGrid=d.querySelector('#todayMealGrid');
    mealGrid?.closest?.('.record-card')?.classList?.add?.('repeat-play-meal-source');
    if(mealGrid&&typeof MutationObserver!=='undefined')new MutationObserver(refresh).observe(mealGrid,{childList:true,subtree:true,characterData:true});
    d.addEventListener('click',event=>{
      const id=event?.target?.id;
      if(['nextDayBtn','restartBtn','caseNextCta','newCaseBtn'].includes(id))setTimeout(refresh,0);
    });
    refresh();
  }

  const api={actionTarget,feedbackAlreadyInResultGlance,prescriptionMealContext,primaryFeedbackText,refresh,mount,version:'1.6.0',dockId:DOCK_ID,buttonId:BUTTON_ID,feedbackId:FEEDBACK_ID};
  if(root)root.RepeatPlayActionDock=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  const d=doc();
  if(d){
    if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
