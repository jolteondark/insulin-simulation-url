(function(){
  const POC_MIN=80;
  const POC_MAX=180;
  const HIDDEN_MIN=70;
  const HIDDEN_MAX=250;
  const REQUIRED_DAYS=2;

  function stableScaleFreeDay(rec){
    if(!rec?.result)return false;
    if(rec.result.correction_scale)return false;
    const bg=rec.result.bg||{};
    const values=['pre_breakfast','pre_lunch','pre_dinner','bedtime'].map(k=>Number(bg[k]));
    if(values.some(v=>!Number.isFinite(v)||v<POC_MIN||v>POC_MAX))return false;
    const mn=Number(rec.result.min),mx=Number(rec.result.max);
    return Number.isFinite(mn)&&Number.isFinite(mx)&&mn>=HIDDEN_MIN&&mx<=HIDDEN_MAX;
  }

  function consecutiveStableScaleFreeDays(history){
    let n=0;
    for(let i=(history||[]).length-1;i>=0;i--){
      if(!stableScaleFreeDay(history[i]))break;
      n++;
    }
    return n;
  }

  function eligible(history){return consecutiveStableScaleFreeDays(history)>=REQUIRED_DAYS}

  function progressText(history){
    const n=Math.min(REQUIRED_DAYS,consecutiveStableScaleFreeDays(history));
    return `退院条件：スケールOFFで4検80–180 mg/dL、hidden 70–250 mg/dLを${REQUIRED_DAYS}日連続（現在 ${n}/${REQUIRED_DAYS}日）`;
  }

  function mount(){
    if(typeof document==='undefined')return;
    const submit=document.querySelector('#submitBtn');
    if(!submit||submit.dataset.dischargeRuleMounted)return;
    submit.dataset.dischargeRuleMounted='1';
    submit.addEventListener('click',()=>setTimeout(()=>{
      try{
        if(typeof state==='undefined'||!state?.history?.length)return;
        const rec=state.history[state.history.length-1];
        if(!rec?.result||rec.result.min<70||rec.result.max>400)return;
        const panel=document.querySelector('#resultPanel');
        if(!panel)return;
        if(eligible(state.history)){
          state.over=true;
          submit.disabled=true;
          panel.className='result-panel ok';
          panel.innerHTML=`<div class="result-kicker">DISCHARGE</div><div class="result-title">退院可能です</div><div class="result-text">補正スケールを使わず、定時インスリンのみで安全な血糖推移を${REQUIRED_DAYS}日連続で維持できました。</div><div class="result-text" style="margin-top:7px">4検は80–180 mg/dL、hidden glucoseは70–250 mg/dLの範囲です。</div><button class="next-btn" id="restartBtn">新しい患者へ</button>`;
          document.querySelector('#restartBtn').onclick=()=>startGenerated();
        }else{
          const note=document.createElement('div');
          note.className='result-text';
          note.style.marginTop='7px';
          note.textContent=progressText(state.history);
          panel.insertBefore(note,panel.querySelector('.next-btn'));
        }
      }catch(e){console.error('discharge rule',e)}
    },0));
  }

  window.DischargeRule={stableScaleFreeDay,consecutiveStableScaleFreeDays,eligible,progressText,version:'1.0.0'};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})();