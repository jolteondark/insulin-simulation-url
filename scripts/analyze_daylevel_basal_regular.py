#!/usr/bin/env python3
import csv, json, math, os, re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path('analysis/daylevel_basal_regular'); OUT.mkdir(parents=True,exist_ok=True)
BASAL=('glargine','glarigine','detemir','degludec','lantus','levemir','tresiba')
PREMIX=('70/30','50/50','30r','40r','50r','aspart 30','aspart 50','aspart 70/30','humulin 70/30','novolin 30r','gansulin 40r')
REGULAR=('novolin r','humulin r','regular insulin')
RAPID=('insulin aspart','insulin glulisine','insulin lispro','aspart','glulisine','lispro')
def fnum(x):
    try:return float(str(x).strip())
    except:return None
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
    if not a:return None
    m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/len(a))
def desc(a):return {'n':len(a),'mean':mean(a),'sd':sd(a)}
def parse_dt(s):
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
        try:return datetime.strptime((s or '').strip(),fmt)
        except:pass
    return None
def classify_text(s):
    t=(s or '').lower()
    if any(k in t for k in PREMIX): return 'premix'
    if any(k in t for k in BASAL): return 'basal'
    if any(k in t for k in REGULAR): return 'regular'
    if any(k in t for k in RAPID): return 'rapid'
    return None
def units_from_sc(s):
    vals=[]
    for x in re.findall(r'(\d+(?:\.\d+)?)\s*iu\b',s or '',re.I):
        try:vals.append(float(x))
        except:pass
    return sum(vals) if vals else None
def nearest_before(cgm,t,window=30):
    z=[((t-dt).total_seconds(),g) for dt,g in cgm if dt<=t and t-dt<=timedelta(minutes=window)]
    return min(z,key=lambda x:x[0])[1] if z else None
def nearest(cgm,t,window=20):
    z=[(abs((dt-t).total_seconds()),g) for dt,g in cgm if abs((dt-t).total_seconds())<=window*60]
    return min(z,key=lambda x:x[0])[1] if z else None
all_days=[]
for fp in sorted(ROOT.glob('*.csv')):
    rows=[]
    with fp.open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            dt=parse_dt(r.get('Date')); g=fnum(r.get('CGM (mg / dl)'))
            if dt: rows.append((dt,g,r))
    if not rows:continue
    cgm=[(dt,g) for dt,g,r in rows if g is not None]
    insulin=[]; meals=defaultdict(dict)
    for dt,g,r in rows:
        sc=(r.get('Insulin dose - s.c.') or '').strip(); typ=classify_text(sc)
        if typ: insulin.append({'dt':dt,'type':typ,'units':units_from_sc(sc),'raw':sc})
        cs=fnum(r.get('CSII - bolus insulin (Novolin R, IU)'))
        if cs is not None and cs>0: insulin.append({'dt':dt,'type':'regular','units':cs,'raw':f'CSII Novolin R {cs} IU'})
        diet=(r.get('Dietary intake') or '').strip()
        if diet:
            h=dt.hour+dt.minute/60
            mc='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
            if mc and mc not in meals[dt.date()]: meals[dt.date()][mc]=dt
    for d,md in sorted(meals.items()):
        if 'breakfast' not in md:continue
        bt=md['breakfast']; lt=md.get('lunch'); dtm=md.get('dinner')
        day_start=datetime.combine(d,datetime.min.time()); day_end=day_start+timedelta(days=1)
        dayins=[x for x in insulin if day_start<=x['dt']<day_end]
        basal_recent=[x for x in insulin if bt-timedelta(hours=18)<=x['dt']<=bt+timedelta(hours=18) and x['type']=='basal']
        regs=[x for x in dayins if x['type']=='regular']; prem=[x for x in dayins if x['type']=='premix']; rapid=[x for x in dayins if x['type']=='rapid']
        strict=bool(basal_recent) and len(regs)>=2 and not prem and not rapid
        permissive=bool(basal_recent) and len(regs)>=1 and not prem and not rapid
        daycg=[g for t,g in cgm if day_start<=t<day_end]
        preB=nearest_before(cgm,bt,30); g120=nearest(cgm,bt+timedelta(minutes=120),20)
        preL=nearest_before(cgm,lt,30) if lt else None; preD=nearest_before(cgm,dtm,30) if dtm else None
        all_days.append({'session':fp.stem,'date':str(d),'strict':strict,'permissive':permissive,'basal_n':len(basal_recent),'regular_n':len(regs),'premix_n':len(prem),'rapid_n':len(rapid),'basal_units':sum(x['units'] or 0 for x in basal_recent),'regular_units_day':sum(x['units'] or 0 for x in regs),'preB':preB,'g120':g120,'delta120':(g120-preB) if g120 is not None and preB is not None else None,'preL':preL,'preD':preD,'cgm_n':len(daycg),'cgm_mean':mean(daycg),'cgm_sd':sd(daycg),'tbr':100*sum(g<70 for g in daycg)/len(daycg) if daycg else None,'tir':100*sum(70<=g<=180 for g in daycg)/len(daycg) if daycg else None,'tar':100*sum(g>180 for g in daycg)/len(daycg) if daycg else None,'insulin_raw':' | '.join(f"{x['dt'].strftime('%H:%M')} {x['raw']}" for x in dayins)})
