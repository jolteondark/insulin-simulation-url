const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('validation_neutral_icr_slow_centering_node.js','utf8');
const memories=[90],couplings=[.36],taus=[15,30,45,60,90],amps=[0,4,6,8,10,12];
const UOM={mean:146.463,sd:56.225,tbr70:2.057,tbr54:.276,tir:76.376,tar180:21.567,acf:[.863,.634,.247,-.012],poc:[121.5,149.1,153.2,154.1],anyLow:7.68,anyHigh:53.77,allTir:43.31};
const results=[];
for(const tau of taus)for(const amp of amps){
 let s=src;
 s=s.replace('memory_min:210,stationary_sd:1,basal_requirement_coupling:.28','memory_min:90,stationary_sd:1,basal_requirement_coupling:.36');
 s=s.replace('Math.exp(.28*z-.5*.28*.28)','Math.exp(.36*z-.5*.36*.36)');
 const old="const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,8119,false).map(patient),conds=[];for(const centerSlow of [false,true])for(const shift of [15,5,-5,-15,-25])for(const sigma of [.15,.20])conds.push({centerSlow,shift,sigma});";
 const neu="const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,8119,false).map(patient),conds=[{centerSlow:true,shift:-5,sigma:0}];";
 if(!s.includes(old))throw new Error('condition anchor');s=s.replace(old,neu);
 // Add a zero-area transient disturbance to glucose increments: AR(1) level x_t, use first difference amp*(x_t-x_{t-1}).
 // Telescopes to ~0 over long windows, raises short-scale variance with limited long-lag persistence.
 const anchor="let hist=[],g0=p.fasting_setpoint_mg_dl+shift,V=[],C=[];for(let d=0;d<7;d++){";
 const repl=`let hist=[],g0=p.fasting_setpoint_mg_dl+shift,V=[],C=[],tr=0,trPrev=0;for(let d=0;d<7;d++){`;
 if(!s.includes(anchor))throw new Error('sim anchor');s=s.replace(anchor,repl);
 const step="const z=S.series[t],mult=centerSlow?clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8):clamp(Math.exp(.28*z),.55,1.8),restore=";
 const rho=Math.exp(-1/tau),innov=Math.sqrt(1-rho*rho);
 const stepRepl=`const z=S.series[t],mult=centerSlow?clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8):clamp(Math.exp(.28*z),.55,1.8),u=randn('tr:${tau}:${amp}:'+seed+':'+d+':'+t),restore=`;
 if(!s.includes(step))throw new Error('step anchor');s=s.replace(step,stepRepl);
 const gline="g[t+1]=g[t]+fast+basal+restore+counter";
 const gRepl=`trPrev=tr;tr=${rho}*tr+${innov}*u;const transient=${amp}*(tr-trPrev);g[t+1]=g[t]+fast+basal+restore+counter+transient`;
 if(!s.includes(gline))throw new Error('gline');s=s.replace(gline,gRepl);
 const out=`/tmp/szt_${tau}_${amp}.json`;
 s=s.replace("fs.writeFileSync('neutral_icr_slow_centering_result.json'",`fs.writeFileSync('${out}'`);
 const p=`/tmp/szt_${tau}_${amp}.js`;fs.writeFileSync(p,s);cp.execFileSync(process.execPath,[p],{stdio:'pipe',cwd:process.cwd(),env:{...process.env,N:process.env.N||'120'}});
 const j=JSON.parse(fs.readFileSync(out,'utf8')),r={tau_min:tau,amp_mg_dl:amp,...j.results[0]};
 r.score=Math.abs(r.mean-UOM.mean)/10+Math.abs(r.sd-UOM.sd)/10+Math.abs(r.tbr70-UOM.tbr70)/2+Math.abs(r.tbr54-UOM.tbr54)+3*Math.abs(r.acf[0]-UOM.acf[0])+3*Math.abs(r.acf[1]-UOM.acf[1])+3*Math.abs(r.acf[2]-UOM.acf[2])+4*Math.abs(r.acf[3]-UOM.acf[3]);results.push(r);
}
results.sort((a,b)=>a.score-b.score);fs.writeFileSync('short_slow_zero_area_transient_result.json',JSON.stringify({protocol:{N:Number(process.env.N||120),days:7,warmup:1,memory:90,coupling:.36,centerSlow:true,shift:-5,sigma_icr:0,transient:'amp * first-difference of stationary AR1; telescoping zero-area',taus,amps},uom:UOM,results},null,2));console.log(JSON.stringify({uom:UOM,top:results.slice(0,15)},null,2));