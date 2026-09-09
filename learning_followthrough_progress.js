(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.LearningFollowthroughProgress=api;
    api.mount(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const GROUP_N=3;
  const TARGET_LABELS={
    breakfast_u:'朝rapid',
    lunch_u:'昼rapid',
    dinner_u:'夕rapid',
    basal_u:'basal'
  };

  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}
  function deltaText(x){
    if(x==null)return '—';
    const n=Math.round(x);
    if(n>=10)return `改善 +${n}pt`;
    if(n<=-10)return `低下 ${n}pt`;
    return `ほぼ維持 ${n>0?'+':''}${n}pt`;
  }
  function load(r){
    try{return JSON.parse(r.localStorage.getItem(STORAGE_KEY)||'{}')||{}}
    catch{return {}}
  }
  function orderedTraces(data){
    const records=data?.completion_records&&typeof data.completion_records==='object'?data.completion_records:{};
    const cases=Array.isArray(data?.cases)?data.cases:[];
    const seen=new Set();
    const rows=[];
    for(const c of cases){
      const id=c?.case_id;
      const trace=records?.[id]?.case_learning_trace;
      if(!id||!trace||trace.version<2||seen.has(id))continue;
      const ft=trace.feedback_followthrough;
      if(!ft||!Array.isArray(ft.actions)||finite(ft.opportunities)==null)continue;
      seen.add(id);
      rows.push({case_id:id,followthrough:ft});
    }
    for(const [id,record] of Object.entries(records)){
      if(seen.has(id))continue;
      const trace=record?.case_learning_trace,ft=trace?.feedback_followthrough;
      if(!trace||trace.version<2||!ft||!Array.isArray(ft.actions)||finite(ft.opportunities)==null)continue;
      rows.push({case_id:id,followthrough:ft});
    }
    return rows;
  }
  function pool(rows){
    let opportunities=0,followed=0,unchanged=0,opposite=0;
    const by_target={};
    for(const row of rows){
      const ft=row.followthrough||{};
      opportunities+=Math.max(0,finite(ft.opportunities)||0);
      followed+=Math.max(0,finite(ft.followed)||0);
      unchanged+=Math.max(0,finite(ft.unchanged)||0);
      opposite+=Math.max(0,finite(ft.opposite)||0);
      for(const action of Array.isArray(ft.actions)?ft.actions:[]){
        const key=action?.dose_key;
        if(!TARGET_LABELS[key])continue;
        const x=by_target[key]||(by_target[key]={opportunities:0,followed:0,unchanged:0,opposite:0,rate:null});
        x.opportunities++;
        if(action.status==='followed')x.followed++;
        else if(action.status==='unchanged')x.unchanged++;
        else if(action.status==='opposite')x.opposite++;
        x.rate=x.opportunities?x.followed/x.opportunities:null;
      }
    }
    return {cases:rows.length,opportunities,followed,unchanged,opposite,rate:opportunities?followed/opportunities:null,by_target};
  }
  function summarize(data){
    const rows=orderedTraces(data);
    const all=pool(rows);
    if(rows.length<4)return {ready:false,n:rows.length,group_n:0,all,early:null,recent:null,delta_pp:null};
    const groupN=Math.min(GROUP_N,Math.floor(rows.length/2));
    const early=pool(rows.slice(0,groupN));
    const recent=pool(rows.slice(-groupN));
    const deltaPp=early.rate==null||recent.rate==null?null:100*(recent.rate-early.rate);
    return {ready:true,n:rows.length,group_n:groupN,all,early,recent,delta_pp:deltaPp};
  }
  function targetRows(summary){
    const recent=summary?.recent||summary?.all;
    if(!recent)return [];
    return Object.entries(recent.by_target||{})
      .filter(([,x])=>x.opportunities>0)
      .sort((a,b)=>b[1].opportunities-a[1].opportunities||TARGET_LABELS[a[0]].localeCompare(TARGET_LABELS[b[0]],'ja'))
      .map(([key,x])=>`${TARGET_LABELS[key]} ${x.followed}/${x.opportunities}（${pct(x.rate)}）`);
  }
  function renderHtml(summary){
    if(!summary)return '';
    if(!summary.all?.opportunities){
      return '<div id="feedbackFollowthroughProgress" class="micro-note" style="margin-top:8px"><b>feedback→次処方：</b>評価できるdose変更機会がまだありません。</div>';
    }
    if(!summary.ready){
      return `<div id="feedbackFollowthroughProgress" class="micro-note" style="margin-top:8px"><b>feedback→次処方：</b>${summary.all.followed}/${summary.all.opportunities}回で推奨方向へ変更（${pct(summary.all.rate)}）。${summary.n}/4症例。4症例完了後から初期→最近を比較します。</div>`;
    }
    const targets=targetRows(summary);
    const targetText=targets.length?`<br><span>最近の部位別：${targets.join(' ／ ')}</span>`:'';
    return `<div id="feedbackFollowthroughProgress" class="micro-note" style="margin-top:8px"><b>feedback→次処方：</b>初期${summary.group_n}症例 ${summary.early.followed}/${summary.early.opportunities}（${pct(summary.early.rate)}） → 最近${summary.group_n}症例 ${summary.recent.followed}/${summary.recent.opportunities}（${pct(summary.recent.rate)}） ／ <b>${deltaText(summary.delta_pp)}</b>。最近は変更なし ${summary.recent.unchanged}回、逆方向 ${summary.recent.opposite}回。${targetText}</div>`;
  }
  function refresh(rArg){
    const r=rArg||root;
    if(!r?.document)return null;
    const host=r.document.querySelector('#caseLearningProgress');
    if(!host)return null;
    host.querySelector?.('#feedbackFollowthroughProgress')?.remove?.();
    const summary=summarize(load(r));
    host.insertAdjacentHTML?.('beforeend',renderHtml(summary));
    return summary;
  }
  function deferredRefresh(r){setTimeout(()=>refresh(r),0)}
  function mount(rArg){
    const r=rArg||root;
    if(!r?.document||r.__learningFollowthroughProgressMounted)return;
    r.__learningFollowthroughProgressMounted=true;
    r.document.querySelector('#submitBtn')?.addEventListener('click',()=>deferredRefresh(r));
    r.document.querySelector('#newCaseBtn')?.addEventListener('click',()=>deferredRefresh(r));
    r.addEventListener?.('ward:caseLearningOutcomeUpdated',()=>deferredRefresh(r));
    r.addEventListener?.('storage',event=>{if(!event?.key||event.key===STORAGE_KEY)deferredRefresh(r)});
    deferredRefresh(r);
  }
  return {orderedTraces,pool,summarize,targetRows,renderHtml,refresh,mount,TARGET_LABELS,version:'1.0.0'};
});
