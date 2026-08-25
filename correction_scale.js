(function(){
  const DEFAULTS={enabled:false,start_bg:121,bg_step:50,units_per_step:1};
  let cfg={...DEFAULTS};

  function positiveNumber(value,fallback){
    const n=Number(value);
    return Number.isFinite(n)&&n>0?n:fallback;
  }
  function normalize(raw={}){
    return {
      enabled:Boolean(raw.enabled),
      start_bg:positiveNumber(raw.start_bg,DEFAULTS.start_bg),
      bg_step:positiveNumber(raw.bg_step,DEFAULTS.bg_step),
      units_per_step:positiveNumber(raw.units_per_step,DEFAULTS.units_per_step),
    };
  }
  function correctionUnits(bg,raw=cfg){
    const c=normalize(raw),g=Number(bg);
    if(!c.enabled||!Number.isFinite(g)||g<70||g<c.start_bg)return 0;
    return (Math.floor((g-c.start_bg)/c.bg_step)+1)*c.units_per_step;
  }
  function rangeRows(raw=cfg,count=6){
    const c=normalize(raw),rows=[];
    for(let i=0;i<count;i++){
      const lo=c.start_bg+i*c.bg_step;
      const hi=lo+c.bg_step-1;
      rows.push({lo,hi,units:(i+1)*c.units_per_step});
    }
    return rows;
  }
  function current(){return normalize(cfg)}
  function readFromInputs(){
    const enabled=document.querySelector('#scaleEnabled');
    const start=document.querySelector('#scaleStartBg');
    const step=document.querySelector('#scaleBgStep');
    const units=document.querySelector('#scaleUnitsStep');
    cfg=normalize({
      enabled:enabled?.checked??cfg.enabled,
      start_bg:start?.value??cfg.start_bg,
      bg_step:step?.value??cfg.bg_step,
      units_per_step:units?.value??cfg.units_per_step,
    });
    renderPreview();
    return current();
  }
  function renderPreview(){
    const preview=document.querySelector('#scalePreview');
    if(!preview)return;
    const c=current();
    if(!c.enabled){
      preview.textContent='OFF：定時rapidのみ';
      return;
    }
    const rows=rangeRows(c,5).map(r=>`${Math.round(r.lo)}–${Math.round(r.hi)}:+${r.units}U`);
    preview.textContent=`${Math.round(c.start_bg)}未満:+0U / `+rows.join(' / ');
  }
  function mount(){
    if(document.querySelector('#correctionScaleCard'))return;
    const submit=document.querySelector('#submitBtn');
    if(!submit)return;
    const box=document.createElement('div');
    box.id='correctionScaleCard';
    box.style.cssText='margin:14px 0 16px;padding:14px;border:1px solid #e2e6eb;border-radius:16px;background:#f8f9fb';
    box.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
        <div><div style="font-size:9px;font-weight:800;letter-spacing:.08em;color:#858c96">CORRECTION SCALE</div><div style="font-size:14px;font-weight:800;margin-top:2px">食前血糖スケール</div></div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:750"><input id="scaleEnabled" type="checkbox"> 使用</label>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <label style="font-size:9px;color:#777">起点 mg/dL<input id="scaleStartBg" type="number" inputmode="numeric" min="70" step="1" value="121" style="width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #dfe3e8;border-radius:10px;background:#fff"></label>
        <label style="font-size:9px;color:#777">血糖幅 mg/dL<input id="scaleBgStep" type="number" inputmode="numeric" min="1" step="1" value="50" style="width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #dfe3e8;border-radius:10px;background:#fff"></label>
        <label style="font-size:9px;color:#777">1段あたり U<input id="scaleUnitsStep" type="number" inputmode="numeric" min="0.5" step="0.5" value="1" style="width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #dfe3e8;border-radius:10px;background:#fff"></label>
      </div>
      <div id="scalePreview" style="font-size:9px;line-height:1.5;color:#747b84;margin-top:9px"></div>
      <div style="font-size:9px;color:#9a5e38;margin-top:5px">起点未満および低血糖では補正0U。補正量は定時rapidへ追加されます。</div>`;
    submit.parentNode.insertBefore(box,submit);
    for(const id of ['scaleEnabled','scaleStartBg','scaleBgStep','scaleUnitsStep']){
      document.querySelector('#'+id)?.addEventListener('input',readFromInputs);
      document.querySelector('#'+id)?.addEventListener('change',readFromInputs);
    }
    readFromInputs();
  }

  window.CorrectionScale={current,correctionUnits,rangeRows,readFromInputs,version:'1.0.0'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
