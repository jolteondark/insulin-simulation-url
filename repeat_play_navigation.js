(function(root){
  const TARGET_SELECTOR='#prescriptionContext';

  function moveToPrescriptionContext(){
    if(typeof document==='undefined')return false;
    const target=document.querySelector(TARGET_SELECTOR);
    if(!target||typeof target.scrollIntoView!=='function')return false;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  }

  function onClick(event){
    const id=event?.target?.id;
    if(id!=='nextDayBtn'&&id!=='restartBtn')return;
    // app.js completes the synchronous day/case transition in the target's onclick
    // before this bubbling listener runs. Navigate to the first decision-relevant
    // card instead of forcing repeat players back through the static header/rules.
    moveToPrescriptionContext();
  }

  function mount(){
    if(typeof document==='undefined'||document.documentElement?.dataset?.repeatPlayNavigationMounted)return;
    if(document.documentElement)document.documentElement.dataset.repeatPlayNavigationMounted='1';
    document.addEventListener('click',onClick);
  }

  const api={moveToPrescriptionContext,onClick,mount,targetSelector:TARGET_SELECTOR,version:'1.0.0'};
  if(root)root.RepeatPlayNavigation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
