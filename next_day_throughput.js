// Keep the repeated-day loop anchored on the compact prescription area.
(function(){
  const MODULE='next-day-throughput';

  function target(){
    return document.getElementById('prescriptionDecisionStrip')
      || document.getElementById('doseGrid')?.closest('.order-card')
      || document.getElementById('doseGrid');
  }

  function returnToPrescription(){
    requestAnimationFrame(()=>{
      const el=target();
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  function bindNextDayButton(){
    const btn=document.getElementById('nextDayBtn');
    if(!btn||btn.dataset.nextDayThroughputBound==='1')return;
    btn.dataset.nextDayThroughputBound='1';
    btn.addEventListener('click',returnToPrescription);
  }

  function boot(){
    const panel=document.getElementById('resultPanel');
    if(!panel)return;
    bindNextDayButton();
    new MutationObserver(bindNextDayButton).observe(panel,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.NextDayThroughput={target,returnToPrescription,bindNextDayButton,version:'1.0.0',module:MODULE};
})();
