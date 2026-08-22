#!/usr/bin/env python3
import csv, math
from pathlib import Path
from collections import defaultdict

STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
DOSES=Path('analysis/shanghai_strict_basal_regular_doses/doses.csv')
REQ=Path('analysis/shanghai_strict_basal_regular_requirements/rows.csv')
OUT=Path('analysis/shanghai_strict_baseline_prandial');OUT.mkdir(parents=True,exist_ok=True)

def f(x):
    try:return float(str(x).strip())
    except:return None

def mean(a):return sum(a)/len(a) if a else None

def sd(a):
    if len(a)<2:return 0 if a else None
    m=mean(a);return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))

def slope(xs,ys):
    if len(xs)<2:return 0.0
    mx,my=mean(xs),mean(ys); den=sum((x-mx)**2 for x in xs)
    if den<=0:return 0.0
    return sum((x-mx)*(y-my) for x,y in zip(xs,ys))/den

# load strict CGM premeal values
strict={}
with STRICT.open(encoding='utf-8-sig',newline='') as fh:
    for r in csv.DictReader(fh): strict[(r['session'],r['date'])]=r
# load meal doses
mealdose={}
with DOSES.open(encoding='utf-8-sig',newline='') as fh:
    for r in csv.DictReader(fh): mealdose[(r['session'],r['date'])]=r
# load weight
weights={}
if REQ.exists():
    with REQ.open(encoding='utf-8-sig',newline='') as fh:
        for r in csv.DictReader(fh): weights[(r['session'],r['date'])]=f(r.get('weight_kg'))

records=[]
for key,r in strict.items():
    d=mealdose.get(key,{})
    for meal,precol,dosecol in [('B','pre_breakfast','breakfast_regular_u'),('L','pre_lunch','lunch_regular_u'),('D','pre_dinner','dinner_regular_u')]:
        pre=f(r.get(precol)); dose=f(d.get(dosecol)); wt=weights.get(key)
        if pre is None or dose is None: continue
        records.append({'session':key[0],'date':key[1],'meal':meal,'pre':pre,'dose':dose,'weight_kg':wt})

# patient/session within-meal slopes dose vs premeal BG; use only sessions with >=3 observations for that meal.
groups=defaultdict(list)
for z in records: groups[(z['session'],z['meal'])].append(z)
slopes={}
for k,zs in groups.items():
    if len(zs)>=3:
        xs=[z['pre'] for z in zs]; ys=[z['dose'] for z in zs]
        slopes[k]=slope(xs,ys)
    else: slopes[k]=0.0

# correction-free baseline standardized to 120 mg/dL.
# negative slopes are set to 0 because they are not a plausible correction component.
TARGET_BG=120.0
for z in records:
    b=max(0.0,slopes.get((z['session'],z['meal']),0.0))
    corr=b*(z['pre']-TARGET_BG)
    z['within_slope_u_per_mgdl']=b
    z['estimated_correction_u']=corr
    z['baseline_u_at_120']=z['dose']-corr
    if z['weight_kg']:
        z['baseline_u_kg_at_120']=z['baseline_u_at_120']/z['weight_kg']

sess=defaultdict(list)
for z in records:sess[z['session']].append(z)
sess_rows=[]
for s,zs in sess.items():
    row={'session':s}
    for meal in ['B','L','D']:
        a=[z['baseline_u_at_120'] for z in zs if z['meal']==meal]
        row[f'{meal}_baseline_u']=mean(a) if a else None
        ak=[z.get('baseline_u_kg_at_120') for z in zs if z['meal']==meal and z.get('baseline_u_kg_at_120') is not None]
        row[f'{meal}_baseline_u_kg']=mean(ak) if ak else None
        row[f'{meal}_slope_u_per_100mgdl']=100*max(0.0,slopes.get((s,meal),0.0))
    p=[z.get('baseline_u_kg_at_120') for z in zs if z.get('baseline_u_kg_at_120') is not None]
    row['prandial_baseline_kg_sum_mealmeans']=sum(row[f'{m}_baseline_u_kg'] or 0 for m in ['B','L','D'])
    sess_rows.append(row)

vals=[r['prandial_baseline_kg_sum_mealmeans'] for r in sess_rows]
raw=[]
for s in sess_rows:
    raw.append(s)
md=['# Strict Basal+Regular baseline prandial estimate','',
    'Method: within-session, within-meal regression of actual regular dose on same-meal premeal CGM. Positive slope is treated as an upper-bound correction component; dose is standardized to premeal glucose 120 mg/dL. Negative slopes are set to zero. This is exploratory because the dataset does not label nutritional vs correction units.','',
    f'- session-equal estimated baseline prandial requirement: **{mean(vals):.3f} ± {sd(vals):.3f} U/kg/day**','',
    '## Sessions']
for r in sess_rows:
    md.append(f"- {r['session']}: baseline B/L/D {r['B_baseline_u']:.2f}/{r['L_baseline_u']:.2f}/{r['D_baseline_u']:.2f} U; baseline prandial {r['prandial_baseline_kg_sum_mealmeans']:.3f} U/kg/day; correction slopes per +100 mg/dL B/L/D {r['B_slope_u_per_100mgdl']:.2f}/{r['L_slope_u_per_100mgdl']:.2f}/{r['D_slope_u_per_100mgdl']:.2f} U")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
with (OUT/'records.csv').open('w',newline='',encoding='utf-8') as fh:
    fields=sorted({k for z in records for k in z});w=csv.DictWriter(fh,fieldnames=fields);w.writeheader();w.writerows(records)
with (OUT/'sessions.csv').open('w',newline='',encoding='utf-8') as fh:
    fields=list(sess_rows[0]);w=csv.DictWriter(fh,fieldnames=fields);w.writeheader();w.writerows(sess_rows)
print('\n'.join(md))
