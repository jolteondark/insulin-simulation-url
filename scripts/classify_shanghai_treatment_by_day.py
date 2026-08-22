#!/usr/bin/env python3
import csv,os,re,json,math
from collections import defaultdict,Counter
from datetime import datetime
from pathlib import Path
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path('analysis/shanghai_daylevel_treatment');OUT.mkdir(parents=True,exist_ok=True)
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
def classify(strings,has_csii):
 s=' '.join(strings).lower()
 premix=any(k in s for k in ['30r','40r','50r','70/30','50/50','aspart 30','aspart 50','aspart 70/30','humulin 70/30'])
 basal=any(k in s for k in ['glargine','glarigine','detemir','degludec','lantus','levemir','tresiba'])
 regular=any(k in s for k in ['novolin r','humulin r','regular insulin']) or has_csii
 rapid=any(k in s for k in ['insulin aspart','insulin lispro','insulin glulisine']) and not premix
 if premix:return 'Premix'
 if has_csii:return 'CSII-regular'
 if basal and regular:return 'Basal+regular'
 if basal and rapid:return 'Basal+rapid'
 if basal:return 'Basal-only'
 if regular:return 'Regular-only'
 if rapid:return 'Rapid-only'
 return 'No recorded insulin'

days=[]
for fp in sorted(ROOT.glob('*.csv')):
 by=defaultdict(list)
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   d=dtparse(r.get('Date'))
   if d:by[d.date()].append((d,r))
 for day,rows in by.items():
  strings=[];has_csii=False;cgm=[]
  for d,r in rows:
   sc=(r.get('Insulin dose - s.c.') or '').strip()
   if sc:strings.append(sc)
   cs=(r.get('CSII - bolus insulin (Novolin R, IU)') or '').strip()
   if fnum(cs) not in (None,0):has_csii=True
   g=fnum(r.get('CGM (mg / dl)'))
   if g is not None:cgm.append(g)
  reg=classify(strings,has_csii)
  if cgm:
   days.append({'session':fp.stem,'date':str(day),'regimen':reg,'insulin_strings':' | '.join(sorted(set(strings))),'has_csii':has_csii,'n_cgm':len(cgm),'mean':mean(cgm),'sd':sd(cgm),'tbr':100*sum(g<70 for g in cgm)/len(cgm),'tir':100*sum(70<=g<=180 for g in cgm)/len(cgm),'tar':100*sum(g>180 for g in cgm)/len(cgm)})
counts=Counter(x['regimen'] for x in days);groups={}
for reg in sorted(counts):
 x=[d for d in days if d['regimen']==reg];w=sum(d['n_cgm'] for d in x)
 groups[reg]={'n_days':len(x),'mean_day_mean':mean([d['mean'] for d in x]),'mean_within_day_sd':mean([d['sd'] for d in x]),'weighted_tbr':sum(d['tbr']*d['n_cgm'] for d in x)/w,'weighted_tir':sum(d['tir']*d['n_cgm'] for d in x)/w,'weighted_tar':sum(d['tar']*d['n_cgm'] for d in x)/w}
R={'n_days':len(days),'counts':dict(counts),'groups':groups}
(OUT/'results.json').write_text(json.dumps(R,indent=2),encoding='utf-8')
with (OUT/'days.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=list(days[0]));w.writeheader();w.writerows(days)
md=['# Shanghai T2DM day-level treatment classification','',f"CGM days: **{len(days)}**",'','| Regimen | days | mean of day means | mean within-day SD | TBR | TIR | TAR |','|---|---:|---:|---:|---:|---:|---:|']
for reg in sorted(groups):
 x=groups[reg];md.append(f"| {reg} | {x['n_days']} | {x['mean_day_mean']:.1f} | {x['mean_within_day_sd']:.1f} | {x['weighted_tbr']:.2f}% | {x['weighted_tir']:.2f}% | {x['weighted_tar']:.2f}% |")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8');print('\n'.join(md))
