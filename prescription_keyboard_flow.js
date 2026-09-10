(function(root){
  const DOSE_IDS=['dose_breakfast_u','dose_lunch_u','dose_dinner_u','dose_basal_u'];
  let submitInFlight=false;

  function doc(){return root?.document||(typeof document!=='undefined'?document:null)}

  function isDoseInput(el){
    return Boolean(el&&el.tagName&&String(el.tagName).toLowerCase()==='input'&&DOSE_IDS.includes(String(el.id||''))&&!el.disabled);
  }

  function nextDoseId(currentId){
    const i=DOSE_IDS.indexOf(String(currentId||''));
    return i>=0&&i<DOSE_IDS.length-1?DOSE_IDS[i+1]:'';
  }

  function focusAndSelect(el){
    if(!el||typeof el.focus!=='function')return false;
    try{el.focus({preventScroll:true})}catch{el.focus()}
    try{el.select?.()}catch{}
    return true;
  }

  function resultVisible(){
    const panel=doc()?.querySelector?.('#resultPanel');
    if(!panel)return false;
    if(panel.hidden||panel.classList?.contains?.('hidden')||panel.style?.display==='none')return false;
    return true;
  }

  function canonicalSubmit(){
    const d=doc();
    if(!d||resultVisible())return null;
    const dockTarget=root?.RepeatPlayActionDock?.actionTarget?.();
    if(dockTarget?.id==='submitBtn'&&!dockTarget.disabled)return dockTarget;
    const submit=d.getElementById?.('submitBtn')||d.querySelector?.('#submitBtn');
    return submit&&!submit.disabled?submit:null;
  }

  function releaseSubmitLock(){submitInFlight=false}

  function submitFromLastDose(){
    if(submitInFlight)return false;
    const submit=canonicalSubmit();
    if(!submit||typeof submit.click!=='function')return false;
    submitInFlight=true;
    try{submit.click()}
    catch(e){submitInFlight=false;throw e}
    if(typeof root?.requestAnimationFrame==='function')root.requestAnimationFrame(()=>root.requestAnimationFrame(releaseSubmitLock));
    else setTimeout(releaseSubmitLock,0);
    return true;
  }

  function handleKeydown(event){
    if(event?.key!=='Enter'||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return false;
    const current=event.target;
    if(!isDoseInput(current))return false;
    const nextId=nextDoseId(current.id);
    if(nextId){
      const next=doc()?.getElementById?.(nextId);
      if(!isDoseInput(next))return false;
      event.preventDefault?.();
      return focusAndSelect(next);
    }
    event.preventDefault?.();
    return submitFromLastDose();
  }

  function mount(){
    const d=doc();
    if(!d||d.documentElement?.dataset?.prescriptionKeyboardFlowMounted)return false;
    const grid=d.getElementById?.('doseGrid')||d.querySelector?.('#doseGrid');
    if(!grid||typeof grid.addEventListener!=='function')return false;
    if(d.documentElement)d.documentElement.dataset.prescriptionKeyboardFlowMounted='1';
    grid.addEventListener('keydown',handleKeydown);
    return true;
  }

  const api={isDoseInput,nextDoseId,focusAndSelect,resultVisible,canonicalSubmit,submitFromLastDose,handleKeydown,mount,doseIds:[...DOSE_IDS],version:'1.0.0'};
  if(root)root.PrescriptionKeyboardFlow=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  const d=doc();
  if(d){
    if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
