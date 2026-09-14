(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WardFeedbackActionSemantics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const RULES={
    basal_excess:{dose_key:'basal_u',direction:-1,label:'basal↓'},
    basal_deficit:{dose_key:'basal_u',direction:1,label:'basal↑'},
    breakfast_rapid_excess:{dose_key:'breakfast_u',direction:-1,label:'朝rapid↓'},
    breakfast_rapid_deficit:{dose_key:'breakfast_u',direction:1,label:'朝rapid↑'},
    lunch_rapid_excess:{dose_key:'lunch_u',direction:-1,label:'昼rapid↓'},
    lunch_rapid_deficit:{dose_key:'lunch_u',direction:1,label:'昼rapid↑'},
    dinner_rapid_excess:{dose_key:'dinner_u',direction:-1,label:'夕rapid↓'},
    dinner_rapid_deficit:{dose_key:'dinner_u',direction:1,label:'夕rapid↑'}
  };

  function finite(x){
    const n=Number(x);
    return Number.isFinite(n)?n:null;
  }

  function directionSign(direction){
    if(direction===1||direction==='↑')return 1;
    if(direction===-1||direction==='↓')return -1;
    return null;
  }

  function ruleForTag(tag){
    const rule=RULES[String(tag||'')];
    return rule?{...rule,feedback_tag:String(tag)}:null;
  }

  function classifyDelta(after,before,direction){
    const now=finite(after),prior=finite(before),sign=directionSign(direction);
    if(now==null||prior==null||sign==null)return null;
    const delta=now-prior;
    const status=delta===0?'unchanged':delta*sign>0?'followed':'opposite';
    return {status,delta};
  }

  function classifyTag(tag,before,after){
    const rule=ruleForTag(tag);
    if(!rule)return null;
    const response=classifyDelta(after,before,rule.direction);
    if(!response)return null;
    return {...rule,before_u:finite(before),after_u:finite(after),delta_u:response.delta,status:response.status};
  }

  return {RULES,ruleForTag,directionSign,classifyDelta,classifyTag,version:'1.0.0'};
});
