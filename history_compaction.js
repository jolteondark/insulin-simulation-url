(function(){
  'use strict';

  const RECENT_VISIBLE_DAYS=2;
  const ROOT_ID='runHistoryBody';
  const MOBILE_QUERY='(max-width: 520px)';
  let scheduled=false;
  let mobileExpanded=false;

  function ensureStyle(){
    if(document.getElementById('historyCompactionStyle'))return;
    const style=document.createElement('style');
    style.id='historyCompactionStyle';
    style.textContent=`
      .history-archive{margin:0 0 10px;border:1px solid #e6e8ed;border-radius:14px;background:#f8f9fb;overflow:hidden}
      .history-archive summary{cursor:pointer;list-style:none;padding:11px 13px;font-size:10px;font-weight:800;letter-spacing:.04em;color:#666f7b;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .history-archive summary::-webkit-details-marker{display:none}
      .history-archive summary::after{content:'＋';font-size:15px;font-weight:650;color:#8b919a}
      .history-archive[open] summary::after{content:'−'}
      .history-archive-body{padding:0 10px 2px}
      .history-recent-label{font-size:9px;font-weight:800;letter-spacing:.06em;color:#8b919a;margin:2px 0 6px}
      .history-mobile-toggle{display:none;margin-left:auto;border:1px solid #d9dde4;border-radius:999px;background:#fff;padding:6px 10px;font:inherit;font-size:10px;font-weight:800;color:#5f6772;cursor:pointer}
      @media(max-width:520px){
        #runHistory .section-title{display:flex;align-items:center;gap:8px}
        .history-mobile-toggle{display:inline-flex;align-items:center;justify-content:center;min-height:32px}
        #runHistoryBody[hidden]{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function isHistoryCard(node){
    return node&&node.nodeType===1&&!node.classList.contains('history-archive')&&!node.classList.contains('history-recent-label');
  }

  function fmtDose(value){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    return n.toFixed(n%1?1:0);
  }

  function annotateBasalDelivery(body){
    if(typeof state==='undefined'||!Array.isArray(state?.history))return 0;
    const cards=Array.from(body.children).filter(isHistoryCard);
    let updated=0;
    cards.forEach((card,index)=>{
      const rec=state.history[index];
      if(!rec)return;
      const doseHeading=Array.from(card.children).find(el=>el?.textContent?.trim()==='実投与');
      const doseGrid=doseHeading?.nextElementSibling;
      const basalCell=doseGrid?.children?.[3];
      if(!basalCell)return;
      const parts=basalCell.children;
      if(!parts||parts.length<2)return;
      const active=fmtDose(rec.activeBasal);
      const ordered=fmtDose(rec.order?.basal_u);
      parts[0].textContent='実効 basal';
      parts[1].textContent=active;
      if(parts[2])parts[2].textContent=`今夜処方 ${ordered} U`;
      basalCell.setAttribute('data-effective-basal-u',active);
      basalCell.setAttribute('data-ordered-basal-u',ordered);
      updated++;
    });
    return updated;
  }

  function compactHistory(){
    const body=document.getElementById(ROOT_ID);
    if(!body)return;
    // app.js stores the basal that actually drove today's glucose separately
    // from the basal ordered tonight for the following day. The legacy history
    // card rendered the latter under the "実投与" heading, which could teach the
    // wrong cause-and-effect relationship. Correct the visible history before
    // archiving cards, without changing simulation state or physiology.
    annotateBasalDelivery(body);
    if(body.querySelector(':scope > .history-archive'))return;
    const cards=Array.from(body.children).filter(isHistoryCard);
    if(cards.length<=RECENT_VISIBLE_DAYS)return;

    const older=cards.slice(0,-RECENT_VISIBLE_DAYS);
    const recent=cards.slice(-RECENT_VISIBLE_DAYS);
    const details=document.createElement('details');
    details.className='history-archive';
    const summary=document.createElement('summary');
    summary.textContent=`過去 ${older.length} 日を表示`;
    const archiveBody=document.createElement('div');
    archiveBody.className='history-archive-body';
    older.forEach(card=>archiveBody.appendChild(card));
    details.append(summary,archiveBody);

    const label=document.createElement('div');
    label.className='history-recent-label';
    label.textContent=`直近 ${RECENT_VISIBLE_DAYS} 日`;
    body.replaceChildren(details,label,...recent);
  }

  function setMobileHistoryState(media,body,toggle){
    if(!media.matches){
      body.hidden=false;
      toggle.setAttribute('aria-expanded','true');
      toggle.textContent='履歴を表示';
      return;
    }
    body.hidden=!mobileExpanded;
    toggle.setAttribute('aria-expanded',String(mobileExpanded));
    toggle.textContent=mobileExpanded?'履歴を閉じる':'履歴を表示';
  }

  function initMobileToggle(body){
    const section=document.getElementById('runHistory');
    const title=section&&section.querySelector('.section-title');
    if(!title)return;
    let toggle=title.querySelector('.history-mobile-toggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='history-mobile-toggle';
      toggle.setAttribute('aria-controls',ROOT_ID);
      title.appendChild(toggle);
    }
    const media=window.matchMedia(MOBILE_QUERY);
    toggle.addEventListener('click',()=>{
      if(!media.matches)return;
      mobileExpanded=!mobileExpanded;
      setMobileHistoryState(media,body,toggle);
    });
    const sync=()=>{
      if(!media.matches)mobileExpanded=false;
      setMobileHistoryState(media,body,toggle);
    };
    if(typeof media.addEventListener==='function')media.addEventListener('change',sync);
    else if(typeof media.addListener==='function')media.addListener(sync);
    sync();
  }

  function scheduleCompact(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      compactHistory();
    });
  }

  function init(){
    ensureStyle();
    const body=document.getElementById(ROOT_ID);
    if(!body)return;
    initMobileToggle(body);
    new MutationObserver(scheduleCompact).observe(body,{childList:true});
    compactHistory();
  }

  // Small stable surface for education-loop regression tests. This intentionally
  // exposes only presentation helpers; it does not expose or mutate physiology.
  window.HistoryCompaction={annotateBasalDelivery,fmtDose};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