def summarize(ds):
    return {'n_days':len(ds),'n_sessions':len(set(x['session'] for x in ds)),'day_mean':desc([x['cgm_mean'] for x in ds if x['cgm_mean'] is not None]),'day_within_sd':desc([x['cgm_sd'] for x in ds if x['cgm_sd'] is not None]),'day_tbr':desc([x['tbr'] for x in ds if x['tbr'] is not None]),'day_tir':desc([x['tir'] for x in ds if x['tir'] is not None]),'day_tar':desc([x['tar'] for x in ds if x['tar'] is not None]),'preB':desc([x['preB'] for x in ds if x['preB'] is not None]),'preL':desc([x['preL'] for x in ds if x['preL'] is not None]),'preD':desc([x['preD'] for x in ds if x['preD'] is not None]),'delta120':desc([x['delta120'] for x in ds if x['delta120'] is not None]),'regular_units_day':desc([x['regular_units_day'] for x in ds]),'basal_units_window':desc([x['basal_units'] for x in ds])}
strict=[x for x in all_days if x['strict']]; permissive=[x for x in all_days if x['permissive']]
res={'definition':{'strict':'basal within breakfast -18h/+18h; >=2 regular events on calendar day; no premix or rapid on day','permissive':'same but >=1 regular event'},'strict':summarize(strict),'permissive':summarize(permissive)}
(OUT/'results.json').write_text(json.dumps(res,indent=2),encoding='utf-8')
with (OUT/'strict_days.csv').open('w',newline='',encoding='utf-8') as f:
    if strict:
        w=csv.DictWriter(f,fieldnames=list(strict[0]));w.writeheader();w.writerows(strict)
def F(d):return 'NA' if d['n']==0 else f"{d['mean']:.1f}±{d['sd']:.1f}"
s=res['strict']; md=['# Shanghai day-level actual Basal+Regular target','',f"Strict days: **{len(strict)}** across **{len(set(x['session'] for x in strict))} sessions**",f"Permissive days: **{len(permissive)}** across **{len(set(x['session'] for x in permissive))} sessions**",'', 'Strict definition: basal recorded within -18h/+18h of breakfast; at least 2 regular-insulin events on that calendar day; no premix or rapid-analog insulin that day.','', '## Strict fingerprint',f"- daily mean CGM: {F(s['day_mean'])}",f"- within-day CGM SD: {F(s['day_within_sd'])}",f"- day TBR/TIR/TAR: {F(s['day_tbr'])}% / {F(s['day_tir'])}% / {F(s['day_tar'])}%",f"- pre-breakfast: {F(s['preB'])}",f"- pre-lunch: {F(s['preL'])}",f"- pre-dinner: {F(s['preD'])}",f"- breakfast Δ120: {F(s['delta120'])}",f"- regular insulin/day: {F(s['regular_units_day'])} U",f"- basal insulin window total: {F(s['basal_units_window'])} U"]
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8'); print('\n'.join(md))
