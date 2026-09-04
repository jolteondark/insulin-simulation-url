#!/usr/bin/env python3
"""Canonical AZT1D raw/residual ACF audit with optional direct ZIP acquisition.

Designed for local execution, not GitHub Actions. It can download the public Glucose-ML
AZT1D ZIP, record SHA256, extract participant CSVs, and compute raw, clock-demeaned and
leave-one-day-out residual ACF by daypart for multiple clock-bin widths.
"""
from __future__ import annotations
import argparse, hashlib, json, math, shutil, urllib.request, zipfile
from pathlib import Path
import numpy as np
import pandas as pd

LAGS_MIN=(30,60,120,240)
DEFAULT_URL=("https://raw.githubusercontent.com/Augmented-Health-Lab/Glucose-ML-Project/"
             "main/3_Glucose-ML-collection/AZT1D/AZT1D-from-Glucose-ML.zip")
DAYPARTS={
    "all": lambda x,y: np.ones(len(x),dtype=bool),
    "daytime_06_24": lambda x,y: (x>=360)&(y>=360),
    "overnight_00_06": lambda x,y: (x<360)&(y<360),
}

def sha256_file(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(1<<20),b""): h.update(b)
    return h.hexdigest()

def corr(x,y,min_pairs=50):
    x=np.asarray(x,float); y=np.asarray(y,float); ok=np.isfinite(x)&np.isfinite(y)
    if ok.sum()<min_pairs:return math.nan,int(ok.sum())
    x=x[ok];y=y[ok]
    if x.std(ddof=1)<=0 or y.std(ddof=1)<=0:return math.nan,len(x)
    return float(np.corrcoef(x,y)[0,1]),len(x)

def summarize(vals):
    a=np.asarray([v for v in vals if np.isfinite(v)],float)
    if not len(a):return {"n":0,"median":math.nan,"q25":math.nan,"q75":math.nan}
    return {"n":int(len(a)),"median":float(np.median(a)),"q25":float(np.quantile(a,.25)),"q75":float(np.quantile(a,.75))}

def prepare(df):
    z=df[["timestamp","glucose"]].copy().dropna()
    z["timestamp"]=pd.to_datetime(z.timestamp,errors="coerce")
    z=z.dropna().sort_values("timestamp").drop_duplicates("timestamp",keep="last")
    z["date"]=z.timestamp.dt.date
    z["minute_of_day"]=z.timestamp.dt.hour*60+z.timestamp.dt.minute
    return z

