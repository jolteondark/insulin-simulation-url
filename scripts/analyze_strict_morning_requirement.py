#!/usr/bin/env python3
import csv,os,re,json,math
from pathlib import Path
from collections import defaultdict
from datetime import datetime,timedelta
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
DOSES=Path('analysis/shanghai_strict_basal_regular_doses/doses.csv')
SUMMARY=Path(os.environ.get('SHANGHAI_SUMMARY','/tmp/tju/pre-process/raw-data/Shanghai_T2DM_Summary.csv'))
OUT=Path('analysis/shanghai_strict_morning_requirement');OUT.mkdir(parents=True,exist_ok=True)
def dtparse(s):
 for f in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),f)
  except:pass
 return None
def fnum(x):
 try:return float(str(x).strip())
 except:return None
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if len(a)<2:return 0 if a else None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))
def corr(x,y):
 if len(x)<3:return None
 mx,my=mean(x),mean(y);sx=sum((a-mx)**2 for a in x);sy=sum((b-my)**2 for b in y)
 return sum((a-mx)*(b-my) for a,b in zip(x,y))/math.sqrt(sx*sy) if sx and sy else None
summary={}
with SUMMARY.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):
  pid=(r.get('Patient Number') or '').strip(); summary[pid]=r
strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f): strict.append(r)
dmap={}
with DOSES.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f): dmap[(r['session'],r['date'])]=r
rows=[]
for s in strict:
 sess,date=s['session'],s['date']; fp=ROOT/(sess+'.csv'); day=datetime.strptime(date,'%Y-%m-%d').date(); rr=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   dt=dtparse(r.get('Date'))
   if dt and dt.date()==day:rr.append((dt,r))
 meals={}; weights={}
 for dt,r in rr:
  diet=(r.get('Dietary intake') or '').strip(); w=fnum(r.get('Dietary intake (g)'))
  if not diet:continue
  h=dt.hour+dt.minute/60; k='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
  if k and k not in meals: meals[k]=dt; weights[k]=w
 def nearest_pre(mt):
  if not mt:return None
  cand=[]
  for dt,r in rr:
   g=fnum(r.get('CGM (mg / dl)'))
   if g is not None and dt<=mt and mt-dt<=timedelta(minutes=30):cand.append((abs((mt-dt).total_seconds()),g))
  return min(cand)[1] if cand else None
 dose=dmap.get((sess,date),{})
 b=fnum(dose.get('breakfast_regular_u'));l=fnum(dose.get('lunch_regular_u'));d=fnum(dose.get('dinner_regular_u'))
 pb,pl=nearest_pre(meals.get('breakfast')),nearest_pre(meals.get('lunch'))
 bw, lw=weights.get('breakfast'),weights.get('lunch')
 rows.append({'session':sess,'date':date,'B':b,'L':l,'D':d,'BL_ratio':b/l if b is not None and l else None,'preB':pb,'preL':pl,'breakfast_weight_g':bw,'lunch_weight_g':lw,'pre_diff':(pb-pl) if pb is not None and pl is not None else None,'weight_ratio':bw/lw if bw and lw else None})
# crude log-linear standardized residual: log(B/L) ~ log(Bmeal/Lmeal)+0.01*(preB-preL)
usable=[r for r in rows if r['BL_ratio'] and r['weight_ratio']]
for r in usable:r['log_ratio']=math.log(r['BL_ratio']);r['log_weight_ratio']=math.log(r['weight_ratio'])
# fit OLS if sufficient
if len(usable)>=4:
 import numpy as np
 X=[];y=[]
 for r in usable:X.append([1,r['log_weight_ratio'],(r['pre_diff'] or 0)/50]);y.append(r['log_ratio'])
 X=np.array(X,float);y=np.array(y,float);coef=np.linalg.lstsq(X,y,rcond=None)[0]
 for r in usable:r['adjusted_log_ratio']=r['log_ratio']-(coef[1]*r['log_weight_ratio']+coef[2]*(r['pre_diff'] or 0)/50)
else:coef=[None]*3
by=defaultdict(list)
for r in rows:by[r['session']].append(r)
md=['# Strict Basal+Regular morning requirement','',f'Days: **{len(rows)}**','']
rat=[r['BL_ratio'] for r in rows if r['BL_ratio'] is not None]
md.append(f'- raw B/L dose ratio: {mean(rat):.2f} ± {sd(rat):.2f}, >1 in {sum(x>1 for x in rat)}/{len(rat)} days')
if usable:
 wr=[r['weight_ratio'] for r in usable];pd=[r['pre_diff'] for r in usable if r['pre_diff'] is not None]
 md.append(f'- meal-weight B/L ratio: {mean(wr):.2f} ± {sd(wr):.2f}')
 md.append(f'- preB-preL: {mean(pd):.1f} ± {sd(pd):.1f} mg/dL')
 md.append(f'- fitted log(B/L) = {coef[0]:.3f} + {coef[1]:.3f}*log(Bmeal/Lmeal) + {coef[2]:.3f}*(preB-preL)/50')
 adj=[math.exp(r['adjusted_log_ratio']) for r in usable]
 md.append(f'- adjusted B/L ratio after meal weight + pre-glucose: {mean(adj):.2f} ± {sd(adj):.2f}; >1 in {sum(x>1 for x in adj)}/{len(adj)} days')
md+=['','## Session-equal summary']
for sess,x in sorted(by.items()):
 a=[r['BL_ratio'] for r in x if r['BL_ratio'] is not None];u=[r for r in x if r in usable]
 md.append(f"- {sess}: n={len(x)}, B/L {mean(a):.2f}" + (f", adjusted {mean([math.exp(r['adjusted_log_ratio']) for r in u]):.2f}" if u else ''))
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
with (OUT/'days.csv').open('w',newline='',encoding='utf-8') as f:
 fields=sorted(set().union(*(r.keys() for r in rows)));w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
print('\n'.join(md))