#!/usr/bin/env python3
import csv, os, re, json, math
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path('analysis/shanghai_strict_basal_regular'); OUT.mkdir(parents=True,exist_ok=True)

def dtparse(s):
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
        try:return datetime.strptime((s or '').strip(),fmt)
        except:pass
    return None

def fnum(x):
    try:return float(str(x).strip())
    except:return None

def mean(a):return sum(a)/len(a) if a else None

def sd(a):
    if not a:return None
    m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/len(a))

def parse_sc(s):
    s=(s or '').strip(); lo=s.lower(); out=[]
    if not s:return out
    # split multi-insulin strings; retain raw fragment for audit
    for frag in re.split(r';|\|',s):
        f=frag.strip(); l=f.lower()
        units=re.findall(r'(\d+(?:\.\d+)?)\s*iu',f,re.I)
        u=sum(float(x) for x in units) if units else None
        premix=any(k in l for k in ['30r','40r','50r','70/30','50/50','aspart 30','aspart 50','aspart 70/30','humulin 70/30'])
        basal=any(k in l for k in ['glargine','glarigine','detemir','degludec','lantus','levemir','tresiba'])
        regular=(any(k in l for k in ['novolin r','humulin r','regular insulin']) and not premix)
        rapid=(any(k in l for k in ['insulin aspart','insulin lispro','insulin glulisine']) and not premix)
        kind='premix' if premix else 'basal' if basal else 'regular' if regular else 'rapid' if rapid else 'other'
        out.append((kind,u,f))
    return out

def nearest(cgm,t,window=30):
    cand=[(abs((dt-t).total_seconds()),g) for dt,g in cgm if abs((dt-t).total_seconds())<=window*60]
    return min(cand,key=lambda x:x[0])[1] if cand else None

def target_after(cgm,t,mins,window=20):return nearest(cgm,t+timedelta(minutes=mins),window)

selected=[]
for fp in sorted(ROOT.glob('*.csv')):
    rows=[]
    with fp.open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            dt=dtparse(r.get('Date'))
            if dt: rows.append((dt,r))
    cgm=[(dt,fnum(r.get('CGM (mg / dl)'))) for dt,r in rows if fnum(r.get('CGM (mg / dl)')) is not None]
    # all injections across session for basal lookback
    inj=[]
    for dt,r in rows:
        for kind,u,raw in parse_sc(r.get('Insulin dose - s.c.')): inj.append((dt,kind,u,raw))
        cs=fnum(r.get('CSII - bolus insulin (Novolin R, IU)'))
        if cs not in (None,0): inj.append((dt,'csii_regular',cs,'CSII Novolin R'))
    byday=defaultdict(list)
    for dt,r in rows: byday[dt.date()].append((dt,r))
    for day,drows in byday.items():
        # breakfast meal time anchors day-level matching
        meals=[]
        for dt,r in drows:
            if (r.get('Dietary intake') or '').strip() and 5<=dt.hour<10: meals.append(dt)
        if not meals: continue
        bt=min(meals)
        # basal active/recorded in prior 18h through breakfast
        basal_prev=[x for x in inj if x[1]=='basal' and bt-timedelta(hours=18)<=x[0]<=bt]
        # actual insulin types on this calendar day
        dinj=[x for x in inj if x[0].date()==day]
        regular=[x for x in dinj if x[1]=='regular']
        premix=[x for x in dinj if x[1]=='premix']
        rapid=[x for x in dinj if x[1]=='rapid']
        csii=[x for x in dinj if x[1]=='csii_regular']
        # strict: background basal + >=2 regular SC administrations; exclude premix/rapid/CSII
        if not (basal_prev and len(regular)>=2 and not premix and not rapid and not csii): continue
        daycgm=[(dt,g) for dt,g in cgm if dt.date()==day]
        if not daycgm: continue
        gs=[g for _,g in daycgm]
        pre=nearest(cgm,bt,30); g60=target_after(cgm,bt,60);g120=target_after(cgm,bt,120);g180=target_after(cgm,bt,180)
        lunch_times=[dt for dt,r in drows if (r.get('Dietary intake') or '').strip() and 10<=dt.hour<15]
        lt=min(lunch_times) if lunch_times else None
        prel=nearest(cgm,lt,30) if lt else None
        dinner_times=[dt for dt,r in drows if (r.get('Dietary intake') or '').strip() and 15<=dt.hour<21]
        dtm=min(dinner_times) if dinner_times else None
        pred=nearest(cgm,dtm,30) if dtm else None
        breakfast_regular=[x for x in regular if bt-timedelta(minutes=60)<=x[0]<=bt+timedelta(minutes=30)]
        bu=sum(x[2] or 0 for x in breakfast_regular) if breakfast_regular else None
        selected.append({
            'session':fp.stem,'date':str(day),'n_cgm':len(gs),'mean':mean(gs),'sd':sd(gs),
            'tbr':100*sum(g<70 for g in gs)/len(gs),'tir':100*sum(70<=g<=180 for g in gs)/len(gs),'tar':100*sum(g>180 for g in gs)/len(gs),
            'pre_breakfast':pre,'g60':g60,'g120':g120,'g180':g180,'pre_lunch':prel,'pre_dinner':pred,
            'delta120':None if pre is None or g120 is None else g120-pre,
            'breakfast_regular_u':bu,'n_regular_day':len(regular),
            'basal_lookback':' | '.join(x[3] for x in basal_prev),
            'regular_day':' | '.join(x[3] for x in regular)
        })

