#!/usr/bin/env python3
import csv, json, math, os, re, statistics
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path(os.environ.get('OUT_DIR','analysis_out')); OUT.mkdir(parents=True, exist_ok=True)

def fnum(x):
    try:
        if x is None or str(x).strip()=='' : return None
        return float(str(x).strip())
    except: return None

def mean(xs): return sum(xs)/len(xs) if xs else None
def sd(xs):
    if len(xs)<2:return 0.0 if xs else None
    m=mean(xs); return math.sqrt(sum((x-m)**2 for x in xs)/(len(xs)-1))
def quantile(xs,q):
    if not xs:return None
    a=sorted(xs); p=(len(a)-1)*q; lo=int(math.floor(p)); hi=int(math.ceil(p))
    if lo==hi:return a[lo]
    return a[lo]*(hi-p)+a[hi]*(p-lo)
def desc(xs):
    return {'n':len(xs),'mean':mean(xs),'sd':sd(xs),'median':quantile(xs,.5),'p25':quantile(xs,.25),'p75':quantile(xs,.75),'p05':quantile(xs,.05),'p95':quantile(xs,.95)}
def glycemic(xs):
    d=desc(xs); n=len(xs)
    if n:
        d.update({'tbr70':100*sum(x<70 for x in xs)/n,'tbr54':100*sum(x<54 for x in xs)/n,'tir70_180':100*sum(70<=x<=180 for x in xs)/n,'tar180':100*sum(x>180 for x in xs)/n,'tar250':100*sum(x>250 for x in xs)/n})
    return d
def corr(a,b):
    z=[(x,y) for x,y in zip(a,b) if x is not None and y is not None]
    if len(z)<3:return None
    xs=[x for x,y in z]; ys=[y for x,y in z]; mx=mean(xs); my=mean(ys)
    dx=sum((x-mx)**2 for x in xs); dy=sum((y-my)**2 for y in ys)
    return sum((x-mx)*(y-my) for x,y in z)/math.sqrt(dx*dy) if dx and dy else None

def parse_dt(s):
    s=(s or '').strip()
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
        try:return datetime.strptime(s,fmt)
        except:pass
    return None

def meal_class(dt):
    h=dt.hour+dt.minute/60
    if 5<=h<10:return 'breakfast'
    if 10<=h<15:return 'lunch'
    if 15<=h<21:return 'dinner'
    return None

def grams(text):
    if not text:return []
    return [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*g\b', text, flags=re.I)]
STAPLES=('rice','congee','porridge','bread','toast','noodle','bun','steamed bread','mantou','dumpling','potato','sweet potato','corn','oat','cereal','cake','biscuit','cracker','wonton','vermicelli')
def staple_weight(text):
    if not text:return None
    total=0.0; found=False
    for line in str(text).splitlines():
        if any(k in line.lower() for k in STAPLES):
            gs=grams(line)
            if gs: total+=sum(gs); found=True
    return total if found else None

def insulin_units(row):
    vals=[]
    for key in ('Insulin dose - s.c.','CSII - bolus insulin (Novolin R, IU)'):
        s=(row.get(key) or '').strip()
        if not s:continue
        if key.startswith('CSII'):
            v=fnum(s)
            if v is not None: vals.append(v)
        else:
            for x in re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s,re.I): vals.append(float(x))
    return sum(vals) if vals else 0.0

sessions=[]; all_cgm=[]; pre={'breakfast':[],'lunch':[],'dinner':[]}; meal_clock={k:[] for k in pre}; food_w={k:[] for k in pre}; staple_w={k:[] for k in pre}; meal_ins={k:[] for k in pre}; meal_food_pairs={k:[] for k in pre}; daily_triplets=[]
files=sorted(ROOT.glob('*.csv'))
for fp in files:
    rows=[]
    with fp.open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            dt=parse_dt(r.get('Date')); g=fnum(r.get('CGM (mg / dl)'))
            if dt: rows.append((dt,g,r))
    cg=[g for dt,g,r in rows if g is not None]
    if not cg: continue
    all_cgm.extend(cg)
    tbr=sum(g<70 for g in cg)/len(cg)*100; tar=sum(g>180 for g in cg)/len(cg)*100; tir=100-tbr-tar
    sessions.append({'file':fp.name,'n_cgm':len(cg),'mean':mean(cg),'sd':sd(cg),'tbr70':tbr,'tir70_180':tir,'tar180':tar})
    ev=defaultdict(dict)
    for dt,g,r in rows:
        diet=(r.get('Dietary intake') or '').strip(); zh=(r.get('饮食') or '').strip()
        if not diet and not zh: continue
        mc=meal_class(dt)
        if not mc: continue
        d=dt.date()
        if mc not in ev[d]: ev[d][mc]=(dt,r)
    ins=[(dt,insulin_units(r)) for dt,g,r in rows if insulin_units(r)>0]
    crows=[(dt,g) for dt,g,r in rows if g is not None]
    for d,es in ev.items():
        dayvals={}
        for mc,(mt,r) in es.items():
            candidates=[(abs((mt-dt).total_seconds()),g) for dt,g in crows if dt<=mt and mt-dt<=timedelta(minutes=30)]
            if candidates:
                pg=min(candidates,key=lambda x:x[0])[1]; pre[mc].append(pg); dayvals[mc]=pg
            meal_clock[mc].append(mt.hour*60+mt.minute+mt.second/60)
            diet=(r.get('Dietary intake') or '').strip(); fw=sum(grams(diet)) if grams(diet) else None; sw=staple_weight(diet)
            if fw is not None: food_w[mc].append(fw)
            if sw is not None: staple_w[mc].append(sw)
            iu=sum(u for it,u in ins if mt-timedelta(minutes=45)<=it<=mt+timedelta(minutes=15))
            meal_ins[mc].append(iu)
            if sw is not None: meal_food_pairs[mc].append((sw,iu))
        if len(dayvals)>=2: daily_triplets.append(dayvals)

