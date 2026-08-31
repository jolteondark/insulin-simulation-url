(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CaseLearningProgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const GROUP_N=3;

  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return {...x,days:Array.isArray(x.days)?x.days:[],cases:Array.isArray(x.cases)?x.cases:[]};
    }catch{return {days:[],cases:[]}}
  }

  function caseDays(data,caseId){return data.days.filter(d=>d.case_id===caseId)}
  function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}

  function caseMetric(data,caseId,metric){
    const days=caseDays(data,caseId);
    if(!days.length)return null;
    if(metric==='hypo_avoidance')return mean(days.map(d=>Number(d.min)>=70?1:0));
    if(metric==='rapid_control')return mean(days.map(d=>{
      const p=d.prescribing||{};
      return Number(p.rapid_over||0)+Number(p.rapid_under||0)===0?1:0;
    }));
    if(metric==='basal_control')return mean(days.map(d=>{
      const p=d.prescribing||{};
      return !p.basal_over&&!p.basal_under?1:0;
    }));
    if(metric==='scale_independence')return mean(days.map(d=>d.used_scale?0:1));
    return null;
  }

  const METRICS=[
    {id:'hypo_avoidance',label:'低血糖回避'},
    {id:'rapid_control',label:'rapid過不足'},
    {id:'basal_control',label:'basal調整'},
    {id:'scale_independence',label:'scale非依存'}
  ];

  function pooled(data,cases,metric){
    const xs=cases.map(c=>caseMetric(data,c.case_id,metric)).filter(v=>v!=null);
    return xs.length?mean(xs):null;
  }

  function summarize(data){
    const completed=(Array.isArray(data?.cases)?data.cases:[]).filter(c=>caseDays(data,c.case_id).length>0);
    if(completed.length<4)return {ready:false,n:completed.length,group_n:0,metrics:[]};
    const groupN=Math.min(GROUP_N,Math.floor(completed.length/2));
    const early=completed.slice(0,groupN),recent=completed.slice(-groupN);
    const metrics=METRICS.map(m=>{
      const before=pooled(data,early,m.id),now=pooled(data,recent,m.id);
      return {...m,early_rate:before,recent_rate:now,delta_pp:before==null||now==null?null:100*(now-before)};
    });
    return {ready:true,n:completed.length,group_n:groupN,metrics};
  }

  function pct(x){return x==null?'—':`${Math.round(100*x)}%`}
  function deltaText(x){
    if(x==null)return '—';
    const n=Math.round(x);
    if(n>=10)return `改善 +${n}pt`;
    if(n<=-10)return `悪化 ${n}pt`;
    return `ほぼ維持 ${n>0?'+':''}${n}pt`;
  }

  function renderHtml(summary){
    if(!summary.ready)return `<div id="caseLearningProgress" class="micro-note" style="margin-top:8px"><b>症例横断の学習変化：</b>${summary.n}/4症例。4症例完了後から、最近の症例で何が改善したかを表示します。</div>`;
    const cards=summary.metrics.map(m=>`<div class="prev-dose"><div class="name">${m.label}</div><div class="value" style="font-size:15px">${pct(m.early_rate)} → ${pct(m.recent_rate)}</div><div class="micro-note">${deltaText(m.delta_pp)}</div></div>`).join('');
    return `<div id="caseLearningProgress" style="margin-top:10px"><div class="micro-note"><b>症例横断の学習変化：</b>初期${summary.group_n}症例 → 最近${summary.group_n}症例</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">${cards}</div></div>`;
  }

  function refresh(){
    if(typeof document==='undefined')return;
    const body=document.querySelector('#caseDebriefBody');
    if(!body)return;
    const old=body.querySelector('#caseLearningProgress');
    if(old)old.remove();
    if(typeof state==='undefined'||!state?.over)return;
    body.insertAdjacentHTML('beforeend',renderHtml(summarize(load())));
  }

  function mount(){
    if(typeof document==='undefined')return;
    const submit=document.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',refresh);
    const next=document.querySelector('#newCaseBtn');
    if(next)next.addEventListener('click',refresh);
    const result=document.querySelector('#resultPanel');
    if(result&&!result.dataset.caseLearningProgressMounted){
      result.dataset.caseLearningProgressMounted='1';
      result.addEventListener('click',event=>{if(event.target?.closest?.('#restartBtn'))refresh();});
    }
    refresh();
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
  return {caseMetric,summarize,renderHtml,refresh,METRICS,version:'1.0.0'};
});