def vals(k):return [r[k] for r in selected if r[k] is not None]
def desc(k):
    a=vals(k);return {'n':len(a),'mean':mean(a),'sd':sd(a)}
allg=[]
# reconstruct pooled day CGM from day summaries not possible; use weighted day percentages and day means for target fingerprint
W=sum(r['n_cgm'] for r in selected) or 1
R={
 'n_days':len(selected),'n_sessions':len(set(r['session'] for r in selected)),
 'day_mean':desc('mean'),'within_day_sd':desc('sd'),
 'weighted_tbr':sum(r['tbr']*r['n_cgm'] for r in selected)/W if selected else None,
 'weighted_tir':sum(r['tir']*r['n_cgm'] for r in selected)/W if selected else None,
 'weighted_tar':sum(r['tar']*r['n_cgm'] for r in selected)/W if selected else None,
 'pre_breakfast':desc('pre_breakfast'),'pre_lunch':desc('pre_lunch'),'pre_dinner':desc('pre_dinner'),
 'g120':desc('g120'),'delta120':desc('delta120'),'breakfast_regular_u':desc('breakfast_regular_u')
}
(OUT/'results.json').write_text(json.dumps({'summary':R,'days':selected},indent=2),encoding='utf-8')
if selected:
    with (OUT/'days.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(selected[0]));w.writeheader();w.writerows(selected)
md=['# Shanghai strict Basal+Regular day target','',f"Strict days: **{R['n_days']}** from **{R['n_sessions']}** sessions",'']
for label,k in [('day mean','day_mean'),('within-day SD','within_day_sd'),('pre-breakfast','pre_breakfast'),('pre-lunch','pre_lunch'),('pre-dinner','pre_dinner'),('+120 glucose','g120'),('breakfast Δ120','delta120'),('breakfast regular dose','breakfast_regular_u')]:
    d=R[k];md.append(f"- {label}: n={d['n']}, {d['mean']:.1f} ± {d['sd']:.1f}" if d['mean'] is not None else f'- {label}: NA')
if selected: md += ['',f"- weighted TBR: {R['weighted_tbr']:.2f}%",f"- weighted TIR: {R['weighted_tir']:.2f}%",f"- weighted TAR: {R['weighted_tar']:.2f}%",'','## Days'] + [f"- {r['session']} {r['date']}: mean {r['mean']:.1f}, preB {r['pre_breakfast']}, preL {r['pre_lunch']}, preD {r['pre_dinner']}, Δ120 {r['delta120']}, breakfast regular {r['breakfast_regular_u']} U" for r in selected]
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8');print('\n'.join(md))
