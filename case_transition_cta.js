(function(root){
  const CTA_ID='caseNextCta';

  function doc(){return root?.document||(typeof document!=='undefined'?document:null)}

  function terminalRestartButton(){
    const d=doc();
    if(!d)return null;
    return d.querySelector('#resultPanel #restartBtn');
  }

  function ensureCta(){
    const d=doc();
    if(!d)return null;
    const body=d.querySelector('#caseDebriefBody');
    if(!body)return null;
    let btn=body.querySelector('#'+CTA_ID);
    if(btn)return btn;
    btn=d.createElement('button');
    btn.id=CTA_ID;
    btn.className='next-btn';
    btn.type='button';
    btn.textContent='次症例を開始';
    btn.style.marginTop='10px';
    btn.addEventListener('click',()=>{
      // Use the current window-level function, not a bare global identifier.
      // Adaptive-practice tracking wraps root.startGenerated after app.js loads;
      // routing through root guarantees that one-click repeat play preserves
      // adaptive selection capture and the longitudinal learning record.
      if(typeof root?.startGenerated!=='function')return;
      root.startGenerated();
      try{root.WardCaseDebrief?.refresh?.()}catch(e){console.error('case transition debrief refresh',e)}
      try{root.RepeatPlayNavigation?.moveToPrescriptionContext?.()}catch(e){console.error('case transition navigation',e)}
    });
    body.appendChild(btn);
    return btn;
  }

  function refresh(){
    try{
      const d=doc();
      if(!d)return;
      const s=root?.state||(typeof state!=='undefined'?state:null);
      if(!s)return;
      const original=terminalRestartButton();
      const debrief=d.querySelector('#caseDebrief');
      const terminal=Boolean(s?.over)&&debrief&&!debrief.classList.contains('hidden');
      if(terminal){
        ensureCta();
        if(original)original.style.display='none';
      }else{
        if(original)original.style.display='';
        d.querySelector('#'+CTA_ID)?.remove();
      }
    }catch(e){console.error('case transition CTA',e)}
  }

  function mount(){
    const d=doc();
    if(!d)return;
    const submit=d.querySelector('#submitBtn');
    if(submit&&!submit.dataset.caseTransitionCtaMounted){
      submit.dataset.caseTransitionCtaMounted='1';
      submit.addEventListener('click',refresh);
    }
    const newCase=d.querySelector('#newCaseBtn');
    if(newCase)newCase.addEventListener('click',refresh);
    refresh();
  }

  const api={ensureCta,refresh,mount,version:'1.1.0'};
  if(root)root.CaseTransitionCta=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  const d=doc();
  if(d){
    if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
