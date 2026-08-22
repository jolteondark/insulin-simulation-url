#!/usr/bin/env python3
import csv, json, math
from collections import defaultdict
from pathlib import Path

SRC=Path('analysis/basal_bolus_breakfast_variance/records.csv')
OUT=Path('analysis/basal_bolus_patient_meal_response'); OUT.mkdir(parents=True,exist_ok=True)

def f(x):
    try:return float(x)
    except:return None

def mean(a): return sum(a)/len(a) if a else None
def sd(a):
    if len(a)<2:return 0.0 if a else None
    m=mean(a); return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1))

rows=list(csv.DictReader(SRC.open(encoding='utf-8')))
by=defaultdict(list)
for r in rows: by[r['session']].append(r)
metrics=['d60','d120','d180','auc_above_baseline_0_180','pre','pre_lunch','near_breakfast_insulin_u','food_weight_g','staple_weight_g']
patients=[]
for pid,rs in sorted(by.items()):
    q={'session':pid,'n_days':len(rs)}
    for k in metrics:
        a=[f(r[k]) for r in rs];a=[x for x in a if x is not None]
        q[k+'_n']=len(a);q[k+'_mean']=mean(a);q[k+'_within_sd']=sd(a)
    patients.append(q)
summary={}
for k in metrics:
    a=[p[k+'_mean'] for p in patients if p[k+'_mean'] is not None]
    summary[k]={'n_patients':len(a),'mean_of_patient_means':mean(a),'between_patient_sd':sd(a),'min':min(a) if a else None,'max':max(a) if a else None}

res={'n_patients':len(patients),'patients':patients,'between_patient_summary':summary}
(OUT/'results.json').write_text(json.dumps(res,indent=2),encoding='utf-8')
md=['# Basal-bolus patient-level breakfast response heterogeneity','',f"Patients: **{len(patients)}**",'', '## Between-patient heterogeneity of patient-mean response']
for k in ['d60','d120','d180','auc_above_baseline_0_180','pre','pre_lunch']:
    x=summary[k]; md.append(f"- {k}: n={x['n_patients']}, mean-of-means {x['mean_of_patient_means']:.1f}, between-patient SD {x['between_patient_sd']:.1f}, range {x['min']:.1f} to {x['max']:.1f}")
md += ['', '## Per patient']
for p in patients:
    def z(k):
        v=p.get(k+'_mean'); return 'NA' if v is None else f'{v:.1f}'
    md.append(f"- {p['session']} (days {p['n_days']}): Δ60 {z('d60')}, Δ120 {z('d120')}, Δ180 {z('d180')}, AUC {z('auc_above_baseline_0_180')}, pre {z('pre')}, pre-lunch {z('pre_lunch')}, breakfast insulin {z('near_breakfast_insulin_u')} U")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('\n'.join(md))
