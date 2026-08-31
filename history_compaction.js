(function(){
  'use strict';

  const RECENT_VISIBLE_DAYS=2;
  const ROOT_ID='runHistoryBody';
  let scheduled=false;

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
    `;
    document.head.appendChild(style);
  }

  function isHistoryCard(node){
    return node&&node.nodeType===1&&!node.classList.contains('history-archive')&&!node.classList.contains('history-recent-label');
  }

  function compactHistory(){
    const body=document.getElementById(ROOT_ID);
    if(!body||body.querySelector(':scope > .history-archive'))return;
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
    new MutationObserver(scheduleCompact).observe(body,{childList:true});
    compactHistory();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
