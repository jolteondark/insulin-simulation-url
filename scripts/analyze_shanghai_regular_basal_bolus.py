#!/usr/bin/env python3
import csv,json,math,os
from collections import defaultdict
from datetime import datetime,timedelta
from pathlib import Path
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path('analysis/shanghai_regular_basal_bolus');OUT.mkdir(parents=True,exist_ok=True)
IDS={'2025_0_20210506','2035_0_20210629','2036_0_20210803','2043_0_20210513','2074_0_20210707','2094_0_20211109'}
def fnum(x):
 try:return float(str(x).strip())
 except:return None
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if not a:return None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/len(a))
def dtparse(s):
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),fmt)
  except:pass
 return None
def nearest(cgm,t,w=30):
 c=[(abs((d-t).total_seconds()),g) for d,g in cgm if abs((d-t).total_seconds())<=w*60]
 return min(c,key=lambda z:z[0])[1] if c else None
pool=[];sess=[];pre=defaultdict(list);d120_by=[]
for fp in sorted(ROOT.glob('*.csv')):
 if fp.stem not in IDS:continue
 rows=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   d=dtparse(r.get('Date'));g=fnum(r.get('CGM (mg / dl)'))
   if d:rows.append((d,g,r))
 cgm=[(d,g) for d,g,r in rows if g is not None]; cg=[g for d,g in cgm]
 if not cg:continue
 pool+=cg;tbr=100*sum(g<70 for g in cg)/len(cg);tar=100*sum(g>180 for g in cg)/len(cg);sess.append((fp.stem,mean(cg),sd(cg),tbr,100-tbr-tar,tar))
 ev={}
 for d,g,r in rows:
  if not (r.get('Dietary intake') or '').strip():continue
  h=d.hour+d.minute/60;mc='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
  if mc and (d.date(),mc) not in ev:ev[(d.date(),mc)]=d
 ds=[]
 for (day,mc),mt in ev.items():
  x=nearest(cgm,mt); 
  if x is not None:pre[mc].append(x)
  if mc=='breakfast':
   a=nearest(cgm,mt);b=nearest(cgm,mt+timedelta(minutes=120),20)
   if a is not None and b is not None:ds.append(b-a)
 if ds:d120_by.append((fp.stem,mean(ds),len(ds)))
R={'ids':sorted(IDS),'n_sessions':len(sess),'pooled':{'n':len(pool),'mean':mean(pool),'sd':sd(pool),'tbr':100*sum(g<70 for g in pool)/len(pool),'tir':100*sum(70<=g<=180 for g in pool)/len(pool),'tar':100*sum(g>180 for g in pool)/len(pool)},'premeal':{k:{'n':len(pre[k]),'mean':mean(pre[k]),'sd':sd(pre[k])} for k in ['breakfast','lunch','dinner']},'patient_mean_delta120':{'n':len(d120_by),'mean':mean([x[1] for x in d120_by]),'between_patient_sd':sd([x[1] for x in d120_by]),'per_session':d120_by}}
(OUT/'results.json').write_text(json.dumps(R,indent=2),encoding='utf-8')
p=R['pooled'];md=['# Shanghai regular-insulin basal-bolus target','',f"Sessions: **{R['n_sessions']}**",f"- pooled: **{p['mean']:.1f} ± {p['sd']:.1f} mg/dL**; TBR {p['tbr']:.2f}%; TIR {p['tir']:.2f}%; TAR {p['tar']:.2f}%"]
for k in ['breakfast','lunch','dinner']:
 x=R['premeal'][k];md.append(f"- pre-{k}: **{x['mean']:.1f} ± {x['sd']:.1f}** (n={x['n']})")
x=R['patient_mean_delta120'];md.append(f"- patient-mean breakfast Δ120: **{x['mean']:.1f}**, between-patient SD **{x['between_patient_sd']:.1f}** (n={x['n']})")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8');print('\n'.join(md))
