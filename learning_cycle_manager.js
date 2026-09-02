(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardLearningCycleManager=api;
    if(typeof document!=='undefined'){
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(root),{once:true});
      else api.mount(root);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const META_KEY='ward_glucose_learning_cycle_meta_v1';
  const ARCHIVE_KEY='ward_glucose_learning_cycle_archives_v1';
  const TARGET_CASES=100;
  const MAX_ARCHIVES=12;

  function parse(raw,fallback){try{return JSON.parse(raw)}catch{return fallback}}
  function completedCases(data){return (Array.isArray(data?.cases)?data.cases:[]).filter(c=>c?.case_id&&['discharged','game_over'].includes(c.outcome))}
  function caseCount(data){return completedCases(data).length}
  function defaultMeta(now){return {schema_version:1,block_number:1,started_at:now||new Date().toISOString()}}
  function normalizeMeta(meta,now){const x=meta&&typeof meta==='object'?meta:{};return {schema_version:1,block_number:Math.max(1,Number(x.block_number)||1),started_at:x.started_at||now||new Date().toISOString()}}
  function loadData(store){return parse(store.getItem(STORAGE_KEY)||'{}',{})||{}}
  function loadMeta(store,now){return normalizeMeta(parse(store.getItem(META_KEY)||'{}',{}),now)}
  function loadArchives(store){const x=parse(store.getItem(ARCHIVE_KEY)||'[]',[]);return Array.isArray(x)?x:[]}
  function resetLearningPayload(){return {days:[],cases:[],objectives:[],active_objective:null}}
  function buildArchive(snapshot,meta,completedAt){return {schema_version:1,block_number:meta.block_number,started_at:meta.started_at,completed_at:completedAt,case_count:caseCount(snapshot),snapshot}}

  function startNextBlock(store,snapshot,now){
    const raw=snapshot&&typeof snapshot==='object'?snapshot:loadData(store);
    const n=caseCount(raw);
    if(n<TARGET_CASES)return {ok:false,reason:'incomplete',case_count:n,target_cases:TARGET_CASES};
    const stamp=now||new Date().toISOString();
    const meta=loadMeta(store,stamp);
    const archive=buildArchive(raw,meta,stamp);
    const archives=[...loadArchives(store),archive].slice(-MAX_ARCHIVES);
    const nextMeta={schema_version:1,block_number:meta.block_number+1,started_at:stamp};
    // Archive first, then clear the active learning block. A failed write therefore does not
    // intentionally discard the only copy of a completed 100-case block.
    store.setItem(ARCHIVE_KEY,JSON.stringify(archives));
    store.setItem(STORAGE_KEY,JSON.stringify(resetLearningPayload()));
    store.setItem(META_KEY,JSON.stringify(nextMeta));
    return {ok:true,archived_block:meta.block_number,next_block:nextMeta.block_number,archive_count:archives.length,case_count:n};
  }

  function ensureMeta(store){
    const existing=parse(store.getItem(META_KEY)||'{}',{});
    const meta=normalizeMeta(existing);
    if(!existing?.started_at||!existing?.block_number)store.setItem(META_KEY,JSON.stringify(meta));
    return meta;
  }

  function ensureUI(root){
    const doc=root.document;if(!doc||doc.querySelector('#learningCycleManager'))return doc?.querySelector('#learningCycleManager')||null;
    const anchor=doc.querySelector('#finalLearningDebrief')||doc.querySelector('#learningDataExport');if(!anchor)return null;
    const box=doc.createElement('section');box.id='learningCycleManager';box.className='section-block';box.style.marginTop='16px';
    box.innerHTML='<div class="section-title"><span>B</span> 100症例ブロック</div><div id="learningCycleManagerBody"></div>';
    anchor.insertAdjacentElement('afterend',box);return box;
  }

  function refresh(root){
    const store=root.localStorage,box=ensureUI(root),body=box?.querySelector('#learningCycleManagerBody');if(!store||!body)return;
    const raw=loadData(store),meta=ensureMeta(store),n=caseCount(raw),archives=loadArchives(store);
    const complete=n>=TARGET_CASES;
    body.innerHTML=`<div class="micro-note">ブロック ${meta.block_number}：<b>${Math.min(n,TARGET_CASES)}/${TARGET_CASES}</b> 症例完了。完了ブロックのローカル退避 ${archives.length}件。</div>
      <div class="micro-note" style="margin-top:6px">100症例到達後は最終JSONを保存し、完了ブロックをブラウザ内にも退避してから、学習履歴だけを次の100本用に初期化します。</div>
      <button type="button" class="ghost-btn" id="startNextLearningBlock" ${complete?'':'disabled'} style="margin-top:10px">${complete?'最終成績を保存して次の100本を開始':'100症例完了後に次ブロックを開始'}</button>`;
    const btn=body.querySelector('#startNextLearningBlock');
    btn?.addEventListener('click',()=>{
      const current=loadData(store);if(caseCount(current)<TARGET_CASES){refresh(root);return}
      const ok=typeof root.confirm==='function'?root.confirm('現在の100症例ブロックをJSON保存・ローカル退避して、学習履歴を次の100本用に初期化します。現在表示中の患者も新しい症例へ切り替わります。実行しますか？'):true;
      if(!ok)return;
      try{root.WardLearningDataExport?.exportJson?.()}catch(e){console.error('learning cycle export',e)}
      const snapshot=root.WardLearningDataExport?.load?.()||current;
      const out=startNextBlock(store,snapshot);
      if(!out.ok){refresh(root);return}
      try{root.location?.reload?.()}catch{refresh(root)}
    },{once:true});
  }

  function mount(root){refresh(root)}
  return {parse,completedCases,caseCount,defaultMeta,normalizeMeta,loadData,loadMeta,loadArchives,resetLearningPayload,buildArchive,startNextBlock,ensureMeta,refresh,mount,STORAGE_KEY,META_KEY,ARCHIVE_KEY,TARGET_CASES,MAX_ARCHIVES,version:'1.0.0'};
});