// Visually links yesterday's actionable feedback to the corresponding dose input.
// Uses existing education_feedback primary tags; does not create a new clinical decision rule.
(function(root){
  const TARGET_CLASS='actionable-dose-target';
  const BADGE_CLASS='decision-strip-dose-target';
  const HINT_ID='actionableDoseTargetHint';
  // Single owner for primary feedback tag -> dose target resolution.
  // Result summaries and next-day focus should consume this mapping rather than
  // maintaining parallel tag tables that can drift apart.
  const tagTargets={
    basal_excess:{doseKey:'basal',inputId:'dose_basal_u',label:'眠前 basal',direction:'↓'},
    basal_deficit:{doseKey:'basal',inputId:'dose_basal_u',label:'眠前 basal',direction:'↑'},
    breakfast_rapid_excess:{doseKey:'breakfast',inputId:'dose_breakfast_u',label:'朝 rapid',direction:'↓'},
    breakfast_rapid_deficit:{doseKey:'breakfast',inputId:'dose_breakfast_u',label:'朝 rapid',direction:'↑'},
    lunch_rapid_excess:{doseKey:'lunch',inputId:'dose_lunch_u',label:'昼 rapid',direction:'↓'},
    lunch_rapid_deficit:{doseKey:'lunch',inputId:'dose_lunch_u',label:'昼 rapid',direction:'↑'},
    dinner_rapid_excess:{doseKey:'dinner',inputId:'dose_dinner_u',label:'夕 rapid',direction:'↓'},
    dinner_rapid_deficit:{doseKey:'dinner',inputId:'dose_dinner_u',label:'夕 rapid',direction:'↑'}
  };
  let lastAutoFocusKey='';

  function targetForTag(tag){
    const target=tagTargets[String(tag||'')];
    return target?{...target,tag:String(tag)}:null;
  }

  function evidenceForCarry(carry){
    const text=String(carry?.text||'');
    const point=text.match(/(朝前|昼前|夕前|眠前)\s+(\d+)\s+mg\/dL/);
    if(point)return `${point[1]} ${point[2]}`;
    return '';
  }

  function currentTarget(){
    try{
      const carry=root?.FeedbackCarryover?.latestCarryover?.();
      if(!carry?.tag)return null;
      // latestCarryover intentionally survives even when its separate text block
      // is hidden because LEARNING FOCUS duplicates the same instruction.
      const target=targetForTag(carry.tag);
      return target?{...target,evidence:evidenceForCarry(carry)}:null;
    }catch{return null}
  }

  function currentDayKey(target){
    const day=(document.getElementById('dayNo')?.textContent||'').trim();
    return day&&target?.tag?day+':'+target.tag:'';
  }

  function resultIsVisible(){
    const panel=document.getElementById('resultPanel');
    return Boolean(panel&&!panel.classList.contains('hidden'));
  }

  function autoFocusTarget(target,input){
    if(!target||!input||resultIsVisible())return;
    const key=currentDayKey(target);
    if(!key||key===lastAutoFocusKey)return;
    // Wait until the next-day navigation has finished restoring the order panel.
    // Focus only once per day/tag so later DOM updates never steal focus while typing.
    queueMicrotask(()=>{
      if(resultIsVisible())return;
      const current=currentTarget();
      if(!current||current.inputId!==target.inputId||current.tag!==target.tag)return;
      const liveInput=document.getElementById(target.inputId);
      if(!liveInput||liveInput.disabled)return;
      lastAutoFocusKey=key;
      try{
        liveInput.focus({preventScroll:false});
        if(typeof liveInput.select==='function')liveInput.select();
      }catch{}
    });
  }

  function removeStaleTargets(targetInputId=null){
    document.querySelectorAll('.dose-input-card.'+TARGET_CLASS).forEach(card=>{
      const input=card.querySelector('input');
      if(!targetInputId||input?.id!==targetInputId){
        card.classList.remove(TARGET_CLASS);
        delete card.dataset.actionableFeedbackTag;
        delete card.dataset.actionableEvidence;
        if(input?.getAttribute('aria-describedby')===HINT_ID)input.removeAttribute('aria-describedby');
      }
    });
  }

  function removeBadge(){
    document.querySelectorAll('.'+BADGE_CLASS).forEach(el=>el.remove());
  }

  function applyTarget(){
    if(typeof document==='undefined')return;
    const target=currentTarget();
    if(!target){
      removeStaleTargets();
      removeBadge();
      return;
    }

    removeStaleTargets(target.inputId);
    const input=document.getElementById(target.inputId);
    const card=input?.closest?.('.dose-input-card');
    if(card&&!card.classList.contains(TARGET_CLASS))card.classList.add(TARGET_CLASS);
    if(card){
      card.dataset.actionableFeedbackTag=target.tag;
      card.dataset.actionableDirection=target.direction;
      if(target.evidence)card.dataset.actionableEvidence=target.evidence;
      else delete card.dataset.actionableEvidence;
    }
    if(input&&input.getAttribute('aria-describedby')!==HINT_ID)input.setAttribute('aria-describedby',HINT_ID);

    // Keep the causal glucose point, target and direction beside the existing
    // "次に変える1点" text. All three are derived from the already-selected
    // education feedback, so this adds no new dosing rule or unit recommendation.
    const feedback=document.querySelector('#prescriptionDecisionStrip .decision-strip-feedback');
    const action='対象：'+target.label+' '+target.direction;
    const expected=target.evidence?target.evidence+' → '+action:action;
    let badge=document.querySelector('.'+BADGE_CLASS);
    if(!feedback){
      if(badge)badge.remove();
      autoFocusTarget(target,input);
      return;
    }
    if(badge&&badge.parentElement!==feedback){badge.remove();badge=null;}
    if(!badge){
      badge=document.createElement('span');
      badge.className=BADGE_CLASS;
      badge.id=HINT_ID;
      feedback.appendChild(badge);
    }
    if(badge.textContent!==expected)badge.textContent=expected;
    autoFocusTarget(target,input);
  }

  function installStyles(){
    if(document.getElementById('actionableDoseTargetStyle'))return;
    const style=document.createElement('style');
    style.id='actionableDoseTargetStyle';
    style.textContent=`
      .dose-input-card.${TARGET_CLASS}{outline:2px solid currentColor;outline-offset:2px}
      .dose-input-card.${TARGET_CLASS} label::after{content:' ← 次に見る';font-size:10px;font-weight:850;margin-left:4px;opacity:.72}
      .${BADGE_CLASS}{display:inline-flex;align-items:center;margin-left:8px;padding:2px 7px;border:1px solid currentColor;border-radius:999px;font-size:11px;font-weight:850;white-space:nowrap}
      @media(max-width:430px){.${BADGE_CLASS}{display:flex;width:max-content;margin:5px 0 0}}
    `;
    document.head.appendChild(style);
  }

  function observe(id){
    const el=document.getElementById(id);
    if(!el)return;
    new MutationObserver(()=>queueMicrotask(applyTarget)).observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function boot(){
    installStyles();
    applyTarget();
    ['previousFeedback','previousFeedbackBody','learningFocus','prescriptionDecisionStrip','doseGrid','resultPanel','dayNo'].forEach(observe);
  }

  const api={currentTarget,targetForTag,currentDayKey,resultIsVisible,autoFocusTarget,applyTarget,evidenceForCarry,tagTargets,version:'1.4.0'};
  if(root)root.ActionableDoseTarget=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
