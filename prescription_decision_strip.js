// Compact, read-only prescription context beside the dose controls.
// Mirrors already-rendered DOM; app.js remains the source of patient/prescription state.
(function(){
  const STRIP_ID='prescriptionDecisionStrip';
  const MIRRORED_CLASS='feedback-mirrored-in-decision-strip';
  const COMPACTED_CLASS='decision-strip-source-compacted';
  const DETAILS_ID='prescriptionContextDetailsBtn';

  function text(el){return (el?.textContent||'').replace(/\s+/g,' ').trim()}

  function collect(selector){
    return [...document.querySelectorAll(selector)].map(text).filter(Boolean);
  }

  function snapshot(){
    const glucose=collect('#bgGrid .bg-card').map(x=>x.replace(/mg\/dL/gi,'').trim());
    const meals=collect('#todayMealGrid .meal-card');
    const previousDoses=collect('#prevDoseGrid .prev-dose');
    const context=collect('#contextBadges .badge');
    const feedback=text(document.getElementById('previousFeedbackBody'));
    const feedbackSection=document.getElementById('previousFeedback');
    const feedbackVisible=feedbackSection&&!feedbackSection.classList.contains('hidden')&&Boolean(feedback);
    return {glucose,meals,previousDoses,context,feedback:feedbackVisible?feedback:''};
  }

  function row(label,values,kind=''){
    if(!values?.length)return '';
    return `<div class="decision-strip-row ${kind}"><span class="decision-strip-label">${label}</span><div class="decision-strip-values">${values.map(v=>`<span>${v}</span>`).join('')}</div></div>`;
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

  function sourceSections(){
    return [document.getElementById('prescriptionContext'),document.getElementById('todayMealGrid')?.closest('section')].filter(Boolean);
  }

  function setSourcesCompacted(compacted){
    sourceSections().forEach(section=>{
      section.classList.toggle(COMPACTED_CLASS,Boolean(compacted));
      if(compacted)section.setAttribute('aria-hidden','true');
      else section.removeAttribute('aria-hidden');
    });
    const btn=document.getElementById(DETAILS_ID);
    if(btn){
      btn.textContent=compacted?'詳細を表示':'詳細を閉じる';
      btn.setAttribute('aria-expanded',String(!compacted));
    }
  }

  function detailsButton(){
    return `<button type="button" id="${DETAILS_ID}" class="decision-strip-details-btn" aria-expanded="false">詳細を表示</button>`;
  }

  function bindDetails(){
    const btn=document.getElementById(DETAILS_ID);
    if(!btn||btn.dataset.bound==='1')return;
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      const compacted=sourceSections().some(section=>section.classList.contains(COMPACTED_CLASS));
      setSourcesCompacted(!compacted);
    });
  }

  function render(){
    const strip=ensureStrip();
    if(!strip)return;
    const s=snapshot();
    const html=[
      row('病態',s.context,'context'),
      row('直近4検',s.glucose,'glucose'),
      row('今日の食事',s.meals,'meal'),
      row('前回処方',s.previousDoses,'dose'),
      s.feedback?`<div class="decision-strip-feedback"><span class="decision-strip-label">前日の1点</span><span>${s.feedback}</span></div>`:'',
      detailsButton()
    ].filter(Boolean).join('');
    strip.innerHTML=html;
    strip.classList.toggle('hidden',!html);
    setFeedbackMirrored(Boolean(s.feedback));
    bindDetails();
    // Once the summary contains the decision-critical information, the two
    // larger source cards become an opt-in detail view. They stay in the DOM
    // as the app.js-rendered source of truth and as a fallback for debugging.
    setSourcesCompacted(Boolean(s.glucose.length&&s.meals.length&&s.previousDoses.length));
  }

  function installStyles(){
    if(document.getElementById('prescriptionDecisionStripStyle'))return;
    const style=document.createElement('style');
    style.id='prescriptionDecisionStripStyle';
    style.textContent=`
      .prescription-decision-strip{margin:0 0 12px;padding:10px 11px;border:1px solid #e4e7ec;border-radius:14px;background:#f8f9fb;display:grid;gap:7px}
      .decision-strip-row{display:grid;grid-template-columns:62px minmax(0,1fr);gap:7px;align-items:start}
      .decision-strip-label{font-size:9px;line-height:1.35;font-weight:850;letter-spacing:.03em;color:#7b828c;white-space:nowrap}
      .decision-strip-values{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
      .decision-strip-values span{min-width:0;padding:4px 3px;border-radius:8px;background:#fff;text-align:center;font-size:10px;line-height:1.2;font-weight:760;color:#3f4650;overflow:hidden;text-overflow:ellipsis}
      .decision-strip-row.context .decision-strip-values,.decision-strip-row.meal .decision-strip-values{grid-template-columns:repeat(3,minmax(0,1fr))}
      .decision-strip-feedback{display:grid;grid-template-columns:62px minmax(0,1fr);gap:7px;padding-top:7px;border-top:1px solid #e4e7ec;font-size:10px;line-height:1.35;color:#4d5560}
      .decision-strip-details-btn{justify-self:end;border:0;background:transparent;padding:2px 0;font:inherit;font-size:9px;font-weight:800;color:#69717d;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
      #previousFeedback.${MIRRORED_CLASS}{display:none!important}
      .${COMPACTED_CLASS}{display:none!important}
      @media(max-width:430px){
        .prescription-decision-strip{margin-bottom:9px;padding:9px}
        .decision-strip-row,.decision-strip-feedback{grid-template-columns:56px minmax(0,1fr);gap:5px}
        .decision-strip-values{gap:3px}
        .decision-strip-values span{font-size:9px;padding:4px 2px}
        .decision-strip-feedback{font-size:9px}
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
    ['bgGrid','todayMealGrid','prevDoseGrid','contextBadges','previousFeedback','previousFeedbackBody','doseGrid'].forEach(observe);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.PrescriptionDecisionStrip={snapshot,render,setFeedbackMirrored,setSourcesCompacted,version:'1.2.0'};
})();
