const fs=require('fs');
let src=fs.readFileSync('validation_zero_area_fast_shape_node.js','utf8');
src=src.replace('function simulate(p,seed,alpha,days=7){','function simulate(p,seed,alpha,lambda,ratioCenter,days=7){');
src=src.replace("icr=Number(p.v2_icr_g_u??p.icr_g_u),dose=[roundHalf(50/icr),roundHalf(70/icr),roundHalf(60/icr)]","legacyRatio=Number(p.cf_mg_dl_u)/Number(p.icr_g_u),newRatio=ratioCenter*Math.exp(lambda*Math.log(legacyRatio/ratioCenter)),icr=(Number(p.cf_mg_dl_u)/newRatio)*ob,dose=[roundHalf(50/icr),roundHalf(70/icr),roundHalf(60/icr)]");
const marker='const N=Number(process.env.N||120)';
const cut=src.indexOf(marker);if(cut<0)throw new Error('tail marker not found');
src=src.slice(0,cut)+String.raw`
const N=Number(process.env.N||120),bases=PatientGenerator.sampleCandidates(N,7901,false).map(patient),lambdas=[1,.75,.5,.25,0],alpha=.10;
const ratios=bases.map(p=>Number(p.cf_mg_dl_u)/Number(p.icr_g_u)),ratioCenter=median(ratios),out=[];
for(const lambda of lambdas){let C=[],V=[],pa={30:[],60:[],120:[],240:[]};for(let i=0;i<bases.length;i++){const r=simulate(bases[i],7901+i*100,alpha,lambda,ratioCenter);C.push(...r.checks);V.push(...r.series);for(const lag of [30,60,120,240])pa[lag].push(acf(r.series,lag))}const m=mean(V),s=sd(V),poc=[0,1,2,3].map(j=>mean(C.map(x=>x[j])));let t70=0,t54=0,lo=0,hi=0,tir=0;for(const v of V){if(v<70)t70++;if(v<54)t54++}for(const x of C){if(x.some(v=>v<70))lo++;if(x.some(v=>v>180))hi++;if(x.every(v=>v>=70&&v<=180))tir++}const A=[median(pa[30]),median(pa[60]),median(pa[120]),median(pa[240])];const newRatios=ratios.map(r=>ratioCenter*Math.exp(lambda*Math.log(r/ratioCenter)));out.push({lambda,ratio_center:ratioCenter,ratio_p10:qv(newRatios,.10),ratio_p90:qv(newRatios,.90),mean:m,sd:s,median_acf:A,tbr70_pct:100*t70/V.length,tbr54_pct:100*t54/V.length,poc_mean:poc,any_lt70_pct:100*lo/C.length,any_gt180_pct:100*hi/C.length,all_four_tir_pct:100*tir/C.length})}
function qv(a,p){const x=[...a].sort((a,b)=>a-b),i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return x[l]+(x[h]-x[l])*(i-l)}
const result={protocol:{N,days:7,warmup:1,alpha,rapid_scale:.8,fast_scale:.8,coupling:.28,gain_70kg:5,ratio_transform:'Rnew=median(R)*exp(lambda*log(R/median(R))); ICRnew=(CF/Rnew)*obesity_action',lambda_1:'current joint distribution',lambda_0:'same CF/ICR for all; center preserved'},baseline_ratio:{median:ratioCenter,p10:qv(ratios,.1),p90:qv(ratios,.9)},uom:UOM,results:out};fs.writeFileSync('prandial_ratio_shrink_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
`;
new Function(src)();
