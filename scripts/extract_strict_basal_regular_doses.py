#!/usr/bin/env python3
import csv,os,re,json,math
from collections import defaultdict
from datetime import datetime,timedelta
from pathlib import Path
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
OUT=Path('analysis/shanghai_strict_basal_regular_doses');OUT.mkdir(parents=True,exist_ok=True)
def dtparse(s):
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),fmt)
  except:pass
 return None
def reg_units(s):
 s=s or ''
 if not re.search(r'(Novolin R|Humulin R|regular insulin)',s,re.I): return 0.0
 vals=[float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s,re.I)]
 return sum(vals)
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if len(a)<2:return 0 if a else None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))
strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):strict.append((r['session'],r['date']))
res=[]
for sess,ds in strict:
 fp=ROOT/(sess+'.csv'); day=datetime.strptime(ds,'%Y-%m-%d').date(); rows=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   dt=dtparse(r.get('Date'))
   if dt and dt.date()==day: rows.append((dt,r))
 # meal times from dietary intake; fall back to clinical windows
 meals={}
 for dt,r in rows:
  diet=(r.get('Dietary intake') or '').strip(); h=dt.hour+dt.minute/60
  if diet and 5<=h<10 and 'breakfast' not in meals:meals['breakfast']=dt
  if diet and 10<=h<15 and 'lunch' not in meals:meals['lunch']=dt
  if diet and 15<=h<21 and 'dinner' not in meals:meals['dinner']=dt
 out={'session':sess,'date':ds}
 for k in ['breakfast','lunch','dinner']:
  mt=meals.get(k); u=0
  if mt:
   for dt,r in rows:
    if mt-timedelta(minutes=60)<=dt<=mt+timedelta(minutes=30):u+=reg_units(r.get('Insulin dose - s.c.'))
  out[k+'_regular_u']=u if mt else None
 res.append(out)
for k in ['breakfast_regular_u','lunch_regular_u','dinner_regular_u']:
 a=[x[k] for x in res if x[k] is not None]
 print(k,len(a),mean(a),sd(a),sorted(a))
with (OUT/'doses.csv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(res[0]));w.writeheader();w.writerows(res)
md=['# Strict Basal+Regular actual prandial doses','']
for k in ['breakfast_regular_u','lunch_regular_u','dinner_regular_u']:
 a=[x[k] for x in res if x[k] is not None];md.append(f"- {k}: n={len(a)}, {mean(a):.2f} ± {sd(a):.2f} U, range {min(a):.0f}–{max(a):.0f}")
md+=['','## Days']
for x in res:md.append(f"- {x['session']} {x['date']}: B {x['breakfast_regular_u']}, L {x['lunch_regular_u']}, D {x['dinner_regular_u']} U")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
