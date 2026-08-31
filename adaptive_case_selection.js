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
  // Education-layer drift limits relative to the case standard generation would
  // have returned for the same seed. These are selector guardrails, not new
  // physiology acceptance targets.
  const MAX_DRIFT={
    cf_mg_dl_u:12,
    icr_g_u:3,
    basal_fraction_tdd:.08,
    insulin_action_peak_min:25,
    insulin_action_half_life_min:45,
    fasting_setpoint_mg_dl:12,
    previous_day_bg_mg_dl:30
  };

  function loadObjective(){
    try{
      const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      const o=x.active_objective;
      return o&&Number(o.persistent_streak)>=MIN_STREAK?o:null;
    }catch{return null}
  }

  function score(bundle,domain){
    const p=bundle.patient||{};
    const cf=Number(p.cf_mg_dl_u)||50,peak=Number(p.insulin_action_peak_min)||80,half=Number(p.insulin_action_half_life_min)||160,bf=Number(p.basal_fraction_tdd)||.5;
    if(domain==='hidden_awareness')return Math.abs(peak-78)/30+Math.abs(half-160)/80;
    if(domain==='basal')return Math.abs(cf-45)/25+Math.abs(bf-.5)/.2;
    if(domain==='scale_dependence')return Math.abs(cf-45)/25;
    return Math.abs(cf-45)/25;
  }

  function finiteDelta(a,b){
    const x=Number(a),y=Number(b);
    return Number.isFinite(x)&&Number.isFinite(y)?Math.abs(x-y):0;
  }

  function driftFromStandard(bundle,standard){
    const p=bundle.patient||{},q=standard.patient||{},c=bundle.case||{},d=standard.case||{};
    const checks={
      cf_mg_dl_u:finiteDelta(p.cf_mg_dl_u,q.cf_mg_dl_u),
      icr_g_u:finiteDelta(p.icr_g_u,q.icr_g_u),
      basal_fraction_tdd:finiteDelta(p.basal_fraction_tdd,q.basal_fraction_tdd),
      insulin_action_peak_min:finiteDelta(p.insulin_action_peak_min,q.insulin_action_peak_min),
      insulin_action_half_life_min:finiteDelta(p.insulin_action_half_life_min,q.insulin_action_half_life_min),
      fasting_setpoint_mg_dl:finiteDelta(p.fasting_setpoint_mg_dl,q.fasting_setpoint_mg_dl)
    };
    const bg=c.previous_day_4point_bg_mg_dl||{},baseBg=d.previous_day_4point_bg_mg_dl||{};
    let bgMax=0;
    for(const key of ['pre_breakfast','pre_lunch','pre_dinner','bedtime'])bgMax=Math.max(bgMax,finiteDelta(bg[key],baseBg[key]));
    checks.previous_day_bg_mg_dl=bgMax;
    const violations=Object.entries(checks).filter(([key,value])=>value>MAX_DRIFT[key]).map(([key,value])=>({key,value,limit:MAX_DRIFT[key]}));
    return {checks,violations,allowed:violations.length===0};
  }

  function select(generate,seed,objective){
    if(!objective||Number(objective.persistent_streak)<MIN_STREAK)return {...generate(seed),adaptive_selection:null};
    const xs=[];
    for(let i=0;i<POOL;i++){
      const s=(seed+i*0x9E3779B9)>>>0;
      try{const b=generate(s);xs.push({b,s,v:score(b,objective.domain_id)})}catch{}
    }
    if(!xs.length)throw new Error('No safe generated candidate available');
    const standard=xs[0];
    for(const x of xs)x.drift=driftFromStandard(x.b,standard.b);
    const eligible=xs.filter(x=>x.drift.allowed);
    eligible.sort((a,b)=>a.v-b.v||a.s-b.s);
    const pick=eligible[0]||standard;
    return {...pick.b,adaptive_selection:{
      domain_id:objective.domain_id,
      persistent_streak:Number(objective.persistent_streak),
      pool_size:xs.length,
      eligible_pool_size:eligible.length,
      selected_seed:pick.s,
      standard_seed:standard.s,
      fallback_to_standard:pick.s===standard.s&&eligible.length===1,
      selected_drift:pick.drift,
      drift_limits:{...MAX_DRIFT},
      policy:'standard generator outputs only; every candidate retains the normal physiology and prior-day safety gates; target-aware selection is additionally bounded to the standard same-seed case on core response traits and prior-day four-point difficulty, otherwise it falls back to standard generation without altering physiology, orders, context, or hidden answers'
    }};
  }

  function selectStored(generate,seed){return select(generate,seed,loadObjective())}
  return {select,selectStored,loadObjective,score,driftFromStandard,MAX_DRIFT,MIN_STREAK,POOL};
});