session_tbr=[s['tbr70'] for s in sessions]; session_tir=[s['tir70_180'] for s in sessions]; session_tar=[s['tar180'] for s in sessions]
exclude2077=[s for s in sessions if not s['file'].startswith('2077_')]
result={
 'source':{'mirror_repo':'MouzKarrigan/2024_TJU_Data_Mining-Analysis','mirror_commit':'cf5e7f32e8f8295e49df27ea70d9d6b21ab30598','raw_path':'pre-process/raw-data/Shanghai_T2DM','note':'raw CSV is direct pandas read_excel->to_csv conversion; mirror predates 2023 additions to 2003/2029'},
 'n_files_found':len(files),'n_sessions_with_cgm':len(sessions),'pooled_cgm':glycemic(all_cgm),
 'session_metrics':{'tbr70':desc(session_tbr),'tir70_180':desc(session_tir),'tar180':desc(session_tar),'mean_glucose':desc([s['mean'] for s in sessions]),'within_session_sd':desc([s['sd'] for s in sessions])},
 'session_metrics_excluding_2077':{'tbr70':desc([s['tbr70'] for s in exclude2077]),'tir70_180':desc([s['tir70_180'] for s in exclude2077]),'tar180':desc([s['tar180'] for s in exclude2077])},
 'meal_relative_pre_cgm':{k:glycemic(v) for k,v in pre.items()},
 'meal_clock_minutes':{k:desc(v) for k,v in meal_clock.items()},
 'total_food_weight_g':{k:desc(v) for k,v in food_w.items()},
 'staple_weight_proxy_g':{k:desc(v) for k,v in staple_w.items()},
 'near_meal_insulin_IU':{k:desc(v) for k,v in meal_ins.items()},
 'staple_weight_vs_near_meal_insulin_pearson':{k:corr([x for x,y in v],[y for x,y in v]) for k,v in meal_food_pairs.items()},
 'same_day_premeal_correlations':{}
}
for a,b in [('breakfast','lunch'),('breakfast','dinner'),('lunch','dinner')]:
    xs=[];ys=[]
    for d in daily_triplets:
        if a in d and b in d: xs.append(d[a]);ys.append(d[b])
    result['same_day_premeal_correlations'][f'{a}_to_{b}']={'n':len(xs),'pearson':corr(xs,ys)}

(OUT/'shanghai109_metrics.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
with (OUT/'shanghai109_sessions.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(sessions[0]));w.writeheader();w.writerows(sessions)
md=['# ShanghaiT2DM mirror-snapshot all-session analysis','',f"Files found: **{len(files)}**; sessions with CGM: **{len(sessions)}**",'', '## Session-level CGM metrics',f"- TIR: {mean(session_tir):.3f} ± {sd(session_tir):.3f}%",f"- TBR <70: {mean(session_tbr):.3f} ± {sd(session_tbr):.3f}%",f"- TAR >180: {mean(session_tar):.3f} ± {sd(session_tar):.3f}%",'', '## Meal-relative pre-meal CGM']
for k in ('breakfast','lunch','dinner'):
    d=result['meal_relative_pre_cgm'][k]; md.append(f"- {k}: n={d['n']}, {d['mean']:.2f} ± {d['sd']:.2f} mg/dL; TBR={d['tbr70']:.2f}%, TIR={d['tir70_180']:.2f}%, TAR={d['tar180']:.2f}%")
md += ['', '## Caveat','This is the third-party mirror snapshot at cf5e7f3. It is a direct CSV conversion of the original spreadsheets, but it predates the 2023 additions to sessions 2003 and 2029.']
(OUT/'shanghai109_report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
# workflow trigger marker: premeal-tail-metrics-2026-08-20
