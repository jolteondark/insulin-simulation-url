#!/usr/bin/env python3
import csv, math, re
from pathlib import Path
from collections import defaultdict
SRC=Path('analysis/shanghai_strict_basal_regular/days.csv')
OUT=Path('analysis/shanghai_strict_regular_dose_glucose_coupling'); OUT.mkdir(parents=True,exist_ok=True)
def f(x):
    try:return float(str(x).strip())
    except:return None
def corr(x,y):
    if len(x)<3:return None
    mx=sum(x)/len(x); my=sum(y)/len(y)
    a=sum((u-mx)*(v-my) for u,v in zip(x,y)); b=sum((u-mx)**2 for u in x); c=sum((v-my)**2 for v in y)
    return a/math.sqrt(b*c) if b and c else None
def slope(x,y):
    if len(x)<2:return None
    mx=sum(x)/len(x); my=sum(y)/len(y); den=sum((u-mx)**2 for u in x)
    return sum((u-mx)*(v-my) for u,v in zip(x,y))/den if den else None
def doses(s):
    vals=[float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s or '',re.I)]
    return (vals+[None,None,None])[:3]
rows=[]
with SRC.open(encoding='utf-8-sig',newline='') as fh:
    for r in csv.DictReader(fh):
        B,L,D=doses(r.get('regular_day'))
        rows.append({'session':r['session'],'date':r['date'],'preB':f(r.get('pre_breakfast')),'preL':f(r.get('pre_lunch')),'preD':f(r.get('pre_dinner')),'B':B,'L':L,'D':D})
by=defaultdict(list)
for r in rows:by[r['session']].append(r)
md=['# Strict regular dose–premeal glucose coupling','', 'Purpose: test whether the recorded single meal-window regular injection contains a glucose-correction/titration component. Correlation does not distinguish same-day sliding-scale correction from clinician dose changes carried forward across days.','']
for meal,gk,dk in [('B','preB','B'),('L','preL','L'),('D','preD','D')]:
    md.append(f'## {meal}')
    for s,rs in by.items():
        x=[r[gk] for r in rs if r[gk] is not None and r[dk] is not None]; y=[r[dk] for r in rs if r[gk] is not None and r[dk] is not None]
        rr=corr(x,y); sl=slope(x,y)
        md.append(f"- {s}: n={len(x)}, r={rr:.3f}, slope={sl:.4f} U/(mg/dL)" if rr is not None else f'- {s}: n={len(x)}, insufficient variation')
    # patient-centered pooled correlation
    xx=[]; yy=[]
    for s,rs in by.items():
        pairs=[(r[gk],r[dk]) for r in rs if r[gk] is not None and r[dk] is not None]
        if len(pairs)<2:continue
        mx=sum(a for a,b in pairs)/len(pairs); my=sum(b for a,b in pairs)/len(pairs)
        xx += [a-mx for a,b in pairs]; yy += [b-my for a,b in pairs]
    rr=corr(xx,yy)
    md.append(f'- Patient-centered pooled: n={len(xx)}, r={rr:.3f}' if rr is not None else '- Patient-centered pooled: insufficient')
    md.append('')
# lagged relationship for sessions with repeated days: yesterday premeal glucose vs today's dose
md.append('## Lagged: previous-day premeal glucose -> next-day same-meal dose')
for meal,gk,dk in [('B','preB','B'),('L','preL','L'),('D','preD','D')]:
    x=[];y=[]
    for s,rs in by.items():
        rs=sorted(rs,key=lambda r:r['date'])
        for a,b in zip(rs,rs[1:]):
            if a[gk] is not None and b[dk] is not None:
                x.append(a[gk]);y.append(b[dk])
    rr=corr(x,y);sl=slope(x,y)
    md.append(f'- {meal}: n={len(x)}, r={rr:.3f}, slope={sl:.4f} U/(mg/dL)' if rr is not None else f'- {meal}: insufficient')
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('\n'.join(md))
