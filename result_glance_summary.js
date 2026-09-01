(function(root){
  function num(x){const n=Number(x);return Number.isFinite(n)?n:0}
  function fmt(x){const n=num(x);return Number.isInteger(n)?String(n):n.toFixed(1)}
  function correction(rec,key){return num(rec?.result?.correction_doses_u?.[key])}
  function actualRapid(rec,key){return num(rec?.order?.[`${key}_u`])+correction(rec,key)}

  function summaryData(rec){
    if(!rec?.result?.bg)return null;
    return {
      intake:{
        breakfast:num(rec.intake?.breakfast),
        lunch:num(rec.intake?.lunch),
        dinner:num(rec.intake?.dinner)
      },
      scheduled:{
        breakfast:num(rec.order?.breakfast_u),
        lunch:num(rec.order?.lunch_u),
        dinner:num(rec.order?.dinner_u),
        basal:num(rec.order?.basal_u)
      },
      actual:{
        breakfast:actualRapid(rec,'breakfast'),
        lunch:actualRapid(rec,'lunch'),
        dinner:actualRapid(rec,'dinner'),
        basal:num(rec.activeBasal)
      },
      correction:{
        breakfast:correction(rec,'breakfast'),
        lunch:correction(rec,'lunch'),
        dinner:correction(rec,'dinner')
      },
      bg:{...rec.result.bg}
    };
  }

  function doseCell(label,scheduled,actual,extra){
    const detail=extra>0?`定時 ${fmt(scheduled)} + scale ${fmt(extra)}`:`定時 ${fmt(scheduled)}`;
    return `<div class="result-glance-cell"><div class="result-glance-label">${label}</div><div class="result-glance-value">${fmt(actual)} U</div><div class="result-glance-sub">${detail}</div></div>`;
  }

  function buildHtml(rec){
    const x=summaryData(rec);
    if(!x)return '';
    return `<div class="result-glance" aria-label="本日の処方と実投与の要約">
      <div class="result-glance-title">今日の判断を一目で確認</div>
      <div class="result-glance-meals">食事　朝 ${Math.round(x.intake.breakfast*10)}割 / 昼 ${Math.round(x.intake.lunch*10)}割 / 夕 ${Math.round(x.intake.dinner*10)}割</div>
      <div class="result-glance-grid">
        ${doseCell('朝 rapid',x.scheduled.breakfast,x.actual.breakfast,x.correction.breakfast)}
        ${doseCell('昼 rapid',x.scheduled.lunch,x.actual.lunch,x.correction.lunch)}
        ${doseCell('夕 rapid',x.scheduled.dinner,x.actual.dinner,x.correction.dinner)}
        <div class="result-glance-cell"><div class="result-glance-label">実効 basal</div><div class="result-glance-value">${fmt(x.actual.basal)} U</div><div class="result-glance-sub">今夜処方 ${fmt(x.scheduled.basal)} U</div></div>
      </div>
    </div>`;
  }

  function ensureStyle(){
    if(typeof document==='undefined'||document.getElementById('resultGlanceStyle'))return;
    const style=document.createElement('style');
    style.id='resultGlanceStyle';
    style.textContent=`.result-glance{margin:12px 0;padding:12px;background:rgba(255,255,255,.72);border:1px solid rgba(120,128,140,.18);border-radius:14px}.result-glance-title{font-size:10px;font-weight:800;letter-spacing:.06em;color:#666d77;margin-bottom:5px}.result-glance-meals{font-size:10px;color:#6f7580;margin-bottom:8px}.result-glance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.result-glance-cell{min-width:0;text-align:center;padding:7px 3px;background:rgba(246,247,249,.9);border-radius:9px}.result-glance-label{font-size:8px;color:#8b919a}.result-glance-value{font-size:14px;font-weight:780;margin-top:2px}.result-glance-sub{font-size:7px;color:#8b919a;margin-top:2px;line-height:1.3}@media(max-width:520px){.result-glance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
    document.head.appendChild(style);
  }

  function annotateLatest(){
    try{
      if(typeof state==='undefined'||!state?.history?.length)return;
      const rec=state.history[state.history.length-1];
      const panel=document.querySelector('#resultPanel');
      if(!panel||panel.querySelector('.result-glance'))return;
      const html=buildHtml(rec);
      if(!html)return;
      const next=panel.querySelector('.next-btn');
      if(next)next.insertAdjacentHTML('beforebegin',html);
      else panel.insertAdjacentHTML('beforeend',html);
    }catch(e){console.error('result glance summary',e)}
  }

  function mount(){
    if(typeof document==='undefined')return;
    ensureStyle();
    const submit=document.querySelector('#submitBtn');
    if(!submit||submit.dataset.resultGlanceMounted)return;
    submit.dataset.resultGlanceMounted='1';
    submit.addEventListener('click',annotateLatest);
  }

  const api={summaryData,buildHtml,annotateLatest,mount,version:'1.0.1'};
  if(root)root.ResultGlanceSummary=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
