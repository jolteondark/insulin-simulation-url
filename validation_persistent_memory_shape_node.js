const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('validation_neutral_icr_slow_centering_node.js','utf8');
const memories=[45,60,75,90,120,150,180,210];
const results=[];
for(const memory of memories){
  let s=src.replace('memory_min:210,stationary_sd:1','memory_min:'+memory+',stationary_sd:1');
  const old="const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,8119,false).map(patient),conds=[];for(const centerSlow of [false,true])for(const shift of [15,5,-5,-15,-25])for(const sigma of [.15,.20])conds.push({centerSlow,shift,sigma});";
  const neu="const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,8119,false).map(patient),conds=[{centerSlow:true,shift:-5,sigma:0}];";
  if(!s.includes(old))throw new Error('condition anchor missing');
  s=s.replace(old,neu).replace("fs.writeFileSync('neutral_icr_slow_centering_result.json'","fs.writeFileSync('/tmp/persistent_memory_'+memory+'.json'");
  const p='/tmp/persistent_memory_'+memory+'.js';fs.writeFileSync(p,s);cp.execFileSync(process.execPath,[p],{stdio:'ignore',cwd:process.cwd(),env:{...process.env,N:process.env.N||'120'}});
  const j=JSON.parse(fs.readFileSync('/tmp/persistent_memory_'+memory+'.json','utf8'));
  results.push({memory_min:memory,...j.results[0]});
}
const UOM={mean:146.463,sd:56.225,tbr70:2.057,tbr54:.276,tir:76.376,tar180:21.567,acf:[.863,.634,.247,-.012],poc:[121.5,149.1,153.2,154.1],anyLow:7.68,anyHigh:53.77,allTir:43.31};
for(const r of results)r.score=Math.abs(r.mean-UOM.mean)/10+Math.abs(r.sd-UOM.sd)/10+Math.abs(r.tbr70-UOM.tbr70)/2+Math.abs(r.tbr54-UOM.tbr54)+3*Math.abs(r.acf[0]-UOM.acf[0])+3*Math.abs(r.acf[1]-UOM.acf[1])+3*Math.abs(r.acf[2]-UOM.acf[2])+3*Math.abs(r.acf[3]-UOM.acf[3]);
results.sort((a,b)=>a.score-b.score);
fs.writeFileSync('persistent_memory_shape_result.json',JSON.stringify({protocol:{N:Number(process.env.N||120),days:7,warmup:1,centerSlow:true,shift:-5,sigma_icr:0,coupling:.28,memories},uom:UOM,results},null,2));
console.log(JSON.stringify({uom:UOM,results},null,2));