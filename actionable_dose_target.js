// Visually links yesterday's actionable feedback to the corresponding dose input.
// Uses existing education_feedback primary tags; does not create a new clinical decision rule.
(function(root){
  const TARGET_CLASS='actionable-dose-target';
  const BADGE_CLASS='decision-strip-dose-target';
  const HINT_ID='actionableDoseTargetHint';

  // Clinical/educational tag meaning belongs to WardFeedbackActionSemantics.
  // This module owns only the Web-specific mapping from canonical dose_key to DOM/UI.
  const doseUiTargets={
    basal_u:{doseKey:'basal',inputId:'dose_basal_u',label:'眠前 basal'},
    breakfast_u:{doseKey:'breakfast',inputId:'dose_breakfast_u',label:'朝 rapid'},
    lunch_u:{doseKey:'lunch',inputId:'dose_lunch_u',label:'昼 rapid'},
    dinner_u:{doseKey:'dinner',inputId:'dose_dinner_u',label:'夕 rapid'}
  };
  const objectiveDoseTargets={
    basal:doseUiTargets.basal_u,
    breakfast_rapid:doseUiTargets.breakfast_u,
    lunch_rapid:doseUiTargets.lunch_u,
    dinner_rapid:doseUiTargets.dinner_u
  };
  let lastAutoFocusKey='';

  function fallbackRuleForTag(tag){
    // Compatibility for old/partial embeddings that do not load the shared semantic
    // module. Infer the canonical key from the stable tag grammar instead of carrying
    // a second eight-entry rule table that can drift from WardFeedbackActionSemantics.
    const value=String(tag||'');
    const match=value.match(/^(basal|breakfast_rapid|lunch_rapid|dinner_rapid)_(excess|deficit)$/);
    if(!match)return null;
    const domain=match[1];
    const dose_key=domain==='basal'?'basal_u':domain.replace('_rapid','_u');
    return {dose_key,direction:match[2]==='deficit'?1:-1,feedback_tag:value};
  }

  function semanticRuleForTag(tag){
    const shared=root?.WardFeedbackActionSemantics;
    if(shared&&typeof shared.ruleForTag==='function')return shared.ruleForTag(tag);
    return fallbackRuleForTag(tag);
  }

  function directionGlyph(direction){
    return direction===1?'↑':direction===-1?'↓':'';
  }

  function targetForTag(tag){
    const rule=semanticRuleForTag(tag);
    if(!rule)return null;
    const ui=doseUiTargets[String(rule.dose_key||'')];
    if(!ui)return null;
    return {...ui,tag:String(tag),direction:directionGlyph(rule.direction)};
  }

  function targetForObjective(objective){
    if(!objective)return null;
    const tagged=targetForTag(objective.focus_tag);
    if(tagged)return {...tagged,source:'active_objective'};
    const domain=objectiveDoseTargets[String(objective.domain_id||'')];
    return domain?{...domain,tag:null,direction:'',source:'active_objective'}:null;
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
      // Within a case, yesterday's directional feedback is the immediate next-dose
      // handoff. At a fresh case boundary, however, terminal routing owns the next
      // learning objective. Prefer that canonical objective even when it carries only
      // a dose domain and no directional focus_tag; this keeps the first edited field
      // aligned with the routed teaching target without inventing an up/down rule.
      if(carry.source==='previous_case'){
        const objective=root?.FeedbackCarryover?.activeObjective?.();
        if(objective){
          const routed=targetForObjective(objective);
          return routed?{...routed,evidence:''}:null;
        }
        // Compatibility path for older carryover helpers that exposed only focus_tag.
        const routedTag=root?.FeedbackCarryover?.activeFocusTag?.();
        if(routedTag){
          const routed=targetForTag(routedTag);
          return routed?{...routed,evidence:'',source:'active_objective'}:null;
        }
      }
      const target=targetForTag(carry.tag);
      if(!target)return null;
      return {...target,evidence:evidenceForCarry(carry),source:carry.source||'carryover'};
    }catch{return null}
  }

  function currentDayKey(target){
    const day=(document.getElementById('dayNo')?.textContent||'').trim();
    const caseId=(document.getElementById('caseId')?.textContent||'').trim();
    if(!day||!target?.inputId)return '';
    // DAY resets to 1 for every new patient. Include the rendered case identity so
    // the same routed dose focus can autofocus again at the next-case boundary,
    // while repeated DOM churn inside one patient/day remains suppressed.
    return [caseId||'case',day,target.inputId,target.tag||'domain'].join(':');
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
    // Focus only once per day/target so later DOM updates never steal focus while typing.
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
      if(target.tag)card.dataset.actionableFeedbackTag=target.tag;
      else delete card.dataset.actionableFeedbackTag;
      if(target.direction)card.dataset.actionableDirection=target.direction;
      else delete card.dataset.actionableDirection;
      if(target.evidence)card.dataset.actionableEvidence=target.evidence;
      else delete card.dataset.actionableEvidence;
    }
    if(input&&input.getAttribute('aria-describedby')!==HINT_ID)input.setAttribute('aria-describedby',HINT_ID);

    // Keep the causal glucose point, target and direction beside the existing
    // "次に変える1点" text. All three are derived from the already-selected
    // education feedback/routing state, so this adds no new dosing rule or unit recommendation.
    const feedback=document.querySelector('#prescriptionDecisionStrip .decision-strip-feedback');
    const direction=target.direction?` ${target.direction}`:'';
    const action='対象：'+target.label+direction;
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
    ['previousFeedback','previousFeedbackBody','learningFocus','prescriptionDecisionStrip','doseGrid','resultPanel','dayNo','caseId'].forEach(observe);
  }

  const tagTargets={};
  const sharedRules=root?.WardFeedbackActionSemantics?.RULES||{};
  for(const tag of Object.keys(sharedRules)){
    const target=targetForTag(tag);
    if(target)tagTargets[tag]={doseKey:target.doseKey,inputId:target.inputId,label:target.label,direction:target.direction};
  }

  const api={currentTarget,targetForTag,targetForObjective,currentDayKey,resultIsVisible,autoFocusTarget,applyTarget,evidenceForCarry,semanticRuleForTag,doseUiTargets,tagTargets,objectiveDoseTargets,version:'1.8.0'};
  if(root)root.ActionableDoseTarget=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
