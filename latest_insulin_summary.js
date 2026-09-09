const LatestInsulinSummary=(()=>{
  function fmt(x){const n=Number(x);return Number.isFinite(n)?n.toFixed(n%1?1:0):'—'}
  function correctionFor(rec,key){
    const meal=key.replace('_u','');
    return Number(rec?.result?.correction_doses_u?.[meal])||0;
  }
  function rapidCard(rec,key,label){
    const scheduled=Number(rec?.order?.[key])||0;
    const extra=correctionFor(rec,key);
    const total=scheduled+extra;
    const detail=extra>0?`定時 ${fmt(scheduled)} + scale ${fmt(extra)}`:`定時 ${fmt(scheduled)}`;
    return `<div class="prev-dose"><div class="name">${label}</div><div class="value">${fmt(total)} U</div><div style="font-size:8px;color:#8b919a;margin-top:2px">${detail}</div></div>`;
  }
  function basalCard(rec){
    const active=fmt(rec?.activeBasal);
    const ordered=fmt(rec?.order?.basal_u);
    const next=ordered==='—'?'今夜処方 —':`今夜処方 ${ordered} U`;
    return `<div class="prev-dose"><div class="name">実効 basal</div><div class="value">${active}${active==='—'?'':' U'}</div><div style="font-size:8px;color:#8b919a;margin-top:2px">${next}</div></div>`;
  }
  function buildHtml(rec){
    if(!rec)return '';
    return rapidCard(rec,'breakfast_u','朝 rapid')+rapidCard(rec,'lunch_u','昼 rapid')+rapidCard(rec,'dinner_u','夕 rapid')+basalCard(rec);
  }
  function render(){
    if(typeof document==='undefined'||typeof state==='undefined')return;
    const grid=document.querySelector('#prevDoseGrid');
    const rec=state?.history?.[state.history.length-1];
    if(!grid||!rec)return;
    const html=buildHtml(rec);
    if(grid.innerHTML!==html)grid.innerHTML=html;
  }
  function install(){
    if(typeof document==='undefined')return;
    const grid=document.querySelector('#prevDoseGrid');
    if(!grid)return;
    const observer=new MutationObserver(()=>queueMicrotask(render));
    observer.observe(grid,{childList:true,subtree:true,characterData:true});
    document.querySelector('#submitBtn')?.addEventListener('click',()=>queueMicrotask(render));
    document.querySelector('#newCaseBtn')?.addEventListener('click',()=>queueMicrotask(render));
    render();
  }
  if(typeof window!=='undefined')install();
  return {buildHtml,correctionFor,basalCard,fmt};
})();

if(typeof module!=='undefined'&&module.exports)module.exports=LatestInsulinSummary;
