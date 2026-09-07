// Visually links yesterday's actionable feedback to the corresponding dose input.
// Uses existing education_feedback primary tags; does not create a new clinical decision rule.
(function(root){
  const TARGET_CLASS='actionable-dose-target';
  const BADGE_CLASS='decision-strip-dose-target';
  const HINT_ID='actionableDoseTargetHint';
  const tagTargets={
    basal_excess:{inputId:'dose_basal_u',label:'眠前 basal'},
    basal_deficit:{inputId:'dose_basal_u',label:'眠前 basal'},
    breakfast_rapid_excess:{inputId:'dose_breakfast_u',label:'朝 rapid'},
    breakfast_rapid_deficit:{inputId:'dose_breakfast_u',label:'朝 rapid'},
    lunch_rapid_excess:{inputId:'dose_lunch_u',label:'昼 rapid'},
    lunch_rapid_deficit:{inputId:'dose_lunch_u',label:'昼 rapid'},
    dinner_rapid_excess:{inputId:'dose_dinner_u',label:'夕 rapid'},
    dinner_rapid_deficit:{inputId:'dose_dinner_u',label:'夕 rapid'}
  };

  function currentTarget(){
    try{
      const carry=root?.FeedbackCarryover?.latestCarryover?.();
      if(!carry?.tag)return null;
      // latestCarryover intentionally survives even when its separate text block
      // is hidden because LEARNING FOCUS duplicates the same instruction.
      return tagTargets[carry.tag]?{...tagTargets[carry.tag],tag:carry.tag}:null;
    }catch{return null}
  }

  function removeStaleTargets(targetInputId=null){
    document.querySelectorAll('.dose-input-card.'+TARGET_CLASS).forEach(card=>{
      const input=card.querySelector('input');
      if(!targetInputId||input?.id!==targetInputId){
        card.classList.remove(TARGET_CLASS);
        delete card.dataset.actionableFeedbackTag;
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
    if(card)card.dataset.actionableFeedbackTag=target.tag;
    if(input&&input.getAttribute('aria-describedby')!==HINT_ID)input.setAttribute('aria-describedby',HINT_ID);

    // Keep the mapping visible beside the existing "次に変える1点" text so the
    // learner can move directly from feedback to the matching input below.
    const feedback=document.querySelector('#prescriptionDecisionStrip .decision-strip-feedback');
    const expected='対象：'+target.label;
    let badge=document.querySelector('.'+BADGE_CLASS);
    if(!feedback){
      if(badge)badge.remove();
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
    ['previousFeedback','previousFeedbackBody','learningFocus','prescriptionDecisionStrip','doseGrid','resultPanel'].forEach(observe);
  }

  const api={currentTarget,applyTarget,tagTargets,version:'1.0.1'};
  if(root)root.ActionableDoseTarget=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
