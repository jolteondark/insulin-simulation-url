(function(root){
  const CTA_ID='caseNextCta';

  function terminalRestartButton(){
    if(typeof document==='undefined')return null;
    return document.querySelector('#resultPanel #restartBtn');
  }

  function ensureCta(){
    if(typeof document==='undefined')return null;
    const body=document.querySelector('#caseDebriefBody');
    if(!body)return null;
    let btn=body.querySelector('#'+CTA_ID);
    if(btn)return btn;
    btn=document.createElement('button');
    btn.id=CTA_ID;
    btn.className='next-btn';
    btn.type='button';
    btn.textContent='次症例を開始';
    btn.style.marginTop='10px';
    btn.addEventListener('click',()=>{
      if(typeof startGenerated!=='function')return;
      startGenerated();
      try{root.WardCaseDebrief?.refresh?.()}catch(e){console.error('case transition debrief refresh',e)}
      try{root.RepeatPlayNavigation?.moveToPrescriptionContext?.()}catch(e){console.error('case transition navigation',e)}
    });
    body.appendChild(btn);
    return btn;
  }

  function refresh(){
    try{
      if(typeof state==='undefined')return;
      const original=terminalRestartButton();
      const debrief=document.querySelector('#caseDebrief');
      const terminal=Boolean(state?.over)&&debrief&&!debrief.classList.contains('hidden');
      if(terminal){
        ensureCta();
        if(original)original.style.display='none';
      }else{
        if(original)original.style.display='';
        document.querySelector('#'+CTA_ID)?.remove();
      }
    }catch(e){console.error('case transition CTA',e)}
  }

  function mount(){
    if(typeof document==='undefined')return;
    const submit=document.querySelector('#submitBtn');
    if(submit&&!submit.dataset.caseTransitionCtaMounted){
      submit.dataset.caseTransitionCtaMounted='1';
      submit.addEventListener('click',refresh);
    }
    const newCase=document.querySelector('#newCaseBtn');
    if(newCase)newCase.addEventListener('click',refresh);
    refresh();
  }

  const api={ensureCta,refresh,version:'1.0.0'};
  if(root)root.CaseTransitionCta=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
