// One-tap +/-1 U and +/-2 U controls plus keyboard-first repeat-play dosing.
// Keeps app.js as the source of prescription state; this module only edits/focuses visible controls.
(function(){
  const GRID_ID='doseGrid';
  const MIN=0;
  const MAX=80;
  const STEPS=[-2,-1,1,2];

  function clampDose(value){
    const n=Number(value);
    if(!Number.isFinite(n))return MIN;
    return Math.max(MIN,Math.min(MAX,Math.round(n)));
  }

  function focusElement(el){
    if(!el||typeof el.focus!=='function')return false;
    el.focus({preventScroll:true});
    return true;
  }

  function isUsableAction(el){
    if(!el||el.disabled||el.hidden)return false;
    if(el.classList?.contains?.('hidden'))return false;
    if(el.style?.display==='none'||el.getAttribute?.('aria-hidden')==='true')return false;
    return true;
  }

  function focusFirstDose(){
    return focusElement(document.querySelector(`#${GRID_ID} input[type="number"][id^="dose_"]`));
  }

  function focusResultAction(){
    // Terminal flow replaces restartBtn with caseNextCta. Prefer the visible CTA
    // and never strand keyboard users on the hidden legacy restart button.
    const candidates=[
      document.getElementById('caseNextCta'),
      document.getElementById('nextDayBtn'),
      document.getElementById('restartBtn'),
      document.querySelector('#resultPanel button.next-btn')
    ];
    return focusElement(candidates.find(isUsableAction));
  }

  function adjust(input,delta,{focusAfter=true}={}){
    input.value=String(clampDose(Number(input.value)+delta));
    input.dispatchEvent(new Event('input',{bubbles:true}));
    if(focusAfter)focusElement(input);
  }

  function shouldRefocusInput(event){
    // Pointer/touch-generated clicks have a positive click count. Do not move
    // focus into the numeric input in that path: mobile browsers may open the
    // soft keyboard and shift the viewport after every +/- tap. Keyboard or
    // programmatic activation keeps the existing input-focus behavior.
    return !(Number(event?.detail)>0);
  }

  function submitFromDoseInput(event){
    if(event.key!=='Enter'||event.isComposing)return;
    const submit=document.getElementById('submitBtn');
    if(!submit||submit.disabled)return;
    event.preventDefault();
    submit.click();
    // app.js and education modules update the result panel synchronously.
    // Move keyboard focus to the resulting action without changing scroll.
    setTimeout(focusResultAction,0);
  }

  function stepLabel(delta){
    return `${delta>0?'+':''}${delta}`;
  }

  function decorateCard(card){
    if(card.dataset.quickAdjustReady==='1')return;
    const input=card.querySelector('input[type="number"][id^="dose_"]');
    if(!input)return;
    input.addEventListener('keydown',submitFromDoseInput);
    input.setAttribute('title','Enterでこの処方を実行');
    const controls=document.createElement('div');
    controls.className='dose-quick-adjust';
    controls.setAttribute('aria-label','投与量をすばやく調整');
    for(const delta of STEPS){
      const button=document.createElement('button');
      button.type='button';
      button.className=`dose-step-btn ${Math.abs(delta)===2?'dose-step-major':''}`;
      button.textContent=stepLabel(delta);
      button.setAttribute('aria-label',`${Math.abs(delta)}単位${delta<0?'減らす':'増やす'}`);
      button.addEventListener('click',(event)=>adjust(input,delta,{focusAfter:shouldRefocusInput(event)}));
      controls.appendChild(button);
    }
    card.appendChild(controls);
    card.dataset.quickAdjustReady='1';
  }

  function decorate(){
    const grid=document.getElementById(GRID_ID);
    if(!grid)return;
    grid.querySelectorAll('.dose-input-card').forEach(decorateCard);
  }

  function onDocumentClick(event){
    const id=event?.target?.id;
    if(!['nextDayBtn','caseNextCta','restartBtn'].includes(id))return;
    // The destination state is rendered before the click bubbles here. Defer
    // once so navigation can position the page, then return focus to dosing.
    setTimeout(focusFirstDose,0);
  }

  function installStyles(){
    if(document.getElementById('doseQuickAdjustStyle'))return;
    const style=document.createElement('style');
    style.id='doseQuickAdjustStyle';
    style.textContent=`
      .dose-quick-adjust{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:7px}
      .dose-step-btn{border:1px solid #dde1e7;background:#fff;border-radius:9px;padding:8px 2px;font-size:12px;font-weight:800;color:#59616b;touch-action:manipulation;min-width:0;min-height:38px}
      .dose-step-btn:active{transform:translateY(1px);background:#f0f2f5}
      .dose-step-major{font-weight:900;background:#f8f9fb}
      @media(max-width:430px){
        #${GRID_ID}{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
        .dose-input-card{padding:9px 8px}
        .dose-quick-adjust{gap:5px}
        .dose-step-btn{min-height:44px;padding:9px 2px;font-size:13px}
      }
    `;
    document.head.appendChild(style);
  }

  function boot(){
    installStyles();
    decorate();
    const grid=document.getElementById(GRID_ID);
    if(!grid)return;
    new MutationObserver(decorate).observe(grid,{childList:true});
    document.addEventListener('click',onDocumentClick);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.DoseAdjustControls={clampDose,isUsableAction,focusFirstDose,focusResultAction,shouldRefocusInput,steps:[...STEPS],version:'1.6.0'};
})();