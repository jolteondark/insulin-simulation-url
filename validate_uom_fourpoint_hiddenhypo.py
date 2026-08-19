#!/usr/bin/env python3
"""External validation utility for Manchester/T1D-UOM V1.0.3.

Usage:
  python validate_uom_fourpoint_hiddenhypo.py ManchesterCSCoordinatedDiabetesStudy-V1.0.3.zip

Outputs UOM_FOURPOINT_HIDDENHYPO_RESULT.json.
The parser is intentionally schema-tolerant: it scans CSV files for a timestamp-like column
and a glucose-like numeric column, then chooses the highest-density CGM-like table per subject/file.
Pseudo-checks are nearest readings to 07:00, 12:00, 18:00, 21:00 within +/-10 min.
Complete days require all four checks. Sustained hidden hypoglycemia = >=3 consecutive readings
below threshold with adjacent gaps <=7 min while all four pseudo-checks are >=70 mg/dL.
"""
import sys, zipfile, io, json, re
from pathlib import Path
import numpy as np
import pandas as pd

TARGETS=[7*60,12*60,18*60,21*60]
LABELS=['07','12','18','21']

def pick_cols(df):
    cols=list(df.columns)
    low={c:str(c).lower() for c in cols}
    t_candidates=[c for c in cols if any(k in low[c] for k in ['time','date','timestamp','datetime'])]
    g_candidates=[c for c in cols if any(k in low[c] for k in ['glucose','sgv','sensor','cgm']) and 'insulin' not in low[c]]
    best=None
    for tc in t_candidates:
        t=pd.to_datetime(df[tc],errors='coerce',utc=False)
        if t.notna().mean()<0.5: continue
        for gc in g_candidates:
            g=pd.to_numeric(df[gc],errors='coerce')
            ok=t.notna()&g.between(20,600)
            n=int(ok.sum())
            if n<100: continue
            score=n
            if best is None or score>best[0]: best=(score,tc,gc,t,g,ok)
    return best

def load_zip(path):
    streams=[]
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if not name.lower().endswith('.csv'): continue
            try:
                raw=z.read(name)
                for enc in ['utf-8-sig','utf-8','latin1']:
                    try:
                        df=pd.read_csv(io.BytesIO(raw),encoding=enc,low_memory=False); break
                    except Exception: df=None
                if df is None: continue
                p=pick_cols(df)
                if p:
                    _,tc,gc,t,g,ok=p
                    x=pd.DataFrame({'ts':t[ok],'g':g[ok].astype(float)})
                    x=x.sort_values('ts').drop_duplicates('ts')
                    if len(x)>=100: streams.append((name,tc,gc,x))
            except Exception:
                pass
    return streams

def nearest_checks(x):
    out=[]
    x=x.copy(); x['date']=x.ts.dt.date; x['min']=x.ts.dt.hour*60+x.ts.dt.minute
    for d,day in x.groupby('date'):
        row={'date':str(d)}; ok=True
        for lab,m in zip(LABELS,TARGETS):
            j=(day['min']-m).abs().idxmin(); delta=abs(float(day.loc[j,'min'])-m)
            if delta>10: ok=False; break
            row[lab]=float(day.loc[j,'g'])
        if ok: out.append(row)
    return pd.DataFrame(out)

def sustained_hidden(x,checks,thr):
    if checks.empty: return np.nan,0,0
    bydate={str(d):day.sort_values('ts') for d,day in x.assign(date=x.ts.dt.date).groupby('date')}
    hit=0; total=0
    for _,r in checks.iterrows():
        if not all(float(r[l])>=70 for l in LABELS): continue
        total+=1; day=bydate.get(r['date'])
        vals=day.g.to_numpy(); ts=day.ts.to_numpy()
        run=1; found=False
        for i in range(1,len(vals)):
            gap=(pd.Timestamp(ts[i])-pd.Timestamp(ts[i-1])).total_seconds()/60
            if vals[i]<thr and vals[i-1]<thr and gap<=7: run+=1
            else: run=1
            if run>=3: found=True; break
        hit+=int(found)
    return (100*hit/total if total else np.nan),hit,total

def corr(a,b):
    z=pd.DataFrame({'a':a,'b':b}).dropna()
    return float(z.a.corr(z.b)) if len(z)>2 else np.nan

def main():
    if len(sys.argv)<2: raise SystemExit('zip path required')
    streams=load_zip(sys.argv[1])
    allc=[]; details=[]
    hidden70_num=hidden70_den=hidden54_num=hidden54_den=0
    for name,tc,gc,x in streams:
        c=nearest_checks(x)
        if c.empty: continue
        c['source']=name; allc.append(c)
        h70,n70,d70=sustained_hidden(x,c,70); h54,n54,d54=sustained_hidden(x,c,54)
        hidden70_num+=n70; hidden70_den+=d70; hidden54_num+=n54; hidden54_den+=d54
        details.append({'source':name,'timestamp_col':tc,'glucose_col':gc,'rows':len(x),'complete_days':len(c),'hidden70_pct':h70,'hidden54_pct':h54})
    if not allc: raise SystemExit('No CGM-like tables with complete pseudo-check days found')
    C=pd.concat(allc,ignore_index=True)
    times={}
    for l in LABELS:
        v=C[l].astype(float)
        times[l]={'mean':float(v.mean()),'sd':float(v.std(ddof=0)),'median':float(v.median()),'tbr70_pct':float((v<70).mean()*100),'tar180_pct':float((v>180).mean()*100)}
    pairs={}
    for a,b in [('07','12'),('12','18'),('18','21'),('07','21')]: pairs[a+'_'+b]=corr(C[a],C[b])
    vals=C[LABELS].astype(float)
    out={
      'complete_patient_days':int(len(C)),
      'timepoint_metrics':times,
      'transition_mean_mg_dl':{'07_to_12':float((vals['12']-vals['07']).mean()),'12_to_18':float((vals['18']-vals['12']).mean()),'18_to_21':float((vals['21']-vals['18']).mean())},
      'same_day_correlations':pairs,
      'any_check_below70_pct':float((vals.lt(70).any(axis=1)).mean()*100),
      'any_check_above180_pct':float((vals.gt(180).any(axis=1)).mean()*100),
      'all_four_70_180_pct':float(((vals.ge(70)&vals.le(180)).all(axis=1)).mean()*100),
      'hidden_sustained_hypo_pct':{'lt70':100*hidden70_num/hidden70_den if hidden70_den else None,'lt54':100*hidden54_num/hidden54_den if hidden54_den else None},
      'streams':details
    }
    Path('UOM_FOURPOINT_HIDDENHYPO_RESULT.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
    print(json.dumps(out,indent=2))
if __name__=='__main__': main()
