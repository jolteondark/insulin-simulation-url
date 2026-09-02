(function(){
  const STORAGE_KEY='ward_glucose_active_case_v1';
  const VERSION=1;

  function compactState(s){
    if(!s||typeof s!=='object')return null;
    let copy;
    try{copy=JSON.parse(JSON.stringify(s))}catch{return null}
    if(Array.isArray(copy.history)){
      for(const rec of copy.history){
        if(rec&&rec.result&&Array.isArray(rec.result.series))delete rec.result.series;
      }
    }
    return {version:VERSION,saved_at:new Date().toISOString(),state:copy};
  }

  function valid(payload){
    const s=payload?.state;
    return payload?.version===VERSION&&s&&typeof s==='object'&&s.case&&s.p&&Number.isFinite(Number(s.day))&&s.day>=1&&s.bg&&s.prevOrder&&Number.isFinite(Number(s.lastEnd))&&!s.over;
  }

  function load(){
    try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return valid(x)?x:null}catch{return null}
  }
  function clear(){try{localStorage.removeItem(STORAGE_KEY)}catch{}}
  function saveCurrent(){
    try{
      if(typeof state==='undefined'||!state||state.over)return false;
      const payload=compactState(state);if(!payload)return false;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));return true;
    }catch{return false}
  }
  function stablePrescriptionPhase(){
    try{
      if(typeof state==='undefined'||!state||state.over)return false;
      const submit=document.querySelector('#submitBtn');
      return Boolean(submit&&!submit.disabled&&!document.querySelector('#nextDayBtn'));
    }catch{return false}
  }
  function restore(){
    const payload=load();if(!payload)return false;
    try{
      state=payload.state;
      if(!state.currentIntake&&typeof sampleVisibleIntake==='function')state.currentIntake=sampleVisibleIntake(state.day);
      if(typeof render==='function')render();
      return true;
    }catch(e){console.error('session checkpoint restore',e);clear();return false}
  }
  function mount(){
    if(typeof document==='undefined'||typeof startGenerated!=='function')return;
    const restored=restore();
    if(!restored&&stablePrescriptionPhase())saveCurrent();

    const originalStart=startGenerated;
    startGenerated=function(seed){
      const out=originalStart(seed);
      saveCurrent();
      return out;
    };

    document.addEventListener('click',event=>{
      const next=event.target?.closest?.('#nextDayBtn');
      if(next){setTimeout(()=>{if(stablePrescriptionPhase())saveCurrent()},0);return}
      const submit=event.target?.closest?.('#submitBtn');
      if(submit){setTimeout(()=>{if(typeof state!=='undefined'&&state?.over)clear()},0)}
    });
    window.addEventListener('pagehide',()=>{if(stablePrescriptionPhase())saveCurrent()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&stablePrescriptionPhase())saveCurrent()});
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  }
  window.WardSessionCheckpoint={save:saveCurrent,restore,clear,load,compactState,valid,version:'1.0.0'};
})();