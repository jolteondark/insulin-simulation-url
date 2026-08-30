(function(root){
  const POC_MIN=80;
  const POC_MAX=180;
  const HIDDEN_TARGET_MIN=70;
  const HIDDEN_TARGET_MAX=250;

  const slotSpec={
    pre_breakfast:{name:'朝前',focus:'前夜から効いていた basal',tagLow:'basal_excess',tagHigh:'basal_deficit'},
    pre_lunch:{name:'昼前',focus:'朝 rapid',doseKey:'breakfast_u',tagLow:'breakfast_rapid_excess',tagHigh:'breakfast_rapid_deficit'},
    pre_dinner:{name:'夕前',focus:'昼 rapid',doseKey:'lunch_u',tagLow:'lunch_rapid_excess',tagHigh:'lunch_rapid_deficit'},
    bedtime:{name:'眠前',focus:'夕 rapid',doseKey:'dinner_u',tagLow:'dinner_rapid_excess',tagHigh:'dinner_rapid_deficit'}
  };

  function finite(x){return Number.isFinite(Number(x))}
  function fmt(x){const n=Number(x);return Number.isInteger(n)?String(n):n.toFixed(1)}
  function correctionFor(rec,key){const k=key.replace('_u','');return Number(rec?.result?.correction_doses_u?.[k])||0}
  function actualRapid(rec,key){return Number(rec?.order?.[key]||0)+correctionFor(rec,key)}

  function analyze(rec,caseContext={}){
    const bg=rec?.result?.bg||{};
    const items=[];
    const tags=[];
    const seen=new Set();
    const addTag=t=>{if(t&&!seen.has(t)){seen.add(t);tags.push(t)}};

    for(const [key,spec] of Object.entries(slotSpec)){
      const value=Number(bg[key]);
      if(!Number.isFinite(value))continue;
      if(value<POC_MIN){
        addTag(spec.tagLow);
        let detail=`${spec.name} ${Math.round(value)} mg/dL：次処方では ${spec.focus} を減らす方向にまず再検討します。`;
        if(spec.doseKey){
          const extra=correctionFor(rec,spec.doseKey),actual=actualRapid(rec,spec.doseKey);
          if(extra>0)detail+=` この食事では定時 ${fmt(rec.order?.[spec.doseKey]||0)} U + scale ${fmt(extra)} U = 実投与 ${fmt(actual)} Uでした。`;
        }
        items.push({kind:'low',slot:key,tag:spec.tagLow,text:detail});
      }else if(value>POC_MAX){
        addTag(spec.tagHigh);
        let detail=`${spec.name} ${Math.round(value)} mg/dL：次処方では ${spec.focus} を増やす方向にまず再検討します。`;
        if(spec.doseKey){
          const extra=correctionFor(rec,spec.doseKey),actual=actualRapid(rec,spec.doseKey);
          if(extra>0)detail+=` この食事では定時 ${fmt(rec.order?.[spec.doseKey]||0)} U + scale ${fmt(extra)} U = 実投与 ${fmt(actual)} Uでした。`;
        }
        if(caseContext.infection_severity>0)detail+=' 感染によるインスリン抵抗性上昇も高血糖方向に作用します。';
        if(caseContext.prednisone_mg>0)detail+=' ステロイドも日中〜夕方の高血糖方向に作用します。';
        items.push({kind:'high',slot:key,tag:spec.tagHigh,text:detail});
      }
    }

    if(rec?.result?.correction_scale){
      addTag('scale_dependence');
      items.push({kind:'scale',tag:'scale_dependence',text:'補正スケールが発動しています。結果が良くても、scaleで救済された分を定時処方そのものの成功とは数えず、次日は定時量だけで安定するかを見直します。'});
    }

    const min=Number(rec?.result?.min),max=Number(rec?.result?.max);
    const pocValues=Object.keys(slotSpec).map(k=>Number(bg[k])).filter(Number.isFinite);
    if(Number.isFinite(min)&&min<POC_MIN&&pocValues.every(v=>v>=POC_MIN)){
      addTag('hidden_low_near_miss');
      items.push({kind:'hidden',tag:'hidden_low_near_miss',text:`4検では低血糖を捉えていませんが、hidden glucose は ${Math.round(min)} mg/dL まで低下しました。4検だけを見て増量しないことが重要です。`});
    }
    if(Number.isFinite(max)&&max>HIDDEN_TARGET_MAX&&pocValues.every(v=>v<=POC_MAX)){
      addTag('hidden_high_excursion');
      items.push({kind:'hidden',tag:'hidden_high_excursion',text:`4検は目標域でも、hidden glucose は ${Math.round(max)} mg/dL まで上昇しました。点の血糖だけで良好と判定せず、食後高血糖を残していないか確認します。`});
    }

    const stable=pocValues.length===4&&pocValues.every(v=>v>=POC_MIN&&v<=POC_MAX)&&finite(min)&&finite(max)&&min>=HIDDEN_TARGET_MIN&&max<=HIDDEN_TARGET_MAX&&!rec?.result?.correction_scale;
    if(!items.length&&stable)items.push({kind:'stable',tag:null,text:'4検とhidden glucoseが目標域で、補正スケールも不要でした。大きく処方を動かさず、同じ方針が翌日も再現するか確認する場面です。'});
    else if(!items.length)items.push({kind:'observe',tag:null,text:'致命的な逸脱はありません。4検だけでなくhidden glucoseと補正スケールの有無を確認してから次の処方を決めます。'});

    return {tags,items,stable};
  }

  function renderHtml(analysis){
    const heading=analysis.stable?'次の処方：維持して再現性を確認':'次の処方で見直す点';
    return `<div class="feedback-box daily-feedback"><div class="feedback-title">${heading}</div><ul class="feedback-list">${analysis.items.slice(0,4).map(x=>`<li>${x.text}</li>`).join('')}</ul></div>`;
  }

  function annotateLatest(){
    try{
      if(typeof state==='undefined'||!state?.history?.length||state.over)return;
      const rec=state.history[state.history.length-1];
      if(!rec?.result||Number(rec.result.min)<70||Number(rec.result.max)>400)return;
      const analysis=analyze(rec,state.case||{});
      rec.education_feedback={tags:[...analysis.tags],stable:analysis.stable,items:analysis.items.map(x=>x.text)};
      const panel=document.querySelector('#resultPanel');
      if(!panel||panel.querySelector('.daily-feedback'))return;
      const button=panel.querySelector('.next-btn');
      if(button)button.insertAdjacentHTML('beforebegin',renderHtml(analysis));
      else panel.insertAdjacentHTML('beforeend',renderHtml(analysis));
    }catch(e){console.error('daily feedback',e)}
  }

  function mount(){
    if(typeof document==='undefined')return;
    const submit=document.querySelector('#submitBtn');
    if(!submit||submit.dataset.dailyFeedbackMounted)return;
    submit.dataset.dailyFeedbackMounted='1';
    submit.addEventListener('click',()=>setTimeout(annotateLatest,5));
  }

  const api={analyze,renderHtml,version:'1.0.0'};
  if(root)root.DailyFeedback=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
