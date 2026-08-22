#!/usr/bin/env python3
import csv,os,re,math
from pathlib import Path
from collections import defaultdict
from datetime import datetime,timedelta
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
DOSES=Path('analysis/shanghai_strict_basal_regular_doses/doses.csv')
OUT=Path('analysis/shanghai_strict_morning_requirement');OUT.mkdir(parents=True,exist_ok=True)
STAPLES=('rice','bread','steamed bread','coarse grain','porridge','noodle','bun','cake','corn','potato','yam')
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
def meal_masses(text):
 text=text or ''
 total=0.0; staple=0.0
 for line in text.splitlines():
  vals=[float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*g\b',line,re.I)]
  if not vals:continue
  v=sum(vals);total+=v
  if any(k in line.lower() for k in STAPLES):staple+=v
 return total or None,staple or None
def solve3(A,b):
 M=[list(A[i])+[b[i]] for i in range(3)]
 for i in range(3):
  p=max(range(i,3),key=lambda r:abs(M[r][i]));M[i],M[p]=M[p],M[i]
  if abs(M[i][i])<1e-12:return None
  q=M[i][i];M[i]=[v/q for v in M[i]]
  for r in range(3):
   if r==i:continue
   q=M[r][i];M[r]=[M[r][c]-q*M[i][c] for c in range(4)]
 return [M[i][3] for i in range(3)]
strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):strict.append(r)
dmap={}
with DOSES.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):dmap[(r['session'],r['date'])]=r
rows=[]
for s in strict:
 sess,date=s['session'],s['date'];fp=ROOT/(sess+'.csv');day=datetime.strptime(date,'%Y-%m-%d').date();rr=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   dt=dtparse(r.get('Date'))
   if dt and dt.date()==day:rr.append((dt,r))
 meals={}; masses={}
 for dt,r in rr:
  diet=(r.get('Dietary intake') or '').strip()
  if not diet or diet.lower()=='data not available':continue
  h=dt.hour+dt.minute/60;k='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
  if k and k not in meals:meals[k]=dt;masses[k]=meal_masses(diet)
 def nearest_pre(mt):
  if not mt:return None
  cand=[]
  for dt,r in rr:
   g=fnum(r.get('CGM (mg / dl)'))
   if g is not None and dt<=mt and mt-dt<=timedelta(minutes=30):cand.append((abs((mt-dt).total_seconds()),g))
  return min(cand)[1] if cand else None
 dose=dmap.get((sess,date),{});b=fnum(dose.get('breakfast_regular_u'));l=fnum(dose.get('lunch_regular_u'));d=fnum(dose.get('dinner_regular_u'))
 pb,pl=nearest_pre(meals.get('breakfast')),nearest_pre(meals.get('lunch'))
 bt,bs=masses.get('breakfast',(None,None));lt,ls=masses.get('lunch',(None,None))
 rows.append({'session':sess,'date':date,'B':b,'L':l,'D':d,'BL_ratio':b/l if b is not None and l else None,'preB':pb,'preL':pl,'pre_diff':(pb-pl) if pb is not None and pl is not None else None,'breakfast_total_g':bt,'lunch_total_g':lt,'total_weight_ratio':bt/lt if bt and lt else None,'breakfast_staple_g':bs,'lunch_staple_g':ls,'staple_ratio':bs/ls if bs and ls else None})
# Primary adjustment uses staple-weight ratio + premeal glucose difference.
usable=[r for r in rows if r['BL_ratio'] and r['staple_ratio'] and r['pre_diff'] is not None]
for r in usable:r['y']=math.log(r['BL_ratio']);r['x1']=math.log(r['staple_ratio']);r['x2']=r['pre_diff']/50
coef=None
if len(usable)>=4:
 X=[[1,r['x1'],r['x2']] for r in usable];y=[r['y'] for r in usable]
 A=[[sum(x[i]*x[j] for x in X) for j in range(3)] for i in range(3)];bb=[sum(x[i]*yy for x,yy in zip(X,y)) for i in range(3)];coef=solve3(A,bb)
 if coef:
  for r in usable:r['adjusted_ratio']=math.exp(r['y']-(coef[1]*r['x1']+coef[2]*r['x2']))
by=defaultdict(list)
for r in rows:by[r['session']].append(r)
rat=[r['BL_ratio'] for r in rows if r['BL_ratio'] is not None]
md=['# Strict Basal+Regular morning requirement','',f'Days: **{len(rows)}**',f'- raw B/L dose ratio: {mean(rat):.2f} ± {sd(rat):.2f}, >1 in {sum(x>1 for x in rat)}/{len(rat)} days',f'- usable for staple+pre-glucose adjustment: {len(usable)}/{len(rows)} days']
if coef:
 sr=[r['staple_ratio'] for r in usable];pd=[r['pre_diff'] for r in usable];adj=[r['adjusted_ratio'] for r in usable]
 md += [f'- staple B/L ratio: {mean(sr):.2f} ± {sd(sr):.2f}',f'- preB-preL: {mean(pd):.1f} ± {sd(pd):.1f} mg/dL',f'- fitted log(B/L) = {coef[0]:.3f} + {coef[1]:.3f}*log(Bstaple/Lstaple) + {coef[2]:.3f}*(preB-preL)/50',f'- adjusted B/L ratio: {mean(adj):.2f} ± {sd(adj):.2f}; >1 in {sum(x>1 for x in adj)}/{len(adj)} days']
md+=['','## Session-equal summary']
for sess,x in sorted(by.items()):
 a=[r['BL_ratio'] for r in x if r['BL_ratio'] is not None];u=[r for r in x if r.get('adjusted_ratio') is not None]
 md.append(f"- {sess}: n={len(x)}, raw B/L {mean(a):.2f}"+(f", adjusted {mean([r['adjusted_ratio'] for r in u]):.2f}" if u else ''))
md+=['','Caution: food/staple weights are proxies, not carbohydrate grams; n is small and clustered by session.']
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
with (OUT/'days.csv').open('w',newline='',encoding='utf-8') as f:
 fields=sorted(set().union(*(r.keys() for r in rows)));w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
print('\n'.join(md))
