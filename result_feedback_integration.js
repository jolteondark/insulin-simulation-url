(function(root){
  function ensureStyle(){
    if(typeof document==='undefined'||document.getElementById('resultFeedbackIntegrationStyle'))return;
    const style=document.createElement('style');
    style.id='resultFeedbackIntegrationStyle';
    style.textContent=`.result-glance .result-glance-feedback{margin:8px 0 0;padding:9px 0 0;border:0;border-top:1px solid rgba(120,128,140,.18);border-radius:0;background:transparent;box-shadow:none}.result-glance .result-glance-feedback .feedback-title{font-size:12px;font-weight:800;margin:0 0 3px;letter-spacing:.02em}.result-glance .result-glance-feedback .feedback-evidence{font-size:12px;line-height:1.35;color:#666e78;margin:0 0 4px}.result-glance .result-glance-feedback .feedback-primary{font-size:13px;line-height:1.45;margin:0}.result-glance .result-glance-feedback .feedback-details{margin-top:4px}.result-glance .result-glance-feedback .feedback-details>summary{font-size:12px;min-height:32px;display:flex;align-items:center}.result-glance .result-glance-feedback .feedback-list{font-size:12px;line-height:1.4;margin:4px 0 0;padding-left:18px}`;
    document.head.appendChild(style);
  }

  function numOrNull(x){
    if(x===null||x===undefined||x==='')return null;
    const n=Number(x);
    return Number.isFinite(n)?n:null;
  }

  function fmt(x){
    const n=numOrNull(x);
    if(n===null)return '—';
    return Number.isInteger(n)?String(n):n.toFixed(1);
  }

  function correction(rec,key){
    return Number(rec?.result?.correction_doses_u?.[key])||0;
  }

  function actualRapid(rec,key){
    return (Number(rec?.order?.[`${key}_u`])||0)+correction(rec,key);
  }

  function evidenceText(rec,tag){
    if(!rec||!tag)return '';
    const bg=rec?.result?.bg||{};
    const rapid={
      breakfast_rapid_excess:['昼前',bg.pre_lunch,'朝',actualRapid(rec,'breakfast')],
      breakfast_rapid_deficit:['昼前',bg.pre_lunch,'朝',actualRapid(rec,'breakfast')],
      lunch_rapid_excess:['夕前',bg.pre_dinner,'昼',actualRapid(rec,'lunch')],
      lunch_rapid_deficit:['夕前',bg.pre_dinner,'昼',actualRapid(rec,'lunch')],
      dinner_rapid_excess:['眠前',bg.bedtime,'夕',actualRapid(rec,'dinner')],
      dinner_rapid_deficit:['眠前',bg.bedtime,'夕',actualRapid(rec,'dinner')]
    }[tag];
    if(rapid){
      const glucose=numOrNull(rapid[1]);
      if(glucose===null)return '';
      return `確認値：${rapid[0]} ${Math.round(glucose)} mg/dL / ${rapid[2]}rapid 実投与 ${fmt(rapid[3])} U`;
    }
    if(tag==='basal_excess'||tag==='basal_deficit'){
      const glucose=numOrNull(bg.pre_breakfast);
      const basal=numOrNull(rec?.activeBasal);
      if(glucose===null||basal===null)return '';
      return `確認値：朝前 ${Math.round(glucose)} mg/dL / 前夜からの実効basal ${fmt(basal)} U`;
    }
    if(tag==='hidden_low_near_miss'){
      const min=numOrNull(rec?.result?.min);
      return min===null?'':`確認値：hidden最低 ${Math.round(min)} mg/dL`;
    }
    if(tag==='hidden_high_excursion'){
      const max=numOrNull(rec?.result?.max);
      return max===null?'':`確認値：hidden最高 ${Math.round(max)} mg/dL`;
    }
    if(tag==='scale_dependence'){
      const entries=[['朝',correction(rec,'breakfast')],['昼',correction(rec,'lunch')],['夕',correction(rec,'dinner')]].filter(([,x])=>x>0);
      return entries.length?`確認値：scale追加 ${entries.map(([label,x])=>`${label} +${fmt(x)} U`).join(' / ')}`:'';
    }
    return '';
  }

  function attachEvidence(feedback,rec){
    if(!feedback||feedback.querySelector('.feedback-evidence'))return false;
    const tag=rec?.education_feedback?.primary_tag||null;
    const text=evidenceText(rec,tag);
    if(!text)return false;
    const line=document.createElement('div');
    line.className='feedback-evidence';
    line.textContent=text;
    const primary=feedback.querySelector('.feedback-primary');
    if(primary)feedback.insertBefore(line,primary);
    else feedback.appendChild(line);
    return true;
  }

  function integrate(){
    if(typeof document==='undefined')return false;
    const panel=document.querySelector('#resultPanel');
    if(!panel||panel.classList.contains('hidden'))return false;
    const glance=panel.querySelector('.result-glance');
    const feedback=panel.querySelector('.daily-feedback');
    if(!glance||!feedback)return false;
    const rec=typeof state!=='undefined'&&state?.history?.length?state.history[state.history.length-1]:null;
    attachEvidence(feedback,rec);
    if(glance.contains(feedback))return false;
    const details=glance.querySelector('.result-glance-details');
    if(details)glance.insertBefore(feedback,details);
    else glance.appendChild(feedback);
    feedback.classList.add('result-glance-feedback');
    return true;
  }

  function schedule(){
    setTimeout(integrate,0);
  }

  function onClick(event){
    if(event?.target?.id==='submitBtn')schedule();
  }

  function mount(){
    if(typeof document==='undefined'||document.documentElement?.dataset?.resultFeedbackIntegrationMounted)return;
    if(document.documentElement)document.documentElement.dataset.resultFeedbackIntegrationMounted='1';
    ensureStyle();
    document.addEventListener('click',onClick);
    integrate();
  }

  const api={ensureStyle,evidenceText,attachEvidence,integrate,schedule,onClick,mount,version:'1.3.1'};
  if(root)root.ResultFeedbackIntegration=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
