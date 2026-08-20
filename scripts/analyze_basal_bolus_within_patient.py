#!/usr/bin/env python3
import csv, json, math
from collections import defaultdict
from pathlib import Path
P=Path('analysis/basal_bolus_breakfast_variance/records.csv')
OUT=Path('analysis/basal_bolus_breakfast_variance/within_patient.json')

def mean(a): return sum(a)/len(a) if a else None
def corr(a,b):
    if len(a)<3:return None
    ma,mb=mean(a),mean(b); da=sum((x-ma)**2 for x in a); db=sum((y-mb)**2 for y in b)
    return sum((x-ma)*(y-mb) for x,y in zip(a,b))/math.sqrt(da*db) if da and db else None

def rank(a):
    idx=sorted(range(len(a)),key=lambda i:a[i]);r=[0.0]*len(a);i=0
    while i<len(a):
        j=i
        while j+1<len(a) and a[idx[j+1]]==a[idx[i]]:j+=1
        v=(i+j)/2+1
        for k in range(i,j+1):r[idx[k]]=v
        i=j+1
    return r

def spear(a,b):return corr(rank(a),rank(b)) if len(a)>=3 else None
rows=[]
with P.open(encoding='utf-8',newline='') as f:
    for r in csv.DictReader(f):
        for k in list(r):
            if k not in ('session','date'):
                try:r[k]=float(r[k]) if r[k] != '' else None
                except:r[k]=None
        rows.append(r)
groups=defaultdict(list)
for r in rows:groups[r['session']].append(r)
xs=['food_weight_g','staple_weight_g','near_breakfast_insulin_u','insulin_time_rel_breakfast_min']
ys=['d60','d120','d180','pre_lunch','auc_above_baseline_0_180']
res={'n_sessions':len(groups),'session_dose':{},'within_centered':{}}
for s,rs in groups.items():
    d=[r['near_breakfast_insulin_u'] for r in rs if r['near_breakfast_insulin_u'] is not None]
    res['session_dose'][s]={'n':len(d),'mean':mean(d),'sd': math.sqrt(sum((x-mean(d))**2 for x in d)/(len(d)-1)) if len(d)>1 else 0,'min':min(d) if d else None,'max':max(d) if d else None}
for x in xs:
  for y in ys:
    a=[];b=[]
    for s,rs in groups.items():
        z=[r for r in rs if r[x] is not None and r[y] is not None]
        if len(z)<2:continue
        mx=mean([r[x] for r in z]);my=mean([r[y] for r in z])
        for r in z:a.append(r[x]-mx);b.append(r[y]-my)
    res['within_centered'][f'{x}__{y}']={'n':len(a),'pearson':corr(a,b),'spearman':spear(a,b)}
OUT.write_text(json.dumps(res,indent=2),encoding='utf-8')
md=['# Within-patient breakfast analysis','','## Breakfast bolus variability by session']
for s,v in res['session_dose'].items():md.append(f"- {s}: n={v['n']}, mean={v['mean']:.2f} U, SD={v['sd']:.2f}, range={v['min']:.1f}-{v['max']:.1f}")
md+=['','## Patient-centered Spearman correlations']
for k,v in res['within_centered'].items():md.append(f"- {k}: n={v['n']}, rho={v['spearman']:.3f}" if v['spearman'] is not None else f'- {k}: NA')
Path('analysis/basal_bolus_breakfast_variance/within_patient.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('\n'.join(md))
