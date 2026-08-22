const fs=require('fs');
let src=fs.readFileSync('validation_zero_area_fast_shape_node.js','utf8');
src=src.replace('function simulate(p,seed,alpha,days=7){','function simulate(p,seed,alpha,ratioCenter,ratioLogSd,baseLogMean,baseLogSd,days=7){');
src=src.replace("icr=Number(p.v2_icr_g_u??p.icr_g_u),dose=[roundHalf(50/icr),roundHalf(70/icr),roundHalf(60/icr)]","legacyRatio=Number(p.cf_mg_dl_u)/Number(p.icr_g_u),zratio=(Math.log(legacyRatio)-baseLogMean)/baseLogSd,newRatio=ratioCenter*Math.exp(ratioLogSd*zratio),icr=(Number(p.cf_mg_dl_u)/newRatio)*ob,dose=[roundHalf(50/icr),roundHalf(70/icr),roundHalf(60/icr)]");
const marker='const N=Number(process.env.N||120)';
const cut=src.indexOf(marker);if(cut<0)throw new Error('tail marker not found');
src=src.slice(0,cut)+String.raw`
const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,7901,false).map(patient),alpha=.10;
const ratios=bases.map(p=>Number(p.cf_mg_dl_u)/Number(p.icr_g_u)),logs=ratios.map(Math.log),baseLogMean=mean(logs),baseLogSd=sd(logs);
function qv(a,p){const x=[...a].sort((a,b)=>a-b),i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return x[l]+(x[h]-x[l])*(i-l)}
const scenarios=[
{name:'current_shape_center',center:Math.exp(baseLogMean),logsd:baseLogSd},
{name:'literature_center_current_sd',center:4.44,logsd:baseLogSd},
{name:'literature_center_sd015',center:4.44,logsd:.15},
{name:'literature_center_sd012',center:4.44,logsd:.12},
{name:'literature_center_sd018',center:4.44,logsd:.18}
],out=[];
for(const sc of scenarios){let C=[],V=[],pa={30:[],60:[],120:[],240:[]};for(let i=0;i<bases.length;i++){const r=simulate(bases[i],7901+i*100,alpha,sc.center,sc.logsd,baseLogMean,baseLogSd);C.push(...r.checks);V.push(...r.series);for(const lag of [30,60,120,240])pa[lag].push(acf(r.series,lag))}const m=mean(V),s=sd(V),poc=[0,1,2,3].map(j=>mean(C.map(x=>x[j])));let t70=0,t54=0,lo=0,hi=0,tir=0;for(const v of V){if(v<70)t70++;if(v<54)t54++}for(const x of C){if(x.some(v=>v<70))lo++;if(x.some(v=>v>180))hi++;if(x.every(v=>v>=70&&v<=180))tir++}const A=[median(pa[30]),median(pa[60]),median(pa[120]),median(pa[240])];const newRatios=logs.map(x=>sc.center*Math.exp(sc.logsd*(x-baseLogMean)/baseLogSd));out.push({...sc,ratio_p10:qv(newRatios,.1),ratio_p90:qv(newRatios,.9),mean:m,sd:s,median_acf:A,tbr70_pct:100*t70/V.length,tbr54_pct:100*t54/V.length,poc_mean:poc,any_lt70_pct:100*lo/C.length,any_gt180_pct:100*hi/C.length,all_four_tir_pct:100*tir/C.length})}
const result={protocol:{N,days:7,warmup:1,alpha,rapid_scale:.8,fast_scale:.8,coupling:.28,gain_70kg:5,transform:'preserve rank of current log(CF/ICR), impose empirical center and log-SD; ICRnew=(CF/Rnew)*obesity_action'},literature:{King2007_CF_per_ICR:4.44,r:0.90,ICR_mean_sd:[10.33,3.5],CF_mean_sd:[46.3,15.1],implied_log_ratio_sd_approx:0.15,SochaKing2019_CF_per_ICR:4.49,r:0.94},baseline_ratio:{geometric_mean:Math.exp(baseLogMean),log_sd:baseLogSd,p10:qv(ratios,.1),p90:qv(ratios,.9)},uom:UOM,results:out};fs.writeFileSync('prandial_ratio_literature_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
`;
new Function('require','global','process',src)(require,global,process);
