const fs=require('fs');
const path=require('path');

const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const required=[
  'function correctionFor(rec,key)',
  'function effectiveRapid(rec,key)',
  'function rapidHistoryCell(rec,key,label)',
  '実投与',
  '定時 ${fmt(scheduled)} + scale ${fmt(extra)} = ${fmt(total)} U',
  'effectiveRapid(rec,focus)>expected[focus]+1',
  'effectiveRapid(rec,focus)<Math.max(0,expected[focus]-1)',
  'const scaleResult=r.correction_scale?'
];
for(const marker of required){
  if(!app.includes(marker))throw new Error(`missing correction-scale gameplay marker: ${marker}`);
}
if(app.includes("if(focus!=='basal'&&rec.order[focus]>expected[focus]+1)")){
  throw new Error('legacy scheduled-dose-only low-glucose feedback still present');
}
if(app.includes("if(focus!=='basal'&&rec.order[focus]<Math.max(0,expected[focus]-1))")){
  throw new Error('legacy scheduled-dose-only high-glucose feedback still present');
}
console.log('correction-scale gameplay audit: PASS');
