const fs=require('fs'),cp=require('child_process');
let s=fs.readFileSync('validation_generator_v081_si_demand_node.js','utf8');
// Integrated candidate: v0.81 two-axis generator + small zero-area transient.
const tau=90,amp=8,rho=Math.exp(-1/tau),innov=Math.sqrt(1-rho*rho);
s=s.replace("function sim(p,seed){const n=1441",`function sim(p,seed){const n=1441`);
s=s.replace("let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[];for(let d=0;d<7;d++){",`let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[],tr=0,trPrev=0;for(let d=0;d<7;d++){`);
s=s.replace("const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),restore=",`const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),u=randn('v082tr:'+seed+':'+d+':'+t),restore=`);
s=s.replace("g[t+1]=g[t]+fast+basal+restore+counter",`trPrev=tr;tr=${rho}*tr+${innov}*u;const transient=${amp}*(tr-trPrev);g[t+1]=g[t]+fast+basal+restore+counter+transient`);
s=s.replace("generator:'v0.81 validation-only S_I + D_insulin primitive candidate'","generator:'v0.82 integrated S_I + D_insulin + zero-area transient candidate'");
s=s.replace("setpoint_shift:-5}",`setpoint_shift:-5,transient:'AR1 first-difference',transient_tau_min:${tau},transient_amp_mg_dl:${amp}}`);
s=s.replaceAll('generator_v081_si_demand_result.json','generator_v082_integrated_transient_result.json');
fs.writeFileSync('/tmp/v082.js',s);cp.execFileSync(process.execPath,['/tmp/v082.js'],{stdio:'inherit',cwd:process.cwd(),env:{...process.env,N:process.env.N||'120'}});
