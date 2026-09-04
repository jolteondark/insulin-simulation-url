(function(root){
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
    const submit=document.querySelector('#submitBtn');
    if(submit)submit.addEventListener('click',schedule);
    document.addEventListener('click',event=>{
      if(event?.target?.id==='submitBtn')schedule();
    });
    integrate();
  }

  const api={integrate,mount,version:'1.0.0'};
  if(root)root.ResultFeedbackIntegration=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
    else mount();
  }
})(typeof window!=='undefined'?window:null);
