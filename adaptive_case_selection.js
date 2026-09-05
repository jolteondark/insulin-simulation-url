(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardAdaptiveCaseSelection=api;
    if(root.PatientGenerator&&typeof root.PatientGenerator.generate==='function'&&!root.PatientGenerator.__adaptiveWrapped){
      const rawGenerate=root.PatientGenerator.generate.bind(root.PatientGenerator);
      root.PatientGenerator.generate=function(seed){return api.selectStored(rawGenerate,seed)};
      root.PatientGenerator.__adaptiveWrapped=true;
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1',MIN_STREAK=2,POOL=5;
  const MAX_DRIFT={cf_mg_dl_u:12,icr_g_u:3,basal_fraction_tdd:.08,insulin_action_peak_min:25,insulin_action_half_life_min:45,fasting_setpoint_mg_dl:12,previous_day_bg_mg_dl:30};
  const DOMAIN_FOCUS={
    basal:{point:'pre_breakfast',target:120,desired_deviation:25},
    breakfast_rapid:{point:'pre_lunch',target:140,desired_deviation:35},
    lunch_rapid:{point:'pre_dinner',target:140,desired_deviation:35},
    dinner_rapid:{point:'bedtime',target:160,desired_deviation:35}
  };
  const DOMAIN_TAGS={
    basal:['basal_excess','basal_deficit'],
    breakfast_rapid:['breakfast_rapid_excess','breakfast_rapid_deficit'],
    lunch_rapid:['lunch_rapid_excess','lunch_rapid_deficit'],
    dinner_rapid:['dinner_rapid_excess','dinner_rapid_deficit']
  };
  const FEEDBACK_DIRECTION={
    basal_excess:'low',basal_deficit:'high',
    breakfast_rapid_excess:'low',breakfast_rapid_deficit:'high',
    lunch_rapid_excess:'low',lunch_rapid_deficit:'high',
    dinner_rapid_excess:'low',dinner_rapid_deficit:'high'
  };
  function isAdaptiveObjective(o){return Boolean(o&&(Number(o.persistent_streak)>=MIN_STREAK||o.selection_reason==='longitudinal'))}
  function recentFocusTag(data,objective){
    const allowed=DOMAIN_TAGS[objective?.domain_id]||[];if(!allowed.length)return null;
    const cases=(Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome)).slice(-3);
    const ids=new Set(cases.map(c=>c.case_id)),days=(Array.isArray(data?.days)?data.days:[]).filter(d=>ids.has(d?.case_id));
    const counts=new Map(allowed.map(tag=>[tag,{tag,count:0,last:-1}]));
    days.forEach((d,i)=>{for(const tag of new Set(Array.isArray(d?.feedback_tags)?d.feedback_tags:[])){const row=counts.get(tag);if(row){row.count++;row.last=i}}});
    const rows=[...counts.values()].filter(x=>x.count>0).sort((a,b)=>b.count-a.count||b.last-a.last||a.tag.localeCompare(b.tag));
    return rows[0]?.tag||null;
  }
  function loadObjective(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'),o=x.active_objective;if(!isAdaptiveObjective(o))return null;return {...o,focus_tag:o.focus_tag||recentFocusTag(x,o)}}catch{return null}}
  function finiteNumber(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function directionalTarget(spec,focusTag){const direction=FEEDBACK_DIRECTION[focusTag]||null;if(!direction)return null;return direction==='low'?-spec.desired_deviation:spec.desired_deviation}
  function focusMeasure(bundle,domain,focusTag=null){
    const p=bundle.patient||{},bg=bundle.case?.previous_day_4point_bg_mg_dl||{},spec=DOMAIN_FOCUS[domain];
    if(spec){const value=finiteNumber(bg[spec.point]),desiredSigned=directionalTarget(spec,focusTag);if(value==null)return {kind:'poc_signal',point:spec.point,value:null,target:spec.target,deviation:null,signed_deviation:null,desired_deviation:spec.desired_deviation,desired_signed_deviation:desiredSigned,focus_tag:focusTag||null};const signed=value-spec.target;return {kind:'poc_signal',point:spec.point,value,target:spec.target,deviation:Math.abs(signed),signed_deviation:signed,desired_deviation:spec.desired_deviation,desired_signed_deviation:desiredSigned,focus_tag:focusTag||null}}
    if(domain==='scale_dependence'){const refs=[['pre_breakfast',120],['pre_lunch',140],['pre_dinner',140]],deviations=refs.map(([point,target])=>{const value=finiteNumber(bg[point]);return value==null?null:{point,value,target,deviation:Math.abs(value-target)}}).filter(Boolean),strongest=deviations.sort((a,b)=>b.deviation-a.deviation)[0]||null;return {kind:'correction_signal',strongest,desired_deviation:35,cf_mg_dl_u:finiteNumber(p.cf_mg_dl_u),focus_tag:focusTag||null}}
    if(domain==='hidden_awareness')return {kind:'pk_signal',peak_min:finiteNumber(p.insulin_action_peak_min),half_life_min:finiteNumber(p.insulin_action_half_life_min),focus_tag:focusTag||null};
    return {kind:'sensitivity_signal',cf_mg_dl_u:finiteNumber(p.cf_mg_dl_u),focus_tag:focusTag||null};
  }
  function score(bundle,domain,focusTag=null){const p=bundle.patient||{},measure=focusMeasure(bundle,domain,focusTag);if(measure.kind==='poc_signal'&&measure.deviation!=null){if(measure.desired_signed_deviation!=null)return Math.abs(measure.signed_deviation-measure.desired_signed_deviation)/Math.max(measure.desired_deviation,1);return Math.abs(measure.deviation-measure.desired_deviation)/Math.max(measure.desired_deviation,1)}if(measure.kind==='correction_signal'&&measure.strongest){const signal=Math.abs(measure.strongest.deviation-measure.desired_deviation)/measure.desired_deviation,cf=Number(p.cf_mg_dl_u)||50;return signal+.20*Math.abs(cf-45)/25}if(domain==='hidden_awareness'){const peak=Number(p.insulin_action_peak_min)||80,half=Number(p.insulin_action_half_life_min)||160;return Math.abs(peak-78)/30+Math.abs(half-160)/80}const cf=Number(p.cf_mg_dl_u)||50;return Math.abs(cf-45)/25}
  function finiteDelta(a,b){const x=Number(a),y=Number(b);return Number.isFinite(x)&&Number.isFinite(y)?Math.abs(x-y):0}
  function driftFromStandard(bundle,standard){const p=bundle.patient||{},q=standard.patient||{},c=bundle.case||{},d=standard.case||{},checks={cf_mg_dl_u:finiteDelta(p.cf_mg_dl_u,q.cf_mg_dl_u),icr_g_u:finiteDelta(p.icr_g_u,q.icr_g_u),basal_fraction_tdd:finiteDelta(p.basal_fraction_tdd,q.basal_fraction_tdd),insulin_action_peak_min:finiteDelta(p.insulin_action_peak_min,q.insulin_action_peak_min),insulin_action_half_life_min:finiteDelta(p.insulin_action_half_life_min,q.insulin_action_half_life_min),fasting_setpoint_mg_dl:finiteDelta(p.fasting_setpoint_mg_dl,q.fasting_setpoint_mg_dl)},bg=c.previous_day_4point_bg_mg_dl||{},baseBg=d.previous_day_4point_bg_mg_dl||{};let bgMax=0;for(const key of ['pre_breakfast','pre_lunch','pre_dinner','bedtime'])bgMax=Math.max(bgMax,finiteDelta(bg[key],baseBg[key]));checks.previous_day_bg_mg_dl=bgMax;const violations=Object.entries(checks).filter(([key,value])=>value>MAX_DRIFT[key]).map(([key,value])=>({key,value,limit:MAX_DRIFT[key]}));return {checks,violations,allowed:violations.length===0}}
  function routingContext(objective){
    return {
      selection_reason:objective?.selection_reason||null,
      objective_source_rate:finiteNumber(objective?.source_rate),
      longitudinal_recent_rate:finiteNumber(objective?.longitudinal_recent_rate),
      longitudinal_reference_rate:finiteNumber(objective?.longitudinal_reference_rate),
      longitudinal_delta:finiteNumber(objective?.longitudinal_delta)
    };
  }
  function select(generate,seed,objective){
    if(!isAdaptiveObjective(objective))return {...generate(seed),adaptive_selection:null};
    const focusTag=typeof objective?.focus_tag==='string'?objective.focus_tag:null;
    const xs=[];for(let i=0;i<POOL;i++){const s=(seed+i*0x9E3779B9)>>>0;try{const b=generate(s);xs.push({b,s,v:score(b,objective.domain_id,focusTag),focus:focusMeasure(b,objective.domain_id,focusTag)})}catch{}}
    if(!xs.length)throw new Error('No safe generated candidate available');const standard=xs[0];for(const x of xs)x.drift=driftFromStandard(x.b,standard.b);const eligible=xs.filter(x=>x.drift.allowed);eligible.sort((a,b)=>a.v-b.v||a.s-b.s);const pick=eligible[0]||standard;
    return {...pick.b,adaptive_selection:{domain_id:objective.domain_id,focus_tag:focusTag,persistent_streak:Number(objective.persistent_streak)||0,...routingContext(objective),pool_size:xs.length,eligible_pool_size:eligible.length,selected_seed:pick.s,standard_seed:standard.s,fallback_to_standard:pick.s===standard.s&&eligible.length===1,selected_score:pick.v,standard_score:standard.v,selected_focus:pick.focus,standard_focus:standard.focus,selected_drift:pick.drift,drift_limits:{...MAX_DRIFT},policy:'standard generator outputs only; persistent or longitudinally detected education objectives may bias selection toward a moderate visible prior-day signal in the matching POC domain and, when recent outcome feedback supplies a direction, preserve that high/low direction; every candidate retains normal physiology/safety gates and bounded drift from the standard same-seed case'}};
  }
  function selectStored(generate,seed){return select(generate,seed,loadObjective())}
  return {select,selectStored,loadObjective,recentFocusTag,isAdaptiveObjective,score,focusMeasure,directionalTarget,driftFromStandard,routingContext,MAX_DRIFT,DOMAIN_FOCUS,DOMAIN_TAGS,FEEDBACK_DIRECTION,MIN_STREAK,POOL,version:'1.4.0'};
});