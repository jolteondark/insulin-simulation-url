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

  function select(generate,seed,objective){
    if(!objective||Number(objective.persistent_streak)<MIN_STREAK)return {...generate(seed),adaptive_selection:null};
    const xs=[];
    for(let i=0;i<POOL;i++){
      const s=(seed+i*0x9E3779B9)>>>0;
      try{const b=generate(s);xs.push({b,s,v:score(b,objective.domain_id)})}catch{}
    }
    if(!xs.length)throw new Error('No safe generated candidate available');
    xs.sort((a,b)=>a.v-b.v);
    const pick=xs[0];
    return {...pick.b,adaptive_selection:{
      domain_id:objective.domain_id,
      persistent_streak:Number(objective.persistent_streak),
      pool_size:xs.length,
      selected_seed:pick.s,
      policy:'standard generator outputs only; each candidate remains gate-valid and prior-day-surviving; select a moderate observable phenotype without altering physiology, orders, context, or player-visible answer'
    }};
  }

  function selectStored(generate,seed){return select(generate,seed,loadObjective())}
  return {select,selectStored,loadObjective,score,MIN_STREAK,POOL};
});
