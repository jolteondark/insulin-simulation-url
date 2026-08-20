#!/usr/bin/env python3
import csv, json, math, os, re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path('analysis/basal_bolus_breakfast_variance'); OUT.mkdir(parents=True,exist_ok=True)
IDS={'2025_0_20210506','2035_0_20210629','2036_0_20210803','2043_0_20210513','2074_0_20210707','2090_0_20201130','2094_0_20211109'}
STAPLES=('rice','congee','porridge','bread','toast','noodle','bun','steamed bread','mantou','dumpling','potato','sweet potato','corn','oat','cereal','cake','biscuit','cracker','wonton','vermicelli')

def fnum(x):
    try:return float(str(x).strip())
    except:return None

def mean(a): return sum(a)/len(a) if a else None
def sd(a):
    if not a:return None
    m=mean(a); return math.sqrt(sum((x-m)**2 for x in a)/(len(a)-1)) if len(a)>1 else 0

def corr(xs,ys):
    z=[(x,y) for x,y in zip(xs,ys) if x is not None and y is not None]
    if len(z)<3:return None
    x=[a for a,b in z]; y=[b for a,b in z]; mx=mean(x);my=mean(y);dx=sum((a-mx)**2 for a in x);dy=sum((b-my)**2 for b in y)
    return sum((a-mx)*(b-my) for a,b in z)/math.sqrt(dx*dy) if dx and dy else None

def rank(a):
    idx=sorted(range(len(a)),key=lambda i:a[i]); r=[0]*len(a);i=0
    while i<len(a):
        j=i
        while j+1<len(a) and a[idx[j+1]]==a[idx[i]]:j+=1
        rr=(i+j)/2+1
        for k in range(i,j+1):r[idx[k]]=rr
        i=j+1
    return r

def spear(xs,ys):
    z=[(x,y) for x,y in zip(xs,ys) if x is not None and y is not None]
    return corr(rank([x for x,y in z]),rank([y for x,y in z])) if len(z)>=3 else None

def parse_dt(s):
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
        try:return datetime.strptime((s or '').strip(),fmt)
        except:pass
    return None

def grams(txt): return [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*g\b',txt or '',re.I)]
def staple_weight(txt):
    tot=0;found=False
    for line in (txt or '').splitlines():
        if any(k in line.lower() for k in STAPLES):
            g=grams(line)
            if g:tot+=sum(g);found=True
    return tot if found else None

def insulin_units(row):
    vals=[]
    s=(row.get('Insulin dose - s.c.') or '').strip()
    vals += [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s,re.I)]
    c=fnum(row.get('CSII - bolus insulin (Novolin R, IU)'))
    if c is not None: vals.append(c)
    return sum(vals) if vals else 0.0

def nearest(cgm,t,window=20,after=None):
    cand=[]
    for dt,g in cgm:
        if after is None:
            d=abs((dt-t).total_seconds())/60
            if d<=window:cand.append((d,g))
        else:
            target=t+timedelta(minutes=after);d=abs((dt-target).total_seconds())/60
            if d<=window:cand.append((d,g))
    return min(cand,key=lambda x:x[0])[1] if cand else None

