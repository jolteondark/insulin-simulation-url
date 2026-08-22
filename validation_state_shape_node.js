const fs=require('fs'),vm=require('vm');
global.window=global;
function load(f){vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});}
load('engine.js');
load('patient_generator.js');
load('patient_phenotype_v2.js');
load('clinical_modifiers_v2.js');
load('dosing_policy_v2.js');
load('state_space_v2.js');
const OU_STATE=global.GlucoseStateSpaceV2;
load('state_space_v2_finite_memory.js');
const FINITE_NATIVE=global.GlucoseStateSpaceV2FiniteMemory;
load('finite_memory_state_adapter_v2.js');
const FINITE_STATE=global.GlucoseStateSpaceV2;
load('engine_v2.js');

const LAGS=[30,60,120,240],CARBS={breakfast:50,lunch:70,dinner:60};
function mean(a){let s=0;for(const x of a)s+=x;return s/a.length}
function sd(a){const m=mean(a);let s=0;for(const x of a)s+=(x-m)*(x-m);return Math.sqrt(s/a.length)}
function corrLag(a,lag){const n=a.length-lag;if(n<3)return NaN;let sx=0,sy=0;for(let i=0;i<n;i++){sx+=a[i];sy+=a[i+lag]}const mx=sx/n,my=sy/n;let xx=0,yy=0,xy=0;for(let i=0;i<n;i++){const x=a[i]-mx,y=a[i+lag]-my;xx+=x*x;yy+=y*y;xy+=x*y}return xx>0&&yy>0?xy/Math.sqrt(xx*yy):NaN}
function median(a){const x=a.filter(Number.isFinite).sort((p,q)=>p-q),n=x.length;if(!n)return NaN;return n%2?x[(n-1)/2]:(x[n/2-1]+x[n/2])/2}
function metrics(values,perPatient){const m=mean(values),s=sd(values),n=values.length;let l70=0,l54=0,g180=0,g250=0;for(const x of values){if(x<70)l70++;if(x<54)l54++;if(x>180)g180++;if(x>250)g250++}const ac={};for(const l of LAGS)ac[l]=median(perPatient.map(x=>corrLag(x,l)));return{mean:m,sd:s,cv:100*s/m,tir:100*(n-l70-g180)/n,tbr70:100*l70/n,tbr54:100*l54/n,tar180:100*g180/n,tar250:100*g250/n,autocorr:ac}}
function ctx(){return{rapid_formulation:'aspart',basal_formulation:'glargine',prednisone_mg:0,patient_steroid_response:.69,infection_severity:0,meal_plan_carb_g:{...CARBS},intake_fraction:{breakfast:1,lunch:1,dinner:1}}}
function add(dst,s){for(let i=1;i<s.length;i++)dst.push(Number(s[i]))}
function makePatient(base){const ph=PatientPhenotypeV2.decorate(base);const cl=ClinicalModifiersV2.decorateClinical(ph,{egfr_ml_min_1_73m2:90});return PatientPhenotypeV2.toEnginePatient(cl)}
function runOne(p,i,days,stateModule,stateParams){global.GlucoseStateSpaceV2=stateModule;const c=ctx(),o=DosingPolicyV2.starterOrder(p,CARBS),rapid={breakfast_u:o.breakfast_u,lunch_u:o.lunch_u,dinner_u:o.dinner_u},b=o.basal_u,arr=[];let st={glucose_mg_dl:p.fasting_setpoint_mg_dl+(stateParams.setpoint_shift_mg_dl||0),metabolic_state:stateModule===FINITE_STATE?[]:0};for(let d=0;d<days;d++){const r=GlucoseEngineV2.simulate(p,c,rapid,b,7901+i*100+d,st,stateParams);st=r.next_state;if(d>0)add(arr,r.series)}return arr}

const N=Number(process.env.N||300),DAYS=Number(process.env.DAYS||7);
const ouParams={tau_min:Number(process.env.OU_TAU||120),stationary_sd:1,basal_requirement_coupling:Number(process.env.COUPLING||0.28),fast_scale:Number(process.env.FAST_SCALE||0.74),setpoint_shift_mg_dl:Number(process.env.SETPOINT_SHIFT||15)};
const memoryValues=(process.env.MEMORY_LIST||'150,180,210,240').split(',').map(Number).filter(Number.isFinite);
const bases=PatientGenerator.sampleCandidates(N,7901,false),patients=bases.map(makePatient);
function cohort(stateModule,stateParams){const all=[],pp=[];for(let i=0;i<patients.length;i++){const a=runOne(patients[i],i,DAYS,stateModule,stateParams);pp.push(a);all.push(...a)}return metrics(all,pp)}
const result={protocol:{N,DAYS,warmup_days:1,egfr:90,clinical_layer:true},targets:{T1D_UOM:{mean:146.46,sd:56.23,cv:38.39,tir:76.38,tbr70:2.06,tbr54:.276,tar180:21.57,tar250:5.94,autocorr:{30:.863,60:.634,120:.247,240:-.012}},HUPA_UCM:{mean:135.6,sd:51.6,cv:38.08,tir:77.5,tbr70:5.74,tbr54:1.26,tar180:16.74,tar250:3.43,autocorr:{30:.923,60:.779,120:.491,240:.132}}},ou:{params:ouParams,metrics:cohort(OU_STATE,ouParams)},finite_memory:[]};
for(const memory_min of memoryValues){const p={memory_min,stationary_sd:1,basal_requirement_coupling:ouParams.basal_requirement_coupling,fast_scale:ouParams.fast_scale,setpoint_shift_mg_dl:ouParams.setpoint_shift_mg_dl};result.finite_memory.push({params:p,theoretical:{30:FINITE_NATIVE.theoreticalAutocorrelation(30,p),60:FINITE_NATIVE.theoreticalAutocorrelation(60,p),120:FINITE_NATIVE.theoreticalAutocorrelation(120,p),240:FINITE_NATIVE.theoreticalAutocorrelation(240,p)},metrics:cohort(FINITE_STATE,p)})}
fs.writeFileSync('state_shape_validation_result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
