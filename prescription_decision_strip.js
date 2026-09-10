// Compact, read-only prescription context beside the dose controls.
// Mirrors already-rendered DOM; app.js remains the source of patient/prescription state.
(function(){
  const STRIP_ID='prescriptionDecisionStrip';
  const MIRRORED_CLASS='feedback-mirrored-in-decision-strip';
  const FOCUS_MIRRORED_CLASS='focus-mirrored-in-decision-strip';
  const COMPACTED_CLASS='decision-strip-source-compacted';
  const DETAILS_ID='prescriptionContextDetailsBtn';
  const DOSE_INPUT_LABELS={
    dose_breakfast_u:'朝 rapid',
    dose_lunch_u:'昼 rapid',
    dose_dinner_u:'夕 rapid',
    dose_basal_u:'眠前 basal'
  };

  function text(el){return (el?.textContent||'').replace(/\s+/g,' ').trim()}

  function collect(selector){
    return [...document.querySelectorAll(selector)].map(text).filter(Boolean);
  }

  function normalizeMeaning(value){
    return String(value||'')
      .toLowerCase()
      .replace(/[\s\u3000、。・,:：;；()（）\[\]【】「」『』!！?？/／_-]+/g,'');
  }

  function focusMeaning(focus){
    if(!focus)return '';
    return normalizeMeaning([focus.title,focus.body,focus.status].filter(Boolean).join(' '));
  }

  function alreadyCoveredByFocus(value,focus){
    const needle=normalizeMeaning(value);
    const haystack=focusMeaning(focus);
    // Conservative one-way deduplication: only remove a short source item when
    // the active focus already contains that whole item. Never suppress richer
    // feedback merely because it happens to contain the shorter focus text.
    return Boolean(needle&&needle.length>=3&&haystack&&haystack.includes(needle));
  }

  function previousDoseSnapshot(){
    return [...document.querySelectorAll('#prevDoseGrid .prev-dose')].map(card=>{
      const value=text(card.querySelector('.value'));
      const detail=[...card.querySelectorAll('div')]
        .map(text)
        .find(x=>/^定時\s/.test(x)&&/scale/i.test(x));
      const scale=detail?.match(/scale\s*\+?\s*([0-9.]+)/i)?.[1];
      return value+(scale&&Number(scale)>0?` (+${scale})`:'');
    }).filter(Boolean);
  }

  function signedDoseDelta(delta){
    const n=Number(delta);
    if(!Number.isFinite(n)||n===0)return '±0 U';
    return `${n>0?'+':''}${Math.round(n)} U`;
  }

  function doseChangeSnapshot(){
    const items=[];
    let comparable=0;
    for(const [inputId,label] of Object.entries(DOSE_INPUT_LABELS)){
      const input=document.getElementById(inputId);
      const current=Number(input?.value);
      const previous=Number(input?.dataset?.previousScheduledDose);
      if(!Number.isFinite(current)||!Number.isFinite(previous))continue;
      comparable++;
      const delta=Math.round(current)-Math.round(previous);
      if(delta!==0)items.push({inputId,label,current:Math.round(current),previous:Math.round(previous),delta,text:`${label} ${signedDoseDelta(delta)}`});
    }
    return {
      comparable,
      items,
      changed:items.length,
      summary:comparable?(items.length?items.map(item=>item.text).join(' / '):'変更なし'):''
    };
  }

  function focusSnapshot(){
    const section=document.getElementById('learningFocus');
    const visible=section&&!section.classList.contains('hidden');
    if(!visible)return null;
    const title=text(document.getElementById('learningFocusTitle'));
    const body=text(document.getElementById('learningFocusBody'));
    const status=text(document.getElementById('learningFocusStatus'));
    if(!title&&!body&&!status)return null;
    return {title,body,status};
  }

  function snapshot(){
    const glucose=collect('#bgGrid .bg-card').map(x=>x.replace(/mg\/dL/gi,'').trim());
    const meals=collect('#todayMealGrid .meal-card');
    const previousDoses=previousDoseSnapshot();
    const context=collect('#contextBadges .badge');
    const feedback=text(document.getElementById('previousFeedbackBody'));
    const feedbackSection=document.getElementById('previousFeedback');
    const feedbackVisible=feedbackSection&&!feedbackSection.classList.contains('hidden')&&Boolean(feedback);
    return {
      glucose,
      meals,
      previousDoses,
      context,
      focus:focusSnapshot(),
      feedback:feedbackVisible?feedback:'',
      doseChanges:doseChangeSnapshot()
    };
  }

  function compactSnapshot(s){
    if(!s.focus)return s;
    return {
      ...s,
      context:s.context.filter(value=>!alreadyCoveredByFocus(value,s.focus)),
      feedback:alreadyCoveredByFocus(s.feedback,s.focus)?'':s.feedback
    };
  }

  function row(label,values,kind=''){
    if(!values?.length)return '';
    return `<div class="decision-strip-row ${kind}"><span class="decision-strip-label">${label}</span><div class="decision-strip-values">${values.map(v=>`<span>${v}</span>`).join('')}</div></div>`;
  }

  function doseChangeBlock(change){
    if(!change?.summary)return '';
    const state=change.changed?'changed':'unchanged';
    return `<div class="decision-strip-change ${state}"><span class="decision-strip-label">今回変更</span><span>${change.summary}</span></div>`;
  }

  function ensureStrip(){
    let strip=document.getElementById(STRIP_ID);
    if(strip)return strip;
    const grid=document.getElementById('doseGrid');
    if(!grid)return null;
    strip=document.createElement('div');
    strip.id=STRIP_ID;
    strip.className='prescription-decision-strip';
    strip.setAttribute('aria-label','処方判断用サマリー');
    grid.parentNode.insertBefore(strip,grid);
    return strip;
  }

  function setFeedbackMirrored(mirrored){
    const section=document.getElementById('previousFeedback');
    if(!section)return;
    section.classList.toggle(MIRRORED_CLASS,Boolean(mirrored));
    if(mirrored)section.setAttribute('aria-hidden','true');
    else section.removeAttribute('aria-hidden');
  }

  function setFocusMirrored(mirrored){
    const section=document.getElementById('learningFocus');
    if(!section)return;
    section.classList.toggle(FOCUS_MIRRORED_CLASS,Boolean(mirrored));
    if(mirrored)section.setAttribute('aria-hidden','true');
    else section.removeAttribute('aria-hidden');
  }

  function sourceSections(){
    return {
      context:document.getElementById('prescriptionContext'),
      meals:document.getElementById('todayMealGrid')?.closest('section')
    };
  }

  function setSectionCompacted(section,compacted){
    if(!section)return;
    section.classList.toggle(COMPACTED_CLASS,Boolean(compacted));
    if(compacted)section.setAttribute('aria-hidden','true');
    else section.removeAttribute('aria-hidden');
  }

  function updateDetailsButton(){
    const btn=document.getElementById(DETAILS_ID);
    if(!btn)return;
    const sections=Object.values(sourceSections()).filter(Boolean);
    const compacted=sections.some(section=>section.classList.contains(COMPACTED_CLASS));
    btn.textContent=compacted?'詳細を表示':'詳細を閉じる';
    btn.setAttribute('aria-expanded',String(!compacted));
  }

  function setSourcesCompacted(compacted){
    Object.values(sourceSections()).forEach(section=>setSectionCompacted(section,compacted));
    updateDetailsButton();
  }

  function setMirroredSourcesCompacted(s){
    const sections=sourceSections();
    // The current-meal card can be hidden as soon as today's meals are mirrored,
    // including on day 1 when no prior dose exists yet. The larger latest-record
    // card is hidden only after both glucose and previous actual dose are mirrored.
    setSectionCompacted(sections.meals,Boolean(s.meals.length));
    setSectionCompacted(sections.context,Boolean(s.glucose.length&&s.previousDoses.length));
    updateDetailsButton();
  }

  function detailsButton(){
    return `<button type="button" id="${DETAILS_ID}" class="decision-strip-details-btn" aria-expanded="false">詳細を表示</button>`;
  }

  function bindDetails(){
    const btn=document.getElementById(DETAILS_ID);
    if(!btn||btn.dataset.bound==='1')return;
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      const compacted=Object.values(sourceSections()).filter(Boolean).some(section=>section.classList.contains(COMPACTED_CLASS));
      setSourcesCompacted(!compacted);
    });
  }

  function focusBlock(focus){
    if(!focus)return '';
    const title=focus.title||'今回見る1点';
    const body=focus.body?`<span class="decision-strip-focus-body">${focus.body}</span>`:'';
    const status=focus.status?`<span class="decision-strip-focus-status">${focus.status}</span>`:'';
    return `<div class="decision-strip-focus"><span class="decision-strip-label">練習テーマ</span><div><strong>${title}</strong>${body}${status}</div></div>`;
  }

  function render(){
    const strip=ensureStrip();
    if(!strip)return;
    const raw=snapshot();
    const s=compactSnapshot(raw);
    // Separate the immediate prescribing action from the broader curriculum theme.
    // When both exist, yesterday's concrete action comes first; the learning theme
    // stays visible as context without competing for the first decision slot.
    const html=[
      s.feedback?`<div class="decision-strip-feedback"><span class="decision-strip-label">次に変える1点</span><span>${s.feedback}</span></div>`:'',
      focusBlock(s.focus),
      doseChangeBlock(s.doseChanges),
      row('病態',s.context,'context'),
      row('直近4検',s.glucose,'glucose'),
      row('今日の食事',s.meals,'meal'),
      row('前回実投与',s.previousDoses,'dose'),
      detailsButton()
    ].filter(Boolean).join('');
    strip.innerHTML=html;
    strip.classList.toggle('hidden',!html);
    setFocusMirrored(Boolean(s.focus));
    // Hide the source feedback whenever it is either mirrored in the strip or
    // intentionally deduplicated because today's focus already covers it.
    setFeedbackMirrored(Boolean(raw.feedback));
    bindDetails();
    // Source-card compaction depends on the raw mirrored state, not the
    // presentation-level deduplication above.
    setMirroredSourcesCompacted(raw);
  }

  function installStyles(){
    if(document.getElementById('prescriptionDecisionStripStyle'))return;
    const style=document.createElement('style');
    style.id='prescriptionDecisionStripStyle';
    style.textContent=`
      .prescription-decision-strip{margin:0 0 12px;padding:10px 11px;border:1px solid #e4e7ec;border-radius:14px;background:#f8f9fb;display:grid;gap:8px}
      .decision-strip-row{display:grid;grid-template-columns:82px minmax(0,1fr);gap:8px;align-items:start}
      .decision-strip-label{font-size:12px;line-height:1.35;font-weight:850;letter-spacing:.02em;color:#6f7782;white-space:nowrap}
      .decision-strip-values{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
      .decision-strip-values span{min-width:0;padding:5px 3px;border-radius:8px;background:#fff;text-align:center;font-size:13px;line-height:1.2;font-weight:780;color:#343b45;overflow:hidden;text-overflow:ellipsis}
      .decision-strip-row.glucose .decision-strip-values span{font-size:15px;font-weight:850;font-variant-numeric:tabular-nums}
      .decision-strip-row.context .decision-strip-values,.decision-strip-row.meal .decision-strip-values{grid-template-columns:repeat(3,minmax(0,1fr))}
      .decision-strip-focus,.decision-strip-feedback,.decision-strip-change{display:grid;grid-template-columns:82px minmax(0,1fr);gap:8px;padding-bottom:8px;border-bottom:1px solid #e4e7ec;font-size:13px;line-height:1.4;color:#404853}
      .decision-strip-focus strong{display:block;color:#252b33;font-size:14px}
      .decision-strip-focus-body,.decision-strip-focus-status{display:block;margin-top:2px}
      .decision-strip-focus-status{font-size:12px;color:#6f7782;font-weight:750}
      .decision-strip-feedback{padding:0 0 8px;border-top:0;border-bottom:1px solid #e4e7ec;font-weight:750;color:#252b33}
      .decision-strip-change{font-weight:800;color:#252b33}
      .decision-strip-change.unchanged{color:#707781;font-weight:700}
      .decision-strip-change.changed>span:last-child{font-variant-numeric:tabular-nums}
      .decision-strip-details-btn{justify-self:end;border:0;background:transparent;padding:6px 2px;font:inherit;font-size:12px;font-weight:800;color:#5e6875;text-decoration:underline;text-underline-offset:2px;cursor:pointer;min-height:32px}
      #previousFeedback.${MIRRORED_CLASS},#learningFocus.${FOCUS_MIRRORED_CLASS}{display:none!important}
      .${COMPACTED_CLASS}{display:none!important}
      @media(max-width:430px){
        .prescription-decision-strip{margin-bottom:10px;padding:10px}
        .decision-strip-row,.decision-strip-focus,.decision-strip-feedback,.decision-strip-change{grid-template-columns:76px minmax(0,1fr);gap:6px}
        .decision-strip-values{gap:4px}
        .decision-strip-values span{font-size:12px;padding:5px 2px}
        .decision-strip-row.glucose .decision-strip-values span{font-size:15px}
        .decision-strip-focus,.decision-strip-feedback,.decision-strip-change{font-size:13px}
        .decision-strip-details-btn{font-size:12px;min-height:36px}
      }
    `;
    document.head.appendChild(style);
  }

  function observe(id){
    const el=document.getElementById(id);
    if(el)new MutationObserver(render).observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function boot(){
    installStyles();
    render();
    ['learningFocus','learningFocusTitle','learningFocusBody','learningFocusStatus','bgGrid','todayMealGrid','prevDoseGrid','contextBadges','previousFeedback','previousFeedbackBody','doseGrid'].forEach(observe);
    document.getElementById('doseGrid')?.addEventListener('input',render);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.PrescriptionDecisionStrip={snapshot,compactSnapshot,focusSnapshot,previousDoseSnapshot,doseChangeSnapshot,signedDoseDelta,normalizeMeaning,alreadyCoveredByFocus,render,setFeedbackMirrored,setFocusMirrored,setSourcesCompacted,setMirroredSourcesCompacted,version:'2.0.0'};
})();