records=[]
for fp in sorted(ROOT.glob('*.csv')):
    if fp.stem not in IDS:continue
    rows=[]
    with fp.open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            dt=parse_dt(r.get('Date')); g=fnum(r.get('CGM (mg / dl)'))
            if dt:rows.append((dt,g,r))
    cgm=[(dt,g) for dt,g,r in rows if g is not None]
    ins=[(dt,insulin_units(r)) for dt,g,r in rows if insulin_units(r)>0]
    byday=defaultdict(dict)
    for dt,g,r in rows:
        diet=(r.get('Dietary intake') or '').strip(); h=dt.hour+dt.minute/60
        if diet and 5<=h<10 and 'breakfast' not in byday[dt.date()]:byday[dt.date()]['breakfast']=(dt,r)
        if diet and 10<=h<15 and 'lunch' not in byday[dt.date()]:byday[dt.date()]['lunch']=(dt,r)
    for d,e in byday.items():
        if 'breakfast' not in e:continue
        bt,br=e['breakfast']; lt=e.get('lunch',(None,None))[0]
        pre=nearest(cgm,bt,30); g60=nearest(cgm,bt,20,60);g120=nearest(cgm,bt,20,120);g180=nearest(cgm,bt,20,180)
        prel=nearest(cgm,lt,30) if lt else None
        fw=sum(grams(br.get('Dietary intake') or '')) if grams(br.get('Dietary intake') or '') else None
        sw=staple_weight(br.get('Dietary intake') or '')
        iu=sum(u for it,u in ins if bt-timedelta(minutes=45)<=it<=bt+timedelta(minutes=15))
        itimes=[(it-bt).total_seconds()/60 for it,u in ins if bt-timedelta(minutes=90)<=it<=bt+timedelta(minutes=30)]
        lead=min(itimes,key=lambda x:abs(x)) if itimes else None
        vals=[x for x in [g60,g120,g180] if x is not None]
        mx=max(vals) if vals else None
        auc=None
        if pre is not None:
            pts=[]
            for mins,g in [(0,pre),(60,g60),(120,g120),(180,g180)]:
                if g is not None:pts.append((mins,g-pre))
            if len(pts)>=2:
                auc=sum((pts[i][0]-pts[i-1][0])*(pts[i][1]+pts[i-1][1])/2 for i in range(1,len(pts)))
        records.append({'session':fp.stem,'date':str(d),'breakfast_min':bt.hour*60+bt.minute,'pre':pre,'g60':g60,'g120':g120,'g180':g180,'pre_lunch':prel,'d60':None if pre is None or g60 is None else g60-pre,'d120':None if pre is None or g120 is None else g120-pre,'d180':None if pre is None or g180 is None else g180-pre,'max_0_180':mx,'auc_above_baseline_0_180':auc,'food_weight_g':fw,'staple_weight_g':sw,'near_breakfast_insulin_u':iu,'insulin_time_rel_breakfast_min':lead})

metrics={}
for x in ['pre','g60','g120','g180','pre_lunch','d60','d120','d180','food_weight_g','staple_weight_g','near_breakfast_insulin_u','insulin_time_rel_breakfast_min','auc_above_baseline_0_180']:
    a=[r[x] for r in records if r[x] is not None]; metrics[x]={'n':len(a),'mean':mean(a),'sd':sd(a)}
rels={}
for x in ['food_weight_g','staple_weight_g','near_breakfast_insulin_u','insulin_time_rel_breakfast_min']:
    for y in ['d60','d120','d180','pre_lunch','auc_above_baseline_0_180']:
        a=[];b=[]
        for r in records:
            if r[x] is not None and r[y] is not None:a.append(r[x]);b.append(r[y])
        rels[f'{x}__{y}']={'n':len(a),'pearson':corr(a,b),'spearman':spear(a,b)}
result={'ids':sorted(IDS),'n_breakfast_records':len(records),'metrics':metrics,'relationships':rels}
(OUT/'results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
with (OUT/'records.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(records)
md=['# Basal-bolus breakfast-to-lunch variance decomposition','',f"Breakfast-day records: **{len(records)}**",'','## CGM trajectory']
for k in ['pre','g60','g120','g180','pre_lunch','d60','d120','d180']:
    d=metrics[k];md.append(f"- {k}: n={d['n']}, {d['mean']:.1f} ± {d['sd']:.1f}" if d['mean'] is not None else f'- {k}: NA')
md+=['','## Breakfast inputs']
for k in ['food_weight_g','staple_weight_g','near_breakfast_insulin_u','insulin_time_rel_breakfast_min']:
    d=metrics[k];md.append(f"- {k}: n={d['n']}, {d['mean']:.2f} ± {d['sd']:.2f}" if d['mean'] is not None else f'- {k}: NA')
md+=['','## Spearman correlations']
for k,v in rels.items():md.append(f"- {k}: n={v['n']}, rho={v['spearman']:.3f}" if v['spearman'] is not None else f"- {k}: n={v['n']}, rho=NA")
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8');print('\n'.join(md))
