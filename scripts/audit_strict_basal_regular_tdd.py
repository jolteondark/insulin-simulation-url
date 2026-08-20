#!/usr/bin/env python3
import csv,os,re,math
from collections import defaultdict
from datetime import datetime,timedelta
from pathlib import Path
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
OUT=Path('analysis/shanghai_strict_basal_regular_tdd');OUT.mkdir(parents=True,exist_ok=True)
def dtparse(s):
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),fmt)
  except:pass
 return None
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if len(a)<2:return 0 if a else None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))
def units_named(s,names):
 s=s or ''
 if not any(re.search(n,s,re.I) for n in names):return 0.0
 return sum(float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s,re.I))
BASAL=[r'glargine',r'glarigine',r'detemir',r'degludec',r'Lantus',r'Levemir',r'Tresiba']
REG=[r'Novolin R',r'Humulin R',r'regular insulin']
strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):strict.append((r['session'],r['date']))
res=[]
for sess,ds in strict:
 day=datetime.strptime(ds,'%Y-%m-%d').date();fp=ROOT/(sess+'.csv');allrows=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   dt=dtparse(r.get('Date'))
   if dt:allrows.append((dt,r))
 start=datetime.combine(day,datetime.min.time());end=start+timedelta(days=1)
 dayrows=[x for x in allrows if start<=x[0]<end]
 basal24=sum(units_named(r.get('Insulin dose - s.c.'),BASAL) for dt,r in dayrows)
 reg24=sum(units_named(r.get('Insulin dose - s.c.'),REG) for dt,r in dayrows)
 prev18=[(dt,r) for dt,r in allrows if start-timedelta(hours=18)<=dt<start+timedelta(hours=10)]
 basal_prev=sum(units_named(r.get('Insulin dose - s.c.'),BASAL) for dt,r in prev18)
 res.append({'session':sess,'date':ds,'basal_same_day_u':basal24,'basal_window_u':basal_prev,'regular_tdd_u':reg24,'total_insulin_known_u':basal24+reg24})
md=['# Strict Basal+Regular basal/TDD audit','']
for k in ['basal_same_day_u','basal_window_u','regular_tdd_u','total_insulin_known_u']:
 a=[x[k] for x in res];md.append(f"- {k}: {mean(a):.2f} ± {sd(a):.2f} U, range {min(a):.0f}–{max(a):.0f}")
md+=['','## Days']
for x in res:md.append(f"- {x['session']} {x['date']}: basal-day {x['basal_same_day_u']}, basal-window {x['basal_window_u']}, regular-TDD {x['regular_tdd_u']}, total-known {x['total_insulin_known_u']} U")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
with (OUT/'tdd.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=list(res[0]));w.writeheader();w.writerows(res)
print('\n'.join(md))
