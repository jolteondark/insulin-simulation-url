#!/usr/bin/env python3
import csv, os, re, math
from pathlib import Path
from datetime import datetime,timedelta
from collections import defaultdict
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
SESSIONS=['2021_0_20211013','2025_0_20210506','2035_0_20210629','2074_0_20210707']
OUT=Path('analysis/within_session_formulation_response');OUT.mkdir(parents=True,exist_ok=True)
def dtparse(s):
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),fmt)
  except:pass
 return None
def units(s):
 vals=re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s or '',re.I);return sum(float(x) for x in vals)
def nearest(rows,t,maxmin=45):
 xs=[(abs((dt-t).total_seconds()),float(r['CGM (mg / dl)'])) for dt,r in rows if (r.get('CGM (mg / dl)') or '').strip()]
 if not xs:return None
 d,v=min(xs);return v if d<=maxmin*60 else None
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if len(a)<2:return 0 if a else None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))
res=[]
for sess in SESSIONS:
 fp=ROOT/(sess+'.csv'); rows=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   dt=dtparse(r.get('Date'))
   if dt: rows.append((dt,r))
 byday=defaultdict(list)
 for x in rows:byday[x[0].date()].append(x)
 for day,dr in byday.items():
  # first breakfast meal
  meal=None
  for dt,r in dr:
   h=dt.hour+dt.minute/60
   if 5<=h<10 and (r.get('Dietary intake') or '').strip(): meal=dt;break
  if meal is None:continue
  sc=[];csii=[];rapid=False;premix=False
  for dt,r in dr:
   if not (meal-timedelta(minutes=90)<=dt<=meal+timedelta(minutes=30)):continue
   s=r.get('Insulin dose - s.c.') or ''
   if re.search(r'(Novolin R|Humulin R|regular insulin)',s,re.I):sc.append(units(s))
   if re.search(r'(aspart|glulisine|lispro|Lyumjev)',s,re.I):rapid=True
   if re.search(r'(70/30|70-30|premix|mixed)',s,re.I):premix=True
   c=r.get('CSII - bolus insulin (Novolin R, IU)') or ''
   try:
    if str(c).strip():csii.append(float(c))
   except:pass
  kind='SC-regular' if sc and not rapid and not premix and not csii else 'CSII-regular' if csii and not sc and not rapid and not premix else 'other/mixed'
  u=sum(sc)+sum(csii)
  pre=nearest(dr,meal-timedelta(minutes=15),45);g120=nearest(dr,meal+timedelta(minutes=120),45)
  if u>0 and pre is not None and g120 is not None:
   res.append({'session':sess,'date':str(day),'kind':kind,'breakfast_u':u,'preB':pre,'g120':g120,'delta120':g120-pre,'delta120_per_u':(g120-pre)/u})
md=['# Within-session formulation response audit','', 'Exploratory only: treatment changes are not randomized and CSII includes basal delivery differences.']
for sess in SESSIONS:
 md+=['',f'## {sess}']
 for kind in ['SC-regular','CSII-regular','other/mixed']:
  xs=[x for x in res if x['session']==sess and x['kind']==kind]
  if xs:
   md.append(f"- {kind}: n={len(xs)}, breakfast {mean([x['breakfast_u'] for x in xs]):.2f} U, preB {mean([x['preB'] for x in xs]):.1f}, delta120 {mean([x['delta120'] for x in xs]):.1f} ± {sd([x['delta120'] for x in xs]):.1f} mg/dL")
md+=['','## Records']
for x in res:md.append(f"- {x['session']} {x['date']} {x['kind']}: {x['breakfast_u']:.1f} U, pre {x['preB']:.1f}, d120 {x['delta120']:.1f}")
with (OUT/'records.csv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=res[0].keys() if res else ['session']);w.writeheader();w.writerows(res)
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('\n'.join(md))
