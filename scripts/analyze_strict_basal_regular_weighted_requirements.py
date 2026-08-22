#!/usr/bin/env python3
import csv, os, math, json, re
from pathlib import Path
from collections import defaultdict
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
DOSES=Path('analysis/shanghai_strict_basal_regular_doses/doses.csv')
TDD=Path('analysis/shanghai_strict_basal_regular_tdd/report.md')
SUMMARY=Path(os.environ.get('SHANGHAI_SUMMARY','/tmp/tju/pre-process/raw-data/Shanghai_T2DM_Summary.csv'))
OUT=Path('analysis/shanghai_strict_basal_regular_requirements');OUT.mkdir(parents=True,exist_ok=True)
def f(x):
 try:return float(str(x).strip())
 except:return None
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if len(a)<2:return 0 if a else None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))
# summary indexed by patient number prefix
summ={}
with SUMMARY.open(encoding='utf-8-sig',newline='') as fh:
 for r in csv.DictReader(fh):
  pid=(r.get('Patient Number') or '').strip()
  if pid:summ[pid]=r
# strict rows
strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as fh:
 for r in csv.DictReader(fh):strict.append(r)
dose={}
with DOSES.open(encoding='utf-8-sig',newline='') as fh:
 for r in csv.DictReader(fh):dose[(r['session'],r['date'])]=r
# parse TDD report days
basal={}
if TDD.exists():
 for line in TDD.read_text(encoding='utf-8').splitlines():
  m=re.match(r'- (\S+) (\d{4}-\d{2}-\d{2}): basal-day ([\d.]+), basal-window ([\d.]+), regular-TDD ([\d.]+), total-known ([\d.]+) U',line)
  if m:basal[(m.group(1),m.group(2))]=dict(basal_day=float(m.group(3)),basal_window=float(m.group(4)),regular_tdd=float(m.group(5)),total=float(m.group(6)))
rows=[]
for r in strict:
 key=(r['session'],r['date']); pid=r['session'].split('_')[0]; s=summ.get(pid,{})
 d=dose.get(key,{}); b=basal.get(key,{})
 wt=f(s.get('Body weight (kg)') or s.get('Weight (kg)') or s.get('Weight'))
 if wt is None:
  h=f(s.get('Height (m)') or s.get('Height')); bmi=f(s.get('BMI'))
  if h and h>3:h/=100
  if h and bmi:wt=bmi*h*h
 cpep=f(s.get('Fasting C-peptide (nmol/L)') or s.get('Fasting C-peptide') or s.get('Fasting C-peptide (ng/ml)'))
 bmi=f(s.get('BMI')); age=f(s.get('Age (years)') or s.get('Age')); dur=f(s.get('Duration of diabetes (years)') or s.get('Duration of diabetes'))
 preB=f(r.get('pre_breakfast')); preL=f(r.get('pre_lunch'))
 B=f(d.get('breakfast_regular_u'));L=f(d.get('lunch_regular_u'));D=f(d.get('dinner_regular_u'))
 out={'session':r['session'],'date':r['date'],'weight_kg':wt,'bmi':bmi,'age':age,'duration_y':dur,'fasting_cpep':cpep,'preB':preB,'preL':preL,'B':B,'L':L,'D':D,'basal_window':b.get('basal_window'),'regular_tdd':b.get('regular_tdd'),'total':b.get('total')}
 if wt:
  for k in ['B','L','D','basal_window','regular_tdd','total']:
   if out.get(k) is not None:out[k+'_kg']=out[k]/wt
 if B is not None and L not in (None,0):out['B_L_ratio']=B/L
 rows.append(out)
# session means avoid 12-day overweighting
sess=defaultdict(list)
for x in rows:sess[x['session']].append(x)
sess_summary=[]
for s,xs in sess.items():
 z={'session':s,'n_days':len(xs)}
 for k in ['weight_kg','bmi','age','duration_y','fasting_cpep','preB','preL','B','L','D','B_kg','L_kg','D_kg','basal_window_kg','regular_tdd_kg','total_kg','B_L_ratio']:
  a=[x[k] for x in xs if x.get(k) is not None];z[k]=mean(a) if a else None
 sess_summary.append(z)
md=['# Strict Basal+Regular insulin requirement audit','',f'Days: **{len(rows)}**, sessions: **{len(sess_summary)}**','']
for k,label in [('total_kg','known TDD/kg'),('basal_window_kg','basal/kg'),('regular_tdd_kg','regular TDD/kg'),('B_kg','breakfast regular/kg'),('L_kg','lunch regular/kg'),('D_kg','dinner regular/kg'),('B_L_ratio','B/L dose ratio')]:
 a=[x[k] for x in rows if x.get(k) is not None]
 if a:md.append(f'- {label}: day-weighted {mean(a):.3f} ± {sd(a):.3f}')
md+=['','## Session-level means']
for z in sess_summary:
 md.append(f"- {z['session']} (n={z['n_days']}): wt {z.get('weight_kg')}, B/L {z.get('B_L_ratio')}, B/kg {z.get('B_kg')}, L/kg {z.get('L_kg')}, TDD/kg {z.get('total_kg')}, preB {z.get('preB')}, Cpep {z.get('fasting_cpep')}, BMI {z.get('bmi')}")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
with (OUT/'rows.csv').open('w',newline='',encoding='utf-8') as fh:
 w=csv.DictWriter(fh,fieldnames=sorted({k for x in rows for k in x}));w.writeheader();w.writerows(rows)
(OUT/'session_summary.json').write_text(json.dumps(sess_summary,indent=2),encoding='utf-8')
print('\n'.join(md))
