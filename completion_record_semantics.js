(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.WardCompletionRecordSemantics=api;
    api.patchDebrief(root?.WardCaseDebrief);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function isCanonicalDebriefCompletion(record){
    return Boolean(record?.completed_at||record?.completion_transaction);
  }

  function prepareForDebrief(data,caseId){
    const records=data?.completion_records;
    const prior=records&&typeof records==='object'?records[caseId]:null;
    if(!prior||isCanonicalDebriefCompletion(prior))return {data,prior:null,bypassed:false};
    const nextRecords={...records};
    delete nextRecords[caseId];
    return {data:{...(data||{}),completion_records:nextRecords},prior,bypassed:true};
  }

  function restorePrecompletionFields(result,caseId,prior){
    if(!prior||!result?.data)return result;
    const records=result.data.completion_records&&typeof result.data.completion_records==='object'?result.data.completion_records:{};
    const canonical=records[caseId]&&typeof records[caseId]==='object'?records[caseId]:{};
    return {
      ...result,
      data:{
        ...result.data,
        completion_records:{
          ...records,
          [caseId]:{...prior,...canonical}
        }
      }
    };
  }

  function patchDebrief(debrief){
    if(!debrief?.applyCompletion||debrief.__completionRecordSemanticsPatched)return false;
    const original=debrief.applyCompletion.bind(debrief);
    debrief.applyCompletion=function(data,caseId,model){
      const prepared=prepareForDebrief(data,caseId);
      const result=original(prepared.data,caseId,model);
      return prepared.bypassed?restorePrecompletionFields(result,caseId,prepared.prior):result;
    };
    debrief.__completionRecordSemanticsPatched=true;
    return true;
  }

  return {isCanonicalDebriefCompletion,prepareForDebrief,restorePrecompletionFields,patchDebrief,version:'1.0.0'};
});
