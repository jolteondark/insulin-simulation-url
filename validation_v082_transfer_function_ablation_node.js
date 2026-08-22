const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('validation_generator_v081_si_demand_node.js','utf8');
const restores=[0.60,0.80,1.00,1.20,1.40],rapids=[0.70,0.80,0.90];
const tau=90,amp=8,rho=Math.exp(-1/tau),innov=Math.sqrt(1-rho*rho),out=[];
for(const rm of restores)for(const rapid of rapids){
 let s=src;
 // Keep v0.81 S_I + D generator, but change rapid time scale everywhere and recompute neutral ICR accordingly.
 s=s.replaceAll('shifted(15,105,300,.8)','shifted(15,105,300,'+rapid+')');
 // Multiply glucose restoration strength only; S_I/CF identity and neutral meal dosing continue to use the same modified kh.
 s=s.replace("function restoreK(p){return Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}","function restoreK(p){return "+rm+"*Math.log(2)/(300/clamp(p.egp_suppression_strength,.70,1.35))}");
 // Add the already-accepted small zero-area transient amp8/tau90.
 s=s.replace("let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[];for(let d=0;d<7;d++){",`let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[],tr=0,trPrev=0;for(let d=0;d<7;d++){`);
 s=s.replace("const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),restore=",`const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),u=randn('tf:${rm}:${rapid}:'+seed+':'+d+':'+t),restore=`);
 s=s.replace("g[t+1]=g[t]+fast+basal+restore+counter",`trPrev=tr;tr=${rho}*tr+${innov}*u;const transient=${amp}*(tr-trPrev);g[t+1]=g[t]+fast+basal+restore+counter+transient`);
 const path=`/tmp/tf_${String(rm).replace('.','p')}_${String(rapid).replace('.','p')}.json`;
 s=s.replace("fs.writeFileSync('generator_v081_si_demand_result.json'",`fs.writeFileSync('${path}'`);
 s=s.replace("console.log(JSON.stringify(result,null,2));","");
 const js=`/tmp/tf_${String(rm).replace('.','p')}_${String(rapid).replace('.','p')}.js`;fs.writeFileSync(js,s);cp.execFileSync(process.execPath,[js],{cwd:process.cwd(),stdio:'pipe',env:{...process.env,N:process.env.N||'120'}});
 const j=JSON.parse(fs.readFileSync(path,'utf8'));out.push({restore_multiplier:rm,rapid_scale:rapid,...j.population});
}
const U={mean:146.463,sd:56.225,tbr70:2.057,tbr54:.276,tir:76.376,tar180:21.567,acf:[.863,.634,.247,-.012]};
for(const r of out)r.score=Math.abs(r.mean-U.mean)/10+Math.abs(r.sd-U.sd)/10+Math.abs(r.tbr70-U.tbr70)/2+3*Math.abs(r.acf[0]-U.acf[0])+3*Math.abs(r.acf[1]-U.acf[1])+4*Math.abs(r.acf[2]-U.acf[2])+5*Math.abs(r.acf[3]-U.acf[3]);
out.sort((a,b)=>a.score-b.score);const result={protocol:{N:Number(process.env.N||120),generator:'v0.82 S_I + D_insulin + amp8 transient',question:'Is 120-240 min ACF shape driven by glucose restore or rapid-insulin kernel?',restore_multipliers:restores,rapid_scales:rapids,neutral_icr_recomputed:true},uom:U,results:out};fs.writeFileSync('v082_transfer_function_ablation_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({uom:U,top:out.slice(0,15)},null,2));