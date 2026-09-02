(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardCaseLearningTrace=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';

  function currentState(r){
    try{if(typeof state!=='undefined')return state}catch{}
    return r?.state||null;
  }
  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function copyDose(x){
    const out={};
    for(const k of ['breakfast_u','lunch_u','dinner_u','basal_u'])out[k]=finite(x?.[k]);
    return out;
  }
  function copyMeal(x){
    const out={};
    for(const k of ['breakfast','lunch','dinner'])out[k]=finite(x?.[k]);
    return out;
  }
  function copyBg(x){
    const out={};
    for(const k of ['pre_breakfast','pre_lunch','pre_dinner','bedtime'])out[k]=finite(x?.[k]);
    return out;
  }
  function correction(rec){
    const c=rec?.result?.correction_doses_u||{};
    return {
      breakfast:finite(c.breakfast)||0,
      lunch:finite(c.lunch)||0,
      dinner:finite(c.dinner)||0
    };
  }
  function actualDelivered(rec){
    const c=correction(rec),o=rec?.order||{};
    return {
      breakfast_u:(finite(o.breakfast_u)||0)+c.breakfast,
      lunch_u:(finite(o.lunch_u)||0)+c.lunch,
      dinner_u:(finite(o.dinner_u)||0)+c.dinner,
      basal_u:finite(rec?.activeBasal)
    };
  }
  function feedback(rec){
    const f=rec?.education_feedback||{};
    return {
      primary_tag:typeof f.primary_tag==='string'?f.primary_tag:null,
      primary_text:typeof f.primary_text==='string'?f.primary_text:null,
      tags:Array.isArray(f.tags)?[...new Set(f.tags.filter(x=>typeof x==='string'))]:[]
    };
  }
  function dayTrace(rec){
    return {
      day:finite(rec?.day),
      previous_order_u:copyDose(rec?.previousOrder),
      prescribed_order_u:copyDose(rec?.order),
      intake_fraction:copyMeal(rec?.intake),
      correction_scale_on:Boolean(rec?.result?.correction_scale),
      correction_doses_u:correction(rec),
      actual_delivered_u:actualDelivered(rec),
      four_point_bg_mg_dl:copyBg(rec?.result?.bg),
      hidden_min_mg_dl:finite(rec?.result?.min),
      hidden_max_mg_dl:finite(rec?.result?.max),
      feedback:feedback(rec)
    };
  }
  function buildCaseTrace(s){
    if(!s?.case?.case_id||!Array.isArray(s.history)||!s.history.length)return null;
    return {
      version:1,
      case_id:s.case.case_id,
      outcome:s.over?(s.history.some(r=>finite(r?.result?.min)<70||finite(r?.result?.max)>400)?'game_over':'discharged'):'incomplete',
      context:{
        egfr_ml_min_1_73m2:finite(s.case?.egfr_ml_min_1_73m2),
        infection_severity:finite(s.case?.infection_severity),
        prednisone_mg:finite(s.case?.prednisone_mg)
      },
      days:s.history.map(dayTrace),
      recorded_at:new Date().toISOString()
    };
  }
  function load(r){
    try{return JSON.parse(r.localStorage.getItem(STORAGE_KEY)||'{}')||{}}
    catch{return {}}
  }
  function save(r,data){r.localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
  function attach(rArg){
    const r=rArg||root,s=currentState(r);
    if(!s?.over||!s?.case?.case_id)return null;
    const trace=buildCaseTrace(s);
    if(!trace)return null;
    const data=load(r),caseId=s.case.case_id;
    const records=data.completion_records&&typeof data.completion_records==='object'?data.completion_records:{};
    const prior=records[caseId]&&typeof records[caseId]==='object'?records[caseId]:{};
    const existing=prior.case_learning_trace;
    if(existing?.version===1&&Array.isArray(existing.days)&&existing.days.length===trace.days.length)return existing;
    data.completion_records={...records,[caseId]:{...prior,case_learning_trace:trace}};
    save(r,data);
    return trace;
  }
  function attachAfterTerminal(r){setTimeout(()=>attach(r),0)}
  function mount(r){
    if(!r?.document)return;
    r.document.querySelector('#submitBtn')?.addEventListener('click',()=>attachAfterTerminal(r));
    attachAfterTerminal(r);
  }
  return {dayTrace,buildCaseTrace,attach,mount,version:'1.0.0'};
});
