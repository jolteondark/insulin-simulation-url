#!/usr/bin/env python3
import csv, os, re, math
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
STRICT=Path('analysis/shanghai_strict_basal_regular/days.csv')
OUT=Path('analysis/shanghai_strict_regular_correction_audit'); OUT.mkdir(parents=True,exist_ok=True)

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

def f(x):
    try:return float(str(x).strip())
    except:return None

def nearest_cgm(rows, t, maxmin=30):
    best=None
    for dt,r in rows:
        g=f(r.get('CGM (mg / dl)'))
        if g is None: continue
        d=abs((dt-t).total_seconds())/60
        if d<=maxmin and (best is None or d<best[0]): best=(d,g)
    return best[1] if best else None

def mean(a): return sum(a)/len(a) if a else None

def sd(a):
    if len(a)<2:return 0 if a else None
    m=mean(a); return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))

strict=[]
with STRICT.open(encoding='utf-8-sig',newline='') as fh:
    for r in csv.DictReader(fh): strict.append((r['session'],r['date']))

events=[]; dayrows=[]
for sess,ds in strict:
    fp=ROOT/(sess+'.csv'); day=datetime.strptime(ds,'%Y-%m-%d').date(); rows=[]
    with fp.open(encoding='utf-8-sig',newline='') as fh:
        for r in csv.DictReader(fh):
            dt=dtparse(r.get('Date'))
            if dt and dt.date()==day: rows.append((dt,r))
    meals=[]
    for dt,r in rows:
        diet=(r.get('Dietary intake') or '').strip(); h=dt.hour+dt.minute/60
        if not diet: continue
        name='breakfast' if 5<=h<10 else 'lunch' if 10<=h<15 else 'dinner' if 15<=h<21 else None
        if name and not any(x[0]==name for x in meals): meals.append((name,dt))
    dayev=[]
    for dt,r in rows:
        u=reg_units(r.get('Insulin dose - s.c.'))
        if u<=0: continue
        rels=[]
        for name,mt in meals:
            rel=(dt-mt).total_seconds()/60
            rels.append((abs(rel),name,rel,mt))
        nearest=min(rels) if rels else None
        inwin=bool(nearest and -90<=nearest[2]<=30)
        ev={'session':sess,'date':ds,'time':dt.strftime('%H:%M'),'units':u,'cgm_near_dose':nearest_cgm(rows,dt),'classification':'meal-window' if inwin else 'off-meal','meal':nearest[1] if inwin else '', 'minutes_from_meal':round(nearest[2],1) if inwin else ''}
        events.append(ev); dayev.append(ev)
    # mark multiple regular injections mapped to same meal window
    counts=defaultdict(int)
    for e in dayev:
        if e['classification']=='meal-window': counts[e['meal']]+=1
    for e in dayev:
        e['multiple_same_meal_window']=bool(e['classification']=='meal-window' and counts[e['meal']]>1)
    meal_u=sum(e['units'] for e in dayev if e['classification']=='meal-window')
    off_u=sum(e['units'] for e in dayev if e['classification']=='off-meal')
    multi_u=sum(e['units'] for e in dayev if e.get('multiple_same_meal_window'))
    dayrows.append({'session':sess,'date':ds,'meal_window_regular_u':meal_u,'off_meal_regular_u':off_u,'total_regular_u':meal_u+off_u,'multiple_meal_window_u':multi_u,'n_regular_events':len(dayev),'n_off_meal_events':sum(e['classification']=='off-meal' for e in dayev)})

fields=['session','date','time','units','classification','meal','minutes_from_meal','cgm_near_dose','multiple_same_meal_window']
with (OUT/'events.csv').open('w',encoding='utf-8',newline='') as fh:
    w=csv.DictWriter(fh,fieldnames=fields); w.writeheader(); w.writerows(events)
with (OUT/'days.csv').open('w',encoding='utf-8',newline='') as fh:
    w=csv.DictWriter(fh,fieldnames=list(dayrows[0])); w.writeheader(); w.writerows(dayrows)

meal=[x['meal_window_regular_u'] for x in dayrows]; off=[x['off_meal_regular_u'] for x in dayrows]; tot=[x['total_regular_u'] for x in dayrows]
off_events=[e for e in events if e['classification']=='off-meal']
multi=[e for e in events if e.get('multiple_same_meal_window')]
md=['# Strict Basal+Regular correction-dose audit','',f'Days: **{len(dayrows)}**, regular injection events: **{len(events)}**','',
    'Important: source data do not label a dose as scheduled vs correction. This audit therefore uses timing only and reports meal-window versus off-meal doses; it does not claim that every meal-window dose is nutritional.', '',
    f'- Meal-window regular (-90 to +30 min from recorded meal): {mean(meal):.2f} ± {sd(meal):.2f} U/day',
    f'- Off-meal regular: {mean(off):.2f} ± {sd(off):.2f} U/day',
    f'- Total regular: {mean(tot):.2f} ± {sd(tot):.2f} U/day',
    f'- Off-meal fraction of all recorded regular units: {100*sum(off)/sum(tot):.1f}%' if sum(tot)>0 else '- Off-meal fraction: n/a',
    f'- Off-meal events: {len(off_events)}',
    f'- Meal-window events belonging to a meal with multiple regular injections: {len(multi)}','', '## Off-meal events']
if off_events:
    for e in off_events: md.append(f"- {e['session']} {e['date']} {e['time']}: {e['units']} U, CGM near dose {e['cgm_near_dose']}")
else: md.append('- none')
md+=['','## Days']
for d in dayrows:
    md.append(f"- {d['session']} {d['date']}: meal-window {d['meal_window_regular_u']:.1f} U, off-meal {d['off_meal_regular_u']:.1f} U, total {d['total_regular_u']:.1f} U, events {d['n_regular_events']}")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('\n'.join(md))
