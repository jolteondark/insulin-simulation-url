(function(root){
  function ensureStyle(){
    if(typeof document==='undefined'||document.getElementById('resultFeedbackIntegrationStyle'))return;
    const style=document.createElement('style');
    style.id='resultFeedbackIntegrationStyle';
    style.textContent=`.result-glance .result-glance-feedback{margin:8px 0 0;padding:9px 0 0;border:0;border-top:1px solid rgba(120,128,140,.18);border-radius:0;background:transparent;box-shadow:none}.result-glance .result-glance-feedback .feedback-title{font-size:12px;font-weight:800;margin:0 0 3px;letter-spacing:.02em}.result-glance .result-glance-feedback .feedback-primary{font-size:13px;line-height:1.45;margin:0}.result-glance .result-glance-feedback .feedback-details{margin-top:4px}.result-glance .result-glance-feedback .feedback-details>summary{font-size:12px;min-height:32px;display:flex;align-items:center}.result-glance .result-glance-feedback .feedback-list{font-size:12px;line-height:1.4;margin:4px 0 0;padding-left:18px}`;
    document.head.appendChild(style);
  }

  function integrate(){
    if(typeof document==='undefined')return false;
    const panel=document.querySelector('#resultPanel');
    if(!panel||panel.classList.contains('hidden'))return false;
    const glance=panel.querySelector('.result-glance');
    const feedback=panel.querySelector('.daily-feedback');
    if(!glance||!feedback||glance.contains(feedback))return false;
    const details=glance.querySelector('.result-glance-details');
    if(details)glance.insertBefore(feedback,details);
    else glance.appendChild(feedback);
    feedback.classList.add('result-glance-feedback');
    return true;
  }

  function schedule(){
    setTimeout(integrate,0);
  }

  function mount(){
    if(typeof document==='undefined'||document.documentElement?.dataset?.resultFeedbackIntegrationMounted)return;
    if(document.documentElement)document.documentElement.dataset.resultFeedbackIntegrationMounted='1';
    ensureStyle();
    const submit=document.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',schedule);
    document.addEventListener('click',event=>{
      if(event?.target?.id==='submitBtn')schedule();
    });
    integrate();
  }

  const api={ensureStyle,integrate,mount,version:'1.1.0'};
  if(root)root.ResultFeedbackIntegration=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
