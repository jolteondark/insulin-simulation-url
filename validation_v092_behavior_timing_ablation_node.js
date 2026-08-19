const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('validation_generator_v081_si_demand_node.js','utf8');
const configs=[
{name:'baseline',meal_sd:0,bolus_sd:0,poc_sd:0},
{name:'poc15',meal_sd:0,bolus_sd:0,poc_sd:15},
{name:'meal15_bolus15_poc15',meal_sd:15,bolus_sd:15,poc_sd:15},
{name:'meal25_bolus20_poc20',meal_sd:25,bolus_sd:20,poc_sd:20},
{name:'meal30_bolus30_poc30',meal_sd:30,bolus_sd:30,poc_sd:30}
];
const q={w:330,c:.32},tau=90,amp=8,rho=Math.exp(-1/tau),innov=Math.sqrt(1-rho*rho),out=[];
for(const b of configs){let s=src;
const inject=`\nfunction bipState(initialHistory,minutes,seed,w){let a=(seed>>>0)||1;function rr(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}function rn(){let u=0,v=0;while(!u)u=rr();while(!v)v=rr();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}const L=2*w,h=Array.isArray(initialHistory)?initialHistory.slice(-L):[];while(h.length<L)h.unshift(0);const y=new Float64Array(minutes+1);function val(){let a=0,b=0;for(let i=0;i<w;i++)b+=h[i];for(let i=w;i<L;i++)a+=h[i];return(a-b)/Math.sqrt(2*w)}y[0]=val();for(let t=0;t<minutes;t++){h.shift();h.push(rn());y[t+1]=val()}return{series:y,end_history:h}}\nfunction jitter(seed,sd){return sd?Math.round(sd*randn(seed)):0}\n`;
s=s.replace("function sim(p,seed){",inject+"function sim(p,seed){");
s=s.replace("const bol=conv(n,[[480,dose[0]],[780,dose[1]],[1140,dose[2]]],rk),g=new Float64Array(n);g[0]=g0;", "let bol,g=new Float64Array(n);g[0]=g0;");
s=s.replace("let hist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[];for(let d=0;d<7;d++){const S=F.evolveMetabolicState(hist,1440,seed+d,cfg);hist=S.end_history;",`let bhist=[],g0=p.fasting_setpoint_mg_dl-5,V=[],C=[],tr=0,trPrev=0;for(let d=0;d<14;d++){const B=bipState(bhist,1440,seed+d+777777,${q.w});bhist=B.end_history;`);
s=s.replace("const meal=new Float64Array(n),corr=new Float64Array(n);for(const [t,c] of [[480,50],[780,70],[1140,60]]){",`const meal=new Float64Array(n),corr=new Float64Array(n);const mt=[480+jitter('${b.name}:meal0:'+seed+':'+d,${b.meal_sd}),780+jitter('${b.name}:meal1:'+seed+':'+d,${b.meal_sd}),1140+jitter('${b.name}:meal2:'+seed+':'+d,${b.meal_sd})].map(x=>clamp(x,0,1439));const bt=[mt[0]+jitter('${b.name}:bol0:'+seed+':'+d,${b.bolus_sd}),mt[1]+jitter('${b.name}:bol1:'+seed+':'+d,${b.bolus_sd}),mt[2]+jitter('${b.name}:bol2:'+seed+':'+d,${b.bolus_sd})].map(x=>clamp(x,0,1439));for(const [t,c] of [[mt[0],50],[mt[1],70],[mt[2],60]]){`);
s=s.replace("const bol=conv(n,[[480,dose[0]],[780,dose[1]],[1140,dose[2]]],rk),g=new Float64Array(n);g[0]=g0;", "");
s=s.replace("const z=S.series[t],mult=clamp(Math.exp(.36*z-.5*.36*.36),.55,1.8),restore=",`const zb=B.series[t],u=randn('${b.name}:tr:'+seed+':'+d+':'+t),mult=clamp(Math.exp(${q.c}*zb-.5*${q.c}*${q.c}),.55,1.8),restore=`);
s=s.replace("g[t+1]=g[t]+fast+basal+restore+counter",`trPrev=tr;tr=${rho}*tr+${innov}*u;g[t+1]=g[t]+fast+basal+restore+counter+${amp}*(tr-trPrev)`);
s=s.replace("g0=g[n-1];if(d>0){C.push([g[420],g[720],g[1080],g[1260]]);for(let i=1;i<g.length;i++)V.push(g[i])}",`g0=g[n-1];if(d>1){const ct=[420+jitter('${b.name}:poc0:'+seed+':'+d,${b.poc_sd}),720+jitter('${b.name}:poc1:'+seed+':'+d,${b.poc_sd}),1080+jitter('${b.name}:poc2:'+seed+':'+d,${b.poc_sd}),1260+jitter('${b.name}:poc3:'+seed+':'+d,${b.poc_sd})].map(x=>clamp(x,0,1440));C.push(ct.map(x=>g[x]));for(let i=1;i<g.length;i++)V.push(g[i])}`);
// insert day-specific bolus after meal/corr construction
s=s.replace("for(let j=0;j<Math.min(H.length,n-t);j++)corr[t+j]+=.1*gain*c*H[j]}","for(let j=0;j<Math.min(H.length,n-t);j++)corr[t+j]+=.1*gain*c*H[j]}bol=conv(n,[[bt[0],dose[0]],[bt[1],dose[1]],[bt[2],dose[2]]],rk);");
const path=`/tmp/v092_${b.name}.json`;s=s.replace("fs.writeFileSync('generator_v081_si_demand_result.json'",`fs.writeFileSync('${path}'`);s=s.replace("console.log(JSON.stringify(result,null,2));","");const js=path+'.js';fs.writeFileSync(js,s);cp.execFileSync(process.execPath,[js],{cwd:process.cwd(),stdio:'pipe',env:{...process.env,N:process.env.N||'180'}});const j=JSON.parse(fs.readFileSync(path,'utf8'));out.push({config:b,...j.population});}
const U={mean:146.463,sd:56.225,tbr70:2.057,tbr54:.276,tir:76.376,tar180:21.567,anyLow:7.68,anyHigh:53.77,allTir:43.31};
const result={protocol:{N:Number(process.env.N||180),days:14,warmup_days:2,core:'provisional freeze v2: S_I + D_insulin; biphasic 330/.32; transient tau90 amp8',behavior:'timing jitter only'},uom:U,results:out};fs.writeFileSync('v092_behavior_timing_ablation_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));