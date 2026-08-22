const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('validation_generator_v081_si_demand_node.js','utf8');
const variants=['baseline','transient_off','slow_off','meal_bolus_off','basal_requirement_state_off','counterreg_off','zero_area_mealshape_off'];
const tau=90,amp=8,rho=Math.exp(-1/tau),innov=Math.sqrt(1-rho*rho),out=[];
for(const v of variants){let s=src;
 // baseline transient unless explicitly off
 if(v!=='transient_off'){
  s=s.replace("let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[];for(let d=0;d<7;d++){",`let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[],tr=0,trPrev=0;for(let d=0;d<7;d++){`);
  s=s.replace("const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),restore=",`const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),u=randn('acfab:${v}:'+seed+':'+d+':'+t),restore=`);
  s=s.replace("g[t+1]=g[t]+fast+basal+restore+counter",`trPrev=tr;tr=${rho}*tr+${innov}*u;const transient=${amp}*(tr-trPrev);g[t+1]=g[t]+fast+basal+restore+counter+transient`);
 }
 if(v==='slow_off') s=s.replace("mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8)","mult=1");
 if(v==='basal_requirement_state_off') s=s.replace("basal=ig*mult*tb[t]-ig*ob*ab[t]","basal=ig*tb[t]-ig*ob*ab[t]");
 if(v==='counterreg_off') s=s.replace("counter=Math.min(1.8,.020*p.counterreg_strength*Math.max(0,p.counterreg_threshold_mg_dl-g[t]))","counter=0");
 if(v==='zero_area_mealshape_off') s=s.replace("corr[t+j]+=.1*gain*c*H[j]","corr[t+j]+=0");
 if(v==='meal_bolus_off'){
  s=s.replace("for(const [t,c] of [[480,50],[780,70],[1140,60]]){for(let j=0;j<Math.min(mk.length,n-t);j++)meal[t+j]+=gain*c*mk[j];for(let j=0;j<Math.min(H.length,n-t);j++)corr[t+j]+=.1*gain*c*H[j]}","/* meal and correction disabled */");
  s=s.replace("const bol=conv(n,[[480,dose[0]],[780,dose[1]],[1140,dose[2]]],rk)","const bol=new Float64Array(n)");
 }
 const path=`/tmp/acfab_${v}.json`;s=s.replace("fs.writeFileSync('generator_v081_si_demand_result.json'",`fs.writeFileSync('${path}'`);s=s.replace("console.log(JSON.stringify(result,null,2));","");const js=`/tmp/acfab_${v}.js`;fs.writeFileSync(js,s);cp.execFileSync(process.execPath,[js],{cwd:process.cwd(),stdio:'pipe',env:{...process.env,N:process.env.N||'120'}});const j=JSON.parse(fs.readFileSync(path,'utf8'));out.push({variant:v,...j.population});}
const result={protocol:{N:Number(process.env.N||120),question:'Which component carries residual 240-min autocorrelation?',generator:'v0.82 two-axis baseline',transient_amp:8,transient_tau:90},results:out};fs.writeFileSync('v082_acf_component_ablation_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));