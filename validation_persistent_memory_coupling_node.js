const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('validation_neutral_icr_slow_centering_node.js','utf8');
const memories=[90,105,120,135,150],couplings=[.28,.32,.36,.40,.44];
const UOM={mean:146.463,sd:56.225,tbr70:2.057,tbr54:.276,tir:76.376,tar180:21.567,acf:[.863,.634,.247,-.012],poc:[121.5,149.1,153.2,154.1],anyLow:7.68,anyHigh:53.77,allTir:43.31};
const results=[];
for(const memory of memories)for(const coupling of couplings){
 let s=src;
 s=s.replace('memory_min:210,stationary_sd:1,basal_requirement_coupling:.28','memory_min:'+memory+',stationary_sd:1,basal_requirement_coupling:'+coupling);
 s=s.replace('Math.exp(.28*z-.5*.28*.28)','Math.exp('+coupling+'*z-.5*'+coupling+'*'+coupling+')');
 const old="const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,8119,false).map(patient),conds=[];for(const centerSlow of [false,true])for(const shift of [15,5,-5,-15,-25])for(const sigma of [.15,.20])conds.push({centerSlow,shift,sigma});";
 const neu="const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,8119,false).map(patient),conds=[{centerSlow:true,shift:-5,sigma:0}];";
 if(!s.includes(old))throw new Error('condition anchor');s=s.replace(old,neu);
 const out=`/tmp/pmc_${memory}_${String(coupling).replace('.','p')}.json`;
 s=s.replace("fs.writeFileSync('neutral_icr_slow_centering_result.json'",`fs.writeFileSync('${out}'`);
 const p=`/tmp/pmc_${memory}_${String(coupling).replace('.','p')}.js`;fs.writeFileSync(p,s);cp.execFileSync(process.execPath,[p],{stdio:'pipe',cwd:process.cwd(),env:{...process.env,N:process.env.N||'120'}});
 const j=JSON.parse(fs.readFileSync(out,'utf8')),r={memory_min:memory,coupling,...j.results[0]};
 r.score=Math.abs(r.mean-UOM.mean)/10+Math.abs(r.sd-UOM.sd)/10+Math.abs(r.tbr70-UOM.tbr70)/2+Math.abs(r.tbr54-UOM.tbr54)+3*Math.abs(r.acf[0]-UOM.acf[0])+3*Math.abs(r.acf[1]-UOM.acf[1])+3*Math.abs(r.acf[2]-UOM.acf[2])+3*Math.abs(r.acf[3]-UOM.acf[3]);results.push(r);
}
results.sort((a,b)=>a.score-b.score);fs.writeFileSync('persistent_memory_coupling_result.json',JSON.stringify({protocol:{N:Number(process.env.N||120),days:7,warmup:1,centerSlow:true,shift:-5,sigma_icr:0,memories,couplings},uom:UOM,results},null,2));console.log(JSON.stringify({uom:UOM,top:results.slice(0,15)},null,2));