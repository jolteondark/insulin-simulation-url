(function(){
  const STORAGE_KEY='ward_glucose_learning_curve_v1';
  const DAY_COLUMNS=[
    'case_id','day','safe','discharge_grade','used_scale','min','max',
    'rapid_over','rapid_under','rapid_near','basal_over','basal_under','feedback_tags','recorded_at'
  ];

  function normalize(raw){
    const x=raw&&typeof raw==='object'?raw:{};
    return {
      schema_version:2,
      exported_at:new Date().toISOString(),
      days:Array.isArray(x.days)?x.days:[],
      cases:Array.isArray(x.cases)?x.cases:[],
      objectives:Array.isArray(x.objectives)?x.objectives:[],
      active_objective:x.active_objective||null
    };
  }

  function educationReport(snapshot){
    const analyzer=typeof window!=='undefined'?window.WardLearningAnalysis:null;
    if(!analyzer||typeof analyzer.summarize!=='function')return null;
    return analyzer.summarize(snapshot);
  }

  function load(){
    let data;
    try{data=normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'))}
    catch{data=normalize({})}
    data.education_report=educationReport(data);
    return data;
  }

  function csvCell(value){
    if(value==null)return '';
    const s=String(value);
    return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  }

  function dayRow(d){
    const p=d?.prescribing||{};
    return {
      case_id:d?.case_id||'',
      day:d?.day??'',
      safe:d?.safe??'',
      discharge_grade:d?.discharge_grade??'',
      used_scale:d?.used_scale??'',
      min:d?.min??'',
      max:d?.max??'',
      rapid_over:p.rapid_over??'',
      rapid_under:p.rapid_under??'',
      rapid_near:p.rapid_near??'',
      basal_over:p.basal_over??'',
      basal_under:p.basal_under??'',
      feedback_tags:Array.isArray(d?.feedback_tags)?d.feedback_tags.join('|'):'',
      recorded_at:d?.recorded_at||''
    };
  }

  function daysCsv(snapshot){
    const data=snapshot&&Array.isArray(snapshot.days)?snapshot:load();
    const rows=[DAY_COLUMNS.join(',')];
    for(const d of data.days){
      const r=dayRow(d);
      rows.push(DAY_COLUMNS.map(k=>csvCell(r[k])).join(','));
    }
    return rows.join('\n')+'\n';
  }

  function safeStamp(iso){return String(iso||'').replace(/[:.]/g,'-')}

  function downloadText(filename,text,type){
    const blob=new Blob([text],{type:type||'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }

  function exportJson(){
    const data=load();
    downloadText(`ward-glucose-learning-${safeStamp(data.exported_at)}.json`,JSON.stringify(data,null,2),'application/json;charset=utf-8');
  }

  function exportCsv(){
    const data=load();
    downloadText(`ward-glucose-days-${safeStamp(data.exported_at)}.csv`,daysCsv(data),'text/csv;charset=utf-8');
  }

  function installUI(){
    if(typeof document==='undefined'||document.querySelector('#learningDataExport'))return;
    const anchor=document.querySelector('#runHistory');
    if(!anchor)return;
    const box=document.createElement('section');
    box.id='learningDataExport';
    box.className='section-block';
    box.style.marginTop='16px';
    box.innerHTML=`
      <div class="section-title"><span>E</span> 学習データ</div>
      <div class="micro-note">JSONには日次・症例履歴に加え、画面の「学習効果サマリー」と同じ定義のeducation_reportを含めます。患者個人情報は含みません。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button type="button" class="ghost-btn" id="exportLearningJson">JSONを保存</button>
        <button type="button" class="ghost-btn" id="exportLearningCsv">日次CSVを保存</button>
      </div>`;
    anchor.insertAdjacentElement('afterend',box);
    box.querySelector('#exportLearningJson')?.addEventListener('click',exportJson);
    box.querySelector('#exportLearningCsv')?.addEventListener('click',exportCsv);
  }

  window.WardLearningDataExport={load,normalize,educationReport,dayRow,daysCsv,exportJson,exportCsv,installUI,version:'2.0.0'};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});
    else installUI();
  }
})();