def add_residuals(z,bin_min):
    z=z.copy(); z["clock_bin"]=(z.minute_of_day//bin_min)*bin_min
    z["residual_clock"]=z.glucose-z.groupby("clock_bin").glucose.transform("mean")
    g=z.groupby(["clock_bin","date"]).glucose.agg(["sum","count"]).reset_index()
    t=z.groupby("clock_bin").glucose.agg(tot_sum="sum",tot_count="count").reset_index()
    g=g.merge(t,on="clock_bin",how="left"); den=g.tot_count-g["count"]
    g["loo_mean"]=(g.tot_sum-g["sum"])/den.where(den>0,np.nan)
    z=z.merge(g[["clock_bin","date","loo_mean"]],on=["clock_bin","date"],how="left")
    z["residual_loo"]=z.glucose-z.loo_mean
    return z

def acf_exact(z,col):
    base=z.set_index("timestamp")[[col,"minute_of_day"]]
    out={d:{} for d in DAYPARTS}
    for lag in LAGS_MIN:
        sh=base.copy(); sh.index=sh.index-pd.Timedelta(minutes=lag)
        sh=sh.rename(columns={col:"y","minute_of_day":"y_min"})
        m=base.rename(columns={col:"x","minute_of_day":"x_min"}).join(sh,how="inner")
        for name,fn in DAYPARTS.items():
            q=m[fn(m.x_min.to_numpy(),m.y_min.to_numpy())]
            r,n=corr(q.x,q.y); out[name][str(lag)]={"r":r,"pairs":n}
    return out

def audit_subject(z,bin_min):
    z=add_residuals(z,bin_min)
    return {"points":int(len(z)),"days":int(z.date.nunique()),
      "raw":acf_exact(z,"glucose"),"clock_demeaned":acf_exact(z,"residual_clock"),
      "leave_one_day_out":acf_exact(z,"residual_loo"),
      "residual_sd_mg_dl":float(z.residual_clock.std(ddof=1)),
      "loo_residual_sd_mg_dl":float(z.residual_loo.std(ddof=1))}

def aggregate(res):
    o={"subjects":len(res)}
    for est in ("raw","clock_demeaned","leave_one_day_out"):
        o[est]={}
        for dp in DAYPARTS:
            o[est][dp]={}
            for lag in map(str,LAGS_MIN):
                vals=[x[est][dp][lag]["r"] for x in res.values()]
                prs=[x[est][dp][lag]["pairs"] for x in res.values()]
                o[est][dp][lag]={**summarize(vals),"median_pairs":float(np.median(prs)) if prs else math.nan}
    o["residual_sd_mg_dl"]=summarize([x["residual_sd_mg_dl"] for x in res.values()])
    o["loo_residual_sd_mg_dl"]=summarize([x["loo_residual_sd_mg_dl"] for x in res.values()])
    o["days_per_subject"]=summarize([x["days"] for x in res.values()])
    return o

def find_csv_dir(root):
    cands=[]
    for p in Path(root).rglob("*.csv"):
        try:
            cols=set(pd.read_csv(p,nrows=1).columns)
        except Exception: continue
        if {"timestamp","glucose_value_mg_dl"}.issubset(cols): cands.append(p.parent)
    if not cands: raise FileNotFoundError("No harmonized AZT1D participant CSV directory found")
    return max(set(cands),key=lambda p:sum(1 for _ in p.glob("*.csv")))

def acquire(url,workdir):
    w=Path(workdir);w.mkdir(parents=True,exist_ok=True); zp=w/"AZT1D-from-Glucose-ML.zip"
    if not zp.exists():
        with urllib.request.urlopen(url,timeout=60) as r,open(zp,"wb") as f: shutil.copyfileobj(r,f)
    digest=sha256_file(zp); ex=w/"extracted"
    if not ex.exists():
        ex.mkdir(); zipfile.ZipFile(zp).extractall(ex)
    return find_csv_dir(ex),digest,zp.stat().st_size

def load_csv_dir(d):
    for f in sorted(Path(d).glob("*.csv")):
        x=pd.read_csv(f)
        if {"timestamp","glucose_value_mg_dl"}.issubset(x.columns):
            yield f.stem,prepare(x.rename(columns={"glucose_value_mg_dl":"glucose"}))

def run(csv_dir,bins,source):
    subjects={sid:z for sid,z in load_csv_dir(csv_dir) if len(z)>=100}
    payload={"source":source,"method":{"pairing":"exact timestamp pairs; no interpolation","lags_min":list(LAGS_MIN),"dayparts":list(DAYPARTS)},"bins":{}}
    for b in bins:
        res={sid:audit_subject(z,b) for sid,z in subjects.items()}
        payload["bins"][str(b)]={"aggregate":aggregate(res),"subjects":res}
    return payload

def main():
    ap=argparse.ArgumentParser(); src=ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv-dir"); src.add_argument("--download",action="store_true")
    ap.add_argument("--url",default=DEFAULT_URL); ap.add_argument("--workdir",default=".azt1d_cache")
    ap.add_argument("--bins",nargs="+",type=int,default=[5,10,15],choices=[5,10,15,30]); ap.add_argument("--output",required=True)
    a=ap.parse_args()
    if a.download:
        d,digest,size=acquire(a.url,a.workdir); source={"url":a.url,"zip_sha256":digest,"zip_bytes":size,"csv_dir":str(d)}
    else:
        d=Path(a.csv_dir); source={"csv_dir":str(d)}
    out=run(d,a.bins,source); Path(a.output).write_text(json.dumps(out,indent=2,allow_nan=True),encoding="utf-8")
    print(json.dumps({"output":a.output,"subjects":next(iter(out["bins"].values()))["aggregate"]["subjects"],"source":source},indent=2))
if __name__=="__main__":main()
