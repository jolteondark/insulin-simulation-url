#!/usr/bin/env python3
import csv, os, re, math
from pathlib import Path
from datetime import datetime
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
DOSES=Path('analysis/shanghai_strict_basal_regular_doses/doses.csv')
OUT=Path('analysis/shanghai_strict_meal_carb_estimate');OUT.mkdir(parents=True,exist_ok=True)
# crude carb density g carbohydrate per g food; intended only as sensitivity estimate
DENS={
 'rice':0.28,'coarse grain':0.25,'steamed bread':0.47,'bun':0.45,'noodle':0.25,'porridge':0.10,
 'bread':0.49,'potato':0.17,'sweet potato':0.20,'corn':0.21,'oat':0.12,'millet':0.12,
 'pumpkin':0.07,'yam':0.12,'dumpling':0.25,'wonton':0.22
}
def dtparse(s):
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),fmt)
  except:pass
 return None
def estimate(text):
 text=(text or '').lower(); total=0.0; matched=[]
 for line in text.splitlines():
  m=re.search(r'(.+?)\s+(\d+(?:\.\d+)?)\s*g\b',line.strip())
  if not m: continue
  name=m.group(1).strip(); wt=float(m.group(2)); dens=None; key=None
  for k,v in DENS.items():
   if k in name: dens=v; key=k; break
  if dens is not None:
   c=wt*dens; total+=c; matched.append((name,wt,key,dens,c))
 return total,matched
strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f): strict.append((r['session'],r['date']))
dose={}
with DOSES.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f): dose[(r['session'],r['date'])]=r
rows=[]
for sess,ds in strict:
 fp=ROOT/(sess+'.csv'); day=datetime.strptime(ds,'%Y-%m-%d').date(); meals={}
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   dt=dtparse(r.get('Date'))
   if not dt or dt.date()!=day: continue
   diet=(r.get('Dietary intake') or '').strip(); h=dt.hour+dt.minute/60
   if not diet: continue
   k='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
   if k and k not in meals: meals[k]=(dt,diet)
 d=dose.get((sess,ds),{})
 for k in ('breakfast','lunch','dinner'):
  mt,text=meals.get(k,(None,'')); carb,matched=estimate(text); u=float(d.get(k+'_regular_u') or 0)
  rows.append({'session':sess,'date':ds,'meal':k,'estimated_staple_carb_g':carb,'regular_u':u,'g_per_u':carb/u if carb>0 and u>0 else None,'diet':text.replace('\n',' | '),'matched_items':'; '.join(f'{x[0]} {x[1]:g}g->{x[4]:.1f}gC' for x in matched)})
def mean(a):return sum(a)/len(a) if a else None
def sd(a):
 if len(a)<2:return 0 if a else None
 m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))
md=['# Strict Basal+Regular meal carbohydrate proxy','', 'Crude sensitivity analysis only. Carbohydrate is estimated only from recognizable staple foods; non-staple carbohydrate is omitted.']
for meal in ('breakfast','lunch','dinner'):
 xs=[r for r in rows if r['meal']==meal and r['estimated_staple_carb_g']>0 and r['regular_u']>0]
 carbs=[r['estimated_staple_carb_g'] for r in xs]; gpu=[r['g_per_u'] for r in xs]
 md+=['',f'## {meal}',f'- usable meals: {len(xs)}',f'- estimated staple carbohydrate: {mean(carbs):.1f} ± {sd(carbs):.1f} g' if carbs else '- no usable carb estimates',f'- observed staple g/U: {mean(gpu):.2f} ± {sd(gpu):.2f}' if gpu else '- no usable g/U']
md+=['','## Records']
for r in rows:
 md.append(f"- {r['session']} {r['date']} {r['meal']}: carb {r['estimated_staple_carb_g']:.1f}g, regular {r['regular_u']:.1f}U, g/U {r['g_per_u'] if r['g_per_u'] is not None else 'NA'}; {r['matched_items']}")
with (OUT/'records.csv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('\n'.join(md))
