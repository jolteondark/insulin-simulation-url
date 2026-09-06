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
    // so next-day flow has one navigation policy and does not schedule a later
    // smooth scroll that can override the immediate throughput jump.
    const nav=window.RepeatPlayNavigation;
    if(nav?.moveToPrescriptionContext)return nav.moveToPrescriptionContext();
    const el=target();
    if(!el)return false;
    el.scrollIntoView({behavior:'auto',block:'start'});
    return true;
  }

  function bindNextDayButton(){
    const btn=document.getElementById('nextDayBtn');
    if(!btn||btn.dataset.nextDayThroughputBound==='1')return;
    btn.dataset.nextDayThroughputBound='1';
    btn.addEventListener('click',returnToPrescription);
  }

  function typingTarget(el){
    if(!el)return false;
    const tag=String(el.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||tag==='select'||el.isContentEditable===true;
  }

  function handleShortcut(event){
    if(event.defaultPrevented||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return false;
    if(String(event.key||'').toLowerCase()!=='n'||typingTarget(event.target))return false;
    const btn=document.getElementById('nextDayBtn');
    if(!btn||btn.disabled||btn.offsetParent===null)return false;
    event.preventDefault();
    btn.click();
    return true;
  }

  function boot(){
    const panel=document.getElementById('resultPanel');
    if(!panel)return;
    bindNextDayButton();
    new MutationObserver(bindNextDayButton).observe(panel,{subtree:true,childList:true});
    document.addEventListener('keydown',handleShortcut);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.NextDayThroughput={target,returnToPrescription,bindNextDayButton,typingTarget,handleShortcut,version:'1.2.0',module:MODULE};
})();
