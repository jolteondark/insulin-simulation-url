(function(root){
  const POC_MIN=80;
  const POC_MAX=180;
  const HIDDEN_SAFE_MIN=70;
  const HIDDEN_SAFE_MAX=250;
  const TERMINAL_MIN=70;
  const TERMINAL_MAX=400;
  const BG_TO_DOSE={pre_breakfast:'basal',pre_lunch:'breakfast',pre_dinner:'lunch',bedtime:'dinner'};
  const DOSE_TO_BG={basal:'pre_breakfast',breakfast:'pre_lunch',lunch:'pre_dinner',dinner:'bedtime'};
  const BG_LABELS={pre_breakfast:'朝前',pre_lunch:'昼前',pre_dinner:'夕前',bedtime:'眠前'};
  const PRIMARY_TAG_TO_DOSE={
    basal_excess:'basal',basal_deficit:'basal',
    breakfast_rapid_excess:'breakfast',breakfast_rapid_deficit:'breakfast',
    lunch_rapid_excess:'lunch',lunch_rapid_deficit:'lunch',
    dinner_rapid_excess:'dinner',dinner_rapid_deficit:'dinner'
  };

  function num(x){const n=Number(x);return Number.isFinite(n)?n:0}
  function nullableNum(x){if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null}
  function fmt(x){const n=num(x);return Number.isInteger(n)?String(n):n.toFixed(1)}
  function correction(rec,key){return num(rec?.result?.correction_doses_u?.[key])}
  function actualRapid(rec,key){return num(rec?.order?.[`${key}_u`])+correction(rec,key)}
  function primaryDoseKey(rec){return PRIMARY_TAG_TO_DOSE[rec?.education_feedback?.primary_tag]||''}

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

  function bgStatus(value){
    if(value===null)return {className:'result-glance-missing',label:''};
    if(value<POC_MIN)return {className:'result-glance-low',label:'低'};
    if(value>POC_MAX)return {className:'result-glance-high',label:'高'};
    return {className:'result-glance-target',label:''};
  }

  function linkedDoseForBgKey(key){return BG_TO_DOSE[key]||''}

  function doseExcursionLink(x,doseKey,primaryKey=''){
    const bgKey=DOSE_TO_BG[doseKey];
    if(!bgKey)return null;
    const value=x?.bg?.[bgKey];
    const status=bgStatus(value);
    if(!status.label)return null;
    return {doseKey,bgKey,bgLabel:BG_LABELS[bgKey],value,status:status.label.toLowerCase(),label:status.label,primary:doseKey===primaryKey};
  }

  function linkMarkup(link){
    if(!link)return '';
    const prefix=link.primary?'← 次の1点・':'← ';
    return `<span class="result-glance-dose-link">${prefix}${link.bgLabel}${link.label}</span>`;
  }

  function actualDoseChip(label,value,extra,link){
    const scale=extra>0?`<span class="result-glance-scale">+scale ${fmt(extra)}</span>`:'';
    const linkedClass=link?` result-glance-dose-linked result-glance-dose-linked-${link.status}${link.primary?' result-glance-dose-primary':''}`:'';
    return `<span class="result-glance-dose-chip${linkedClass}"><span>${label}</span><b>${fmt(value)} U</b>${scale}${linkMarkup(link)}</span>`;
  }

  function basalDoseChip(active,ordered,link){
    const linkedClass=link?` result-glance-dose-linked result-glance-dose-linked-${link.status}${link.primary?' result-glance-dose-primary':''}`:'';
    return `<span class="result-glance-dose-chip result-glance-basal-chip${linkedClass}"><span>実効 basal</span><b>${fmt(active)} U</b>${linkMarkup(link)}<span class="result-glance-basal-arrow">→ 今夜 ${fmt(ordered)} U</span></span>`;
  }

  function bgCell(label,value){
    const text=value===null?'—':String(Math.round(value));
    const status=bgStatus(value);
    const flag=status.label?`<span class="result-glance-flag">${status.label}</span>`:'';
    return `<div class="result-glance-bg-cell ${status.className}"><div class="result-glance-label">${label}</div><div class="result-glance-bg-value">${text}${flag}</div></div>`;
  }

  function hiddenStatus(hidden){
    if(hidden.min===null||hidden.max===null)return {className:'result-glance-missing',label:''};
    if(hidden.min<TERMINAL_MIN||hidden.max>TERMINAL_MAX)return {className:'result-glance-danger',label:'GAME OVER域'};
    if(hidden.min<HIDDEN_SAFE_MIN||hidden.max>HIDDEN_SAFE_MAX)return {className:'result-glance-warning',label:'hidden逸脱'};
    return {className:'result-glance-target',label:'hidden安全域'};
  }

  function hiddenText(hidden){
    if(hidden.min===null||hidden.max===null)return 'hidden範囲 —';
    const status=hiddenStatus(hidden);
    return `hidden範囲 ${Math.round(hidden.min)}–${Math.round(hidden.max)} mg/dL · ${status.label}`;
  }

  function buildHtml(rec){
    const x=summaryData(rec);
    if(!x)return '';
    const day=Number(rec?.day);
    const title=Number.isFinite(day)?`DAY ${day}：結果 → 次の1点`:'結果 → 次の1点';
    const hidden=hiddenStatus(x.hidden);
    const primaryKey=primaryDoseKey(rec);
    return `<div class="result-glance" aria-label="本日の血糖結果と実投与の要約">
      <div class="result-glance-title">${title}</div>
      <div class="result-glance-bg-grid">
        ${bgCell('朝前',x.bg.pre_breakfast)}
        ${bgCell('昼前',x.bg.pre_lunch)}
        ${bgCell('夕前',x.bg.pre_dinner)}
        ${bgCell('眠前',x.bg.bedtime)}
      </div>
      <div class="result-glance-safety ${hidden.className}">${hiddenText(x.hidden)}</div>
      <div class="result-glance-actual" aria-label="本日の実投与インスリン。血糖逸脱時は対応する直前投与を表示し、教育feedbackのprimary targetを次の1点として強調">
        <span class="result-glance-actual-label">実投与</span>
        ${actualDoseChip('朝',x.actual.breakfast,x.correction.breakfast,doseExcursionLink(x,'breakfast',primaryKey))}
        ${actualDoseChip('昼',x.actual.lunch,x.correction.lunch,doseExcursionLink(x,'lunch',primaryKey))}
        ${actualDoseChip('夕',x.actual.dinner,x.correction.dinner,doseExcursionLink(x,'dinner',primaryKey))}
        ${basalDoseChip(x.actual.basal,x.scheduled.basal,doseExcursionLink(x,'basal',primaryKey))}
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
    style.textContent=`.result-glance{margin:12px 0;padding:12px;background:rgba(255,255,255,.72);border:1px solid rgba(120,128,140,.18);border-radius:14px}.result-glance-title{font-size:13px;font-weight:800;letter-spacing:.04em;color:#666d77;margin-bottom:8px}.result-glance-bg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.result-glance-bg-cell{min-width:0;text-align:center;padding:7px 3px;background:rgba(246,247,249,.9);border:1px solid transparent;border-radius:9px}.result-glance-bg-cell.result-glance-low,.result-glance-bg-cell.result-glance-high{border-color:rgba(40,44,50,.42);background:rgba(239,240,242,.96)}.result-glance-label{font-size:12px;color:#747b85}.result-glance-bg-value{font-size:19px;font-weight:800;margin-top:2px}.result-glance-flag{display:inline-block;margin-left:4px;font-size:12px;font-weight:800;vertical-align:2px}.result-glance-safety{font-size:13px;color:#5f6670;margin:8px 2px 0;padding:4px 6px;border-radius:7px}.result-glance-safety.result-glance-warning,.result-glance-safety.result-glance-danger{font-weight:800;border:1px solid rgba(40,44,50,.42);background:rgba(239,240,242,.96)}.result-glance-safety.result-glance-danger{border-width:2px}.result-glance-actual{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px;font-size:12px}.result-glance-actual-label{font-weight:800;color:#5f6670;margin-right:1px}.result-glance-dose-chip{display:inline-flex;align-items:baseline;gap:4px;padding:5px 7px;background:rgba(246,247,249,.92);border:1px solid transparent;border-radius:8px;color:#68707a}.result-glance-dose-chip b{font-size:13px;color:#272b31}.result-glance-dose-linked{border-color:rgba(40,44,50,.42);background:rgba(239,240,242,.96)}.result-glance-dose-primary{border-width:2px;font-weight:800}.result-glance-dose-link{font-size:12px;font-weight:850;color:#343941;white-space:nowrap}.result-glance-scale,.result-glance-basal-arrow{font-size:12px;color:#7d848e}.result-glance-basal-chip{flex-wrap:wrap}.result-glance-details{margin-top:9px}.result-glance-details>summary{font-size:12px;color:#626a75;cursor:pointer;user-select:none;min-height:36px;display:flex;align-items:center}.result-glance-meals{font-size:12px;color:#626a75;margin:8px 0}.result-glance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.result-glance-cell{min-width:0;text-align:center;padding:7px 3px;background:rgba(246,247,249,.9);border-radius:9px}.result-glance-value{font-size:15px;font-weight:780;margin-top:2px}.result-glance-sub{font-size:12px;color:#7d848e;margin-top:3px;line-height:1.35}.result-glance-legacy-hidden{display:none!important}@media(max-width:520px){.result-glance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.result-glance-bg-value{font-size:19px}.result-glance-dose-chip{padding:5px 6px}.result-glance-basal-chip{width:100%;justify-content:center}}`;
    document.head.appendChild(style);
  }

  function compactLegacyNonterminal(panel){
    if(!panel?.querySelector('#nextDayBtn'))return;
    Array.from(panel.children).forEach(el=>{
      if(el.classList?.contains('result-text')||el.classList?.contains('result-title')||el.classList?.contains('result-kicker'))el.classList.add('result-glance-legacy-hidden');
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

  function scheduleAnnotate(){
    if(typeof queueMicrotask==='function')queueMicrotask(annotateLatest);
    else Promise.resolve().then(annotateLatest);
  }

  function mount(){
    if(typeof document==='undefined')return;
    ensureStyle();
    const submit=document.querySelector('#submitBtn');
    if(!submit||submit.dataset.resultGlanceMounted)return;
    submit.dataset.resultGlanceMounted='1';
    submit.addEventListener('click',scheduleAnnotate);
  }

  const api={summaryData,bgStatus,hiddenStatus,linkedDoseForBgKey,primaryDoseKey,doseExcursionLink,buildHtml,basalDoseChip,compactLegacyNonterminal,annotateLatest,scheduleAnnotate,mount,version:'1.8.0'};
  if(root)root.ResultGlanceSummary=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
