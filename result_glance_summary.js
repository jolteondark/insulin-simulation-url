(function(root){
  function num(x){const n=Number(x);return Number.isFinite(n)?n:0}
  function nullableNum(x){const n=Number(x);return Number.isFinite(n)?n:null}
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
      bg:{
        pre_breakfast:nullableNum(rec.result.bg.pre_breakfast),
        pre_lunch:nullableNum(rec.result.bg.pre_lunch),
        pre_dinner:nullableNum(rec.result.bg.pre_dinner),
        bedtime:nullableNum(rec.result.bg.bedtime)
      },
      hidden:{min:nullableNum(rec.result.min),max:nullableNum(rec.result.max)}
    };
  }

  function doseCell(label,scheduled,actual,extra){
    const detail=extra>0?`定時 ${fmt(scheduled)} + scale ${fmt(extra)}`:`定時 ${fmt(scheduled)}`;
    return `<div class="result-glance-cell"><div class="result-glance-label">${label}</div><div class="result-glance-value">${fmt(actual)} U</div><div class="result-glance-sub">${detail}</div></div>`;
  }

  function actualDoseChip(label,value,extra){
    const scale=extra>0?`<span class="result-glance-scale">+scale ${fmt(extra)}</span>`:'';
    return `<span class="result-glance-dose-chip"><span>${label}</span><b>${fmt(value)} U</b>${scale}</span>`;
  }

  function bgCell(label,value){
    const text=value===null?'—':String(Math.round(value));
    return `<div class="result-glance-bg-cell"><div class="result-glance-label">${label}</div><div class="result-glance-bg-value">${text}</div></div>`;
  }

  function hiddenText(hidden){
    if(hidden.min===null||hidden.max===null)return 'hidden範囲 —';
    return `hidden範囲 ${Math.round(hidden.min)}–${Math.round(hidden.max)} mg/dL`;
  }

  function buildHtml(rec){
    const x=summaryData(rec);
    if(!x)return '';
    return `<div class="result-glance" aria-label="本日の血糖結果と実投与の要約">
      <div class="result-glance-title">今日の結果を一目で確認</div>
      <div class="result-glance-bg-grid">
        ${bgCell('朝前',x.bg.pre_breakfast)}
        ${bgCell('昼前',x.bg.pre_lunch)}
        ${bgCell('夕前',x.bg.pre_dinner)}
        ${bgCell('眠前',x.bg.bedtime)}
      </div>
      <div class="result-glance-safety">${hiddenText(x.hidden)}</div>
      <div class="result-glance-actual" aria-label="本日の実投与インスリン">
        <span class="result-glance-actual-label">実投与</span>
        ${actualDoseChip('朝',x.actual.breakfast,x.correction.breakfast)}
        ${actualDoseChip('昼',x.actual.lunch,x.correction.lunch)}
        ${actualDoseChip('夕',x.actual.dinner,x.correction.dinner)}
        ${actualDoseChip('実効 basal',x.actual.basal,0)}
      </div>
      <details class="result-glance-details">
        <summary>食事・処方内訳を確認</summary>
        <div class="result-glance-meals">食事　朝 ${Math.round(x.intake.breakfast*10)}割 / 昼 ${Math.round(x.intake.lunch*10)}割 / 夕 ${Math.round(x.intake.dinner*10)}割</div>
        <div class="result-glance-grid">
          ${doseCell('朝 rapid',x.scheduled.breakfast,x.actual.breakfast,x.correction.breakfast)}
          ${doseCell('昼 rapid',x.scheduled.lunch,x.actual.lunch,x.correction.lunch)}
          ${doseCell('夕 rapid',x.scheduled.dinner,x.actual.dinner,x.correction.dinner)}
          <div class="result-glance-cell"><div class="result-glance-label">実効 basal</div><div class="result-glance-value">${fmt(x.actual.basal)} U</div><div class="result-glance-sub">今夜処方 ${fmt(x.scheduled.basal)} U</div></div>
        </div>
      </details>
    </div>`;
  }

  function ensureStyle(){
    if(typeof document==='undefined'||document.getElementById('resultGlanceStyle'))return;
    const style=document.createElement('style');
    style.id='resultGlanceStyle';
    style.textContent=`.result-glance{margin:12px 0;padding:12px;background:rgba(255,255,255,.72);border:1px solid rgba(120,128,140,.18);border-radius:14px}.result-glance-title{font-size:10px;font-weight:800;letter-spacing:.06em;color:#666d77;margin-bottom:7px}.result-glance-bg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.result-glance-bg-cell{min-width:0;text-align:center;padding:7px 3px;background:rgba(246,247,249,.9);border-radius:9px}.result-glance-label{font-size:8px;color:#8b919a}.result-glance-bg-value{font-size:17px;font-weight:800;margin-top:2px}.result-glance-safety{font-size:9px;color:#6f7580;margin:7px 2px 0}.result-glance-actual{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:7px;font-size:9px}.result-glance-actual-label{font-weight:800;color:#5f6670;margin-right:1px}.result-glance-dose-chip{display:inline-flex;align-items:baseline;gap:3px;padding:4px 6px;background:rgba(246,247,249,.92);border-radius:8px;color:#747b85}.result-glance-dose-chip b{font-size:11px;color:#272b31}.result-glance-scale{font-size:7px;color:#8b919a}.result-glance-details{margin-top:7px}.result-glance-details>summary{font-size:9px;color:#6f7580;cursor:pointer;user-select:none}.result-glance-meals{font-size:10px;color:#6f7580;margin:8px 0}.result-glance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.result-glance-cell{min-width:0;text-align:center;padding:7px 3px;background:rgba(246,247,249,.9);border-radius:9px}.result-glance-value{font-size:14px;font-weight:780;margin-top:2px}.result-glance-sub{font-size:7px;color:#8b919a;margin-top:2px;line-height:1.3}.result-glance-legacy-hidden{display:none!important}@media(max-width:520px){.result-glance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.result-glance-bg-value{font-size:15px}.result-glance-dose-chip{padding:4px 5px}}`;
    document.head.appendChild(style);
  }

  function compactLegacyNonterminal(panel){
    if(!panel?.querySelector('#nextDayBtn'))return;
    Array.from(panel.children).forEach(el=>{
      if(el.classList?.contains('result-text'))el.classList.add('result-glance-legacy-hidden');
    });
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
      compactLegacyNonterminal(panel);
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

  const api={summaryData,buildHtml,compactLegacyNonterminal,annotateLatest,mount,version:'1.2.0'};
  if(root)root.ResultGlanceSummary=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
