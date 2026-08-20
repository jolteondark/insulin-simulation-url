#!/usr/bin/env python3
import csv, json, math, os, re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
SUMMARY=Path(os.environ.get('SHANGHAI_SUMMARY','/tmp/tju/pre-process/raw-data/Shanghai_T2DM_Summary.csv'))
OUT=Path('analysis/shanghai106_regimen'); OUT.mkdir(parents=True,exist_ok=True)

def fnum(x):
    try:return float(str(x).strip())
    except:return None

def mean(a): return sum(a)/len(a) if a else None
def sd(a):
    if not a:return None
    m=mean(a); return math.sqrt(sum((x-m)**2 for x in a)/len(a))
def desc(a): return {'n':len(a),'mean':mean(a),'sd':sd(a)}

def parse_dt(s):
    s=(s or '').strip()
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
        try:return datetime.strptime(s,fmt)
        except:pass
    return None

def regimen(agent):
    s=(agent or '').lower().strip()
    insulin=any(k in s for k in ['insulin','novolin','humulin','gansulin'])
    if not insulin:return 'No insulin'
    premix=any(k in s for k in ['30r','40r','50r','70/30','50/50','aspart 30','aspart 50','aspart 70/30','lispro 25','lispro 50'])
    if premix:return 'Premix'
    basal=any(k in s for k in ['degludec','glargine','detemir','lantus','levemir','tresiba'])
    short=any(k in s for k in ['novolin r','humulin r','regular insulin','insulin aspart','insulin lispro','insulin glulisine'])
    if basal and not short:return 'Basal-only'
    if short and not basal:return 'Short/regular-only'
    return 'Other insulin'

summary={}
with SUMMARY.open(encoding='utf-8-sig',newline='') as f:
    for r in csv.DictReader(f):
        pid=(r.get('Patient Number') or '').strip(); agent=(r.get('Hypoglycemic Agents') or '').strip()
        if pid: summary[pid]={'agent':agent,'regimen':regimen(agent)}

counts=defaultdict(int)
for x in summary.values():counts[x['regimen']]+=1

G=defaultdict(list); session=defaultdict(list); pre=defaultdict(lambda:defaultdict(list)); matched=[]
for fp in sorted(ROOT.glob('*.csv')):
    pid=fp.stem
    if pid not in summary: continue
    reg=summary[pid]['regimen']; rows=[]
    with fp.open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            dt=parse_dt(r.get('Date')); g=fnum(r.get('CGM (mg / dl)'))
            if dt:rows.append((dt,g,r))
    cg=[g for dt,g,r in rows if g is not None]
    if not cg:continue
    matched.append(pid); G[reg].extend(cg)
    tbr=100*sum(g<70 for g in cg)/len(cg); tar=100*sum(g>180 for g in cg)/len(cg); tir=100-tbr-tar
    session[reg].append({'mean':mean(cg),'sd':sd(cg),'tbr':tbr,'tir':tir,'tar':tar})
    ev={}
    for dt,g,r in rows:
        diet=(r.get('Dietary intake') or '').strip()
        if not diet:continue
        h=dt.hour+dt.minute/60
        mc='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
        if not mc:continue
        key=(dt.date(),mc)
        if key not in ev:ev[key]=dt
    crows=[(dt,g) for dt,g,r in rows if g is not None]
    for (d,mc),mt in ev.items():
        cand=[(abs((mt-dt).total_seconds()),g) for dt,g in crows if dt<=mt and mt-dt<=timedelta(minutes=30)]
        if cand:pre[reg][mc].append(min(cand,key=lambda z:z[0])[1])

result={'summary_counts':dict(counts),'n_summary':len(summary),'n_cgm_sessions':len(matched),'groups':{}}
for reg in ['No insulin','Premix','Basal-only','Short/regular-only','Other insulin']:
    cg=G[reg]; ss=session[reg]
    result['groups'][reg]={
      'n_sessions':len(ss),'pooled_cgm':{'n':len(cg),'mean':mean(cg),'sd':sd(cg),'tbr':100*sum(g<70 for g in cg)/len(cg) if cg else None,'tir':100*sum(70<=g<=180 for g in cg)/len(cg) if cg else None,'tar':100*sum(g>180 for g in cg)/len(cg) if cg else None},
      'session_mean':desc([x['mean'] for x in ss]),'session_within_sd':desc([x['sd'] for x in ss]),'session_tbr':desc([x['tbr'] for x in ss]),'session_tir':desc([x['tir'] for x in ss]),'session_tar':desc([x['tar'] for x in ss]),
      'premeal':{mc:desc(pre[reg][mc]) for mc in ['breakfast','lunch','dinner']}
    }

(OUT/'results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
md=['# Shanghai106 regimen-stratified CGM','',f"Summary n={len(summary)}; CGM sessions matched={len(matched)}",'',f"Summary counts: {dict(counts)}",'','| Regimen | n sessions | mean±SD | TBR | TIR | TAR | pre-B | pre-L | pre-D |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
for reg in ['No insulin','Premix','Basal-only','Short/regular-only','Other insulin']:
    x=result['groups'][reg]; p=x['pooled_cgm']; q=x['premeal']
    fmt=lambda d: 'NA' if not d['n'] else f"{d['mean']:.1f}±{d['sd']:.1f}"
    md.append(f"| {reg} | {x['n_sessions']} | {p['mean']:.1f}±{p['sd']:.1f} | {p['tbr']:.2f}% | {p['tir']:.2f}% | {p['tar']:.2f}% | {fmt(q['breakfast'])} | {fmt(q['lunch'])} | {fmt(q['dinner'])} |")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8'); print('\n'.join(md))
