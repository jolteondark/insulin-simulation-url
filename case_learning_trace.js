(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardCaseLearningTrace=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const DOSE_FEEDBACK={
    basal_excess:{dose_key:'basal_u',direction:-1,label:'basal↓'},
    basal_deficit:{dose_key:'basal_u',direction:1,label:'basal↑'},
    breakfast_rapid_excess:{dose_key:'breakfast_u',direction:-1,label:'朝rapid↓'},
    breakfast_rapid_deficit:{dose_key:'breakfast_u',direction:1,label:'朝rapid↑'},
    lunch_rapid_excess:{dose_key:'lunch_u',direction:-1,label:'昼rapid↓'},
    lunch_rapid_deficit:{dose_key:'lunch_u',direction:1,label:'昼rapid↑'},
    dinner_rapid_excess:{dose_key:'dinner_u',direction:-1,label:'夕rapid↓'},
    dinner_rapid_deficit:{dose_key:'dinner_u',direction:1,label:'夕rapid↑'}
  };

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

  function feedbackAction(day,nextDay){
    const tag=day?.feedback?.primary_tag;
    const rule=DOSE_FEEDBACK[tag];
    if(!rule||!nextDay)return null;
    const before=finite(day?.prescribed_order_u?.[rule.dose_key]);
    const after=finite(nextDay?.prescribed_order_u?.[rule.dose_key]);
    if(before==null||after==null)return null;
    const delta=after-before;
    const followed=delta*rule.direction>0;
    const unchanged=delta===0;
    return {
      feedback_tag:tag,
      label:rule.label,
      dose_key:rule.dose_key,
      expected_direction:rule.direction,
      before_u:before,
      after_u:after,
      delta_u:delta,
      status:followed?'followed':unchanged?'unchanged':'opposite'
    };
  }

  function feedbackFollowthrough(days){
    const xs=Array.isArray(days)?days:[];
    const actions=[];
    for(let i=0;i<xs.length-1;i++){
      const action=feedbackAction(xs[i],xs[i+1]);
      if(action)actions.push(action);
    }
    const followed=actions.filter(x=>x.status==='followed').length;
    const unchanged=actions.filter(x=>x.status==='unchanged').length;
    const opposite=actions.filter(x=>x.status==='opposite').length;
    const by_target={};
    for(const action of actions){
      const key=action.dose_key;
      const x=by_target[key]||(by_target[key]={opportunities:0,followed:0,unchanged:0,opposite:0,rate:null});
      x.opportunities++;
      x[action.status]++;
      x.rate=x.followed/x.opportunities;
    }
    return {
      opportunities:actions.length,
      followed,
      unchanged,
      opposite,
      rate:actions.length?followed/actions.length:null,
      by_target,
      actions
    };
  }

  function buildCaseTrace(s){
    if(!s?.case?.case_id||!Array.isArray(s.history)||!s.history.length)return null;
    const days=s.history.map(dayTrace);
    return {
      version:2,
      case_id:s.case.case_id,
      outcome:s.over?(s.history.some(r=>finite(r?.result?.min)<70||finite(r?.result?.max)>400)?'game_over':'discharged'):'incomplete',
      context:{
        egfr_ml_min_1_73m2:finite(s.case?.egfr_ml_min_1_73m2),
        infection_severity:finite(s.case?.infection_severity),
        prednisone_mg:finite(s.case?.prednisone_mg)
      },
      days,
      feedback_followthrough:feedbackFollowthrough(days),
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
    if(existing?.version===2&&Array.isArray(existing.days)&&existing.days.length===trace.days.length)return existing;
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
  return {dayTrace,feedbackAction,feedbackFollowthrough,buildCaseTrace,attach,mount,DOSE_FEEDBACK,version:'2.0.0'};
});
