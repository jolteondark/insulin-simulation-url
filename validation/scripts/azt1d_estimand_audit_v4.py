#!/usr/bin/env python3
"""AZT1D raw/residual ACF audit v4.

Adds three pre-interpretation safeguards to v3:
1) optional strict Git-blob manifest verification in the same command;
2) exact-pair coverage/cadence diagnostics for every subject and lag;
3) residual SD summarized by daypart, not only all-day.

No interpolation. Designed for local execution, not GitHub Actions.
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
POINT_DAYPARTS={
    "all": lambda m: np.ones(len(m),dtype=bool),
    "daytime_06_24": lambda m: m>=360,
    "overnight_00_06": lambda m: m<360,
}

def sha256_file(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(1<<20),b""): h.update(b)
    return h.hexdigest()

def git_blob_sha1(path: Path) -> str:
    data=path.read_bytes(); h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode()); h.update(data)
    return h.hexdigest()

def verify_manifest(csv_dir: Path, manifest_path: Path):
    m=json.loads(manifest_path.read_text(encoding="utf-8"))
    expected={x["path"]:x for x in m["files"]}
    actual=sorted(p.name for p in csv_dir.glob("*.csv"))
    missing=sorted(set(expected)-set(actual)); unexpected=sorted(set(actual)-set(expected))
    mismatches=[]; verified=[]
    for name,spec in sorted(expected.items()):
        p=csv_dir/name
        if not p.exists(): continue
        size=p.stat().st_size; sha=git_blob_sha1(p); problems=[]
        if size!=spec["bytes"]: problems.append({"field":"bytes","expected":spec["bytes"],"actual":size})
        if sha!=spec["git_blob_sha1"]: problems.append({"field":"git_blob_sha1","expected":spec["git_blob_sha1"],"actual":sha})
        if problems: mismatches.append({"path":name,"problems":problems})
        else: verified.append(name)
    total=sum((csv_dir/n).stat().st_size for n in actual if (csv_dir/n).is_file())
    return {"ok":not missing and not unexpected and not mismatches,
            "manifest_tree_sha":m.get("source_tree_sha"),
            "expected_file_count":m.get("participant_file_count"),"actual_file_count":len(actual),
            "expected_total_bytes":m.get("participant_total_bytes"),"actual_total_bytes":total,
            "verified_count":len(verified),"missing":missing,"unexpected":unexpected,"mismatches":mismatches}

def corr(x,y,min_pairs=50):
    x=np.asarray(x,float); y=np.asarray(y,float); ok=np.isfinite(x)&np.isfinite(y)
    if ok.sum()<min_pairs:return math.nan,int(ok.sum())
    x=x[ok]; y=y[ok]
    if x.std(ddof=1)<=0 or y.std(ddof=1)<=0:return math.nan,len(x)
    return float(np.corrcoef(x,y)[0,1]),len(x)

def summarize(vals):
    a=np.asarray([v for v in vals if np.isfinite(v)],float)
    if not len(a): return {"n":0,"median":math.nan,"q25":math.nan,"q75":math.nan}
    return {"n":int(len(a)),"median":float(np.median(a)),"q25":float(np.quantile(a,.25)),"q75":float(np.quantile(a,.75))}

def prepare(df):
    z=df[["timestamp","glucose"]].copy().dropna()
    z["timestamp"]=pd.to_datetime(z.timestamp,errors="coerce")
    z=z.dropna().sort_values("timestamp").drop_duplicates("timestamp",keep="last")
    z["date"]=z.timestamp.dt.date
    z["minute_of_day"]=z.timestamp.dt.hour*60+z.timestamp.dt.minute
    return z

def cadence_diagnostics(z):
    d=z.timestamp.diff().dt.total_seconds().div(60).dropna().to_numpy(float)
    if not len(d): return {"median_interval_min":math.nan,"q95_interval_min":math.nan,"pct_5min":math.nan,"pct_le_10min":math.nan}
    return {"median_interval_min":float(np.median(d)),"q95_interval_min":float(np.quantile(d,.95)),
            "pct_5min":float(np.mean(np.isclose(d,5.0))*100),"pct_le_10min":float(np.mean(d<=10)*100)}

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
            r,n=corr(q.x,q.y)
            mins=base.minute_of_day.to_numpy()
            eligible=int(np.sum(fn(mins,(mins+lag)%1440)))
            out[name][str(lag)]={"r":r,"pairs":n,"eligible_points":eligible,
                                  "pair_coverage":float(n/eligible) if eligible else math.nan}
    return out

def residual_sd_by_daypart(z,col):
    mins=z.minute_of_day.to_numpy(); vals=z[col].to_numpy(float); out={}
    for name,fn in POINT_DAYPARTS.items():
        q=vals[fn(mins)]; q=q[np.isfinite(q)]
        out[name]=float(np.std(q,ddof=1)) if len(q)>1 else math.nan
    return out

def audit_subject(z,bin_min):
    c=cadence_diagnostics(z); z=add_residuals(z,bin_min)
    return {"points":int(len(z)),"days":int(z.date.nunique()),"cadence":c,
      "raw":acf_exact(z,"glucose"),"clock_demeaned":acf_exact(z,"residual_clock"),
      "leave_one_day_out":acf_exact(z,"residual_loo"),
      "residual_sd_mg_dl":residual_sd_by_daypart(z,"residual_clock"),
      "loo_residual_sd_mg_dl":residual_sd_by_daypart(z,"residual_loo")}

def aggregate(res):
    o={"subjects":len(res)}
    for est in ("raw","clock_demeaned","leave_one_day_out"):
        o[est]={}
        for dp in DAYPARTS:
            o[est][dp]={}
            for lag in map(str,LAGS_MIN):
                vals=[x[est][dp][lag]["r"] for x in res.values()]
                prs=[x[est][dp][lag]["pairs"] for x in res.values()]
                cov=[x[est][dp][lag]["pair_coverage"] for x in res.values()]
                o[est][dp][lag]={**summarize(vals),"median_pairs":float(np.median(prs)) if prs else math.nan,
                                 "pair_coverage":summarize(cov)}
    for key in ("residual_sd_mg_dl","loo_residual_sd_mg_dl"):
        o[key]={dp:summarize([x[key][dp] for x in res.values()]) for dp in POINT_DAYPARTS}
    o["days_per_subject"]=summarize([x["days"] for x in res.values()])
    for k in ("median_interval_min","q95_interval_min","pct_5min","pct_le_10min"):
        o.setdefault("cadence",{})[k]=summarize([x["cadence"][k] for x in res.values()])
    return o

def find_csv_dir(root):
    cands=[]
    for p in Path(root).rglob("*.csv"):
        try: cols=set(pd.read_csv(p,nrows=1).columns)
        except Exception: continue
        if {"timestamp","glucose_value_mg_dl"}.issubset(cols): cands.append(p.parent)
    if not cands: raise FileNotFoundError("No harmonized AZT1D participant CSV directory found")
    return max(set(cands),key=lambda p:sum(1 for _ in p.glob("*.csv")))

def acquire(url,workdir):
    w=Path(workdir); w.mkdir(parents=True,exist_ok=True); zp=w/"AZT1D-from-Glucose-ML.zip"
    if not zp.exists():
        with urllib.request.urlopen(url,timeout=60) as r,open(zp,"wb") as f: shutil.copyfileobj(r,f)
    digest=sha256_file(zp); ex=w/"extracted"
    if not ex.exists(): ex.mkdir(); zipfile.ZipFile(zp).extractall(ex)
    return find_csv_dir(ex),digest,zp.stat().st_size

def load_csv_dir(d):
    for f in sorted(Path(d).glob("*.csv")):
        x=pd.read_csv(f)
        if {"timestamp","glucose_value_mg_dl"}.issubset(x.columns):
            yield f.stem,prepare(x.rename(columns={"glucose_value_mg_dl":"glucose"}))

def sanitize_json(x):
    if isinstance(x,float) and not math.isfinite(x): return None
    if isinstance(x,dict): return {k:sanitize_json(v) for k,v in x.items()}
    if isinstance(x,list): return [sanitize_json(v) for v in x]
    return x

def run(csv_dir,bins,source,integrity=None):
    subjects={sid:z for sid,z in load_csv_dir(csv_dir) if len(z)>=100}
    payload={"source":source,"integrity":integrity,
             "method":{"pairing":"exact timestamp pairs; no interpolation","lags_min":list(LAGS_MIN),
                       "dayparts":list(DAYPARTS),"aggregation":"patient-level correlations summarized by median/IQR"},
             "bins":{}}
    for b in bins:
        res={sid:audit_subject(z,b) for sid,z in subjects.items()}
        payload["bins"][str(b)]={"aggregate":aggregate(res),"subjects":res}
    return sanitize_json(payload)

def main():
    ap=argparse.ArgumentParser(); src=ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv-dir"); src.add_argument("--download",action="store_true")
    ap.add_argument("--url",default=DEFAULT_URL); ap.add_argument("--workdir",default=".azt1d_cache")
    ap.add_argument("--manifest",help="Pinned source manifest; if provided, mismatch aborts before analysis")
    ap.add_argument("--bins",nargs="+",type=int,default=[5,10,15],choices=[5,10,15,30]); ap.add_argument("--output",required=True)
    a=ap.parse_args()
    if a.download:
        d,digest,size=acquire(a.url,a.workdir); source={"url":a.url,"zip_sha256":digest,"zip_bytes":size,"csv_dir":str(d)}
    else:
        d=Path(a.csv_dir); source={"csv_dir":str(d)}
    integrity=None
    if a.manifest:
        integrity=verify_manifest(Path(d),Path(a.manifest))
        if not integrity["ok"]:
            print(json.dumps(integrity,indent=2)); raise SystemExit(2)
    out=run(d,a.bins,source,integrity); Path(a.output).write_text(json.dumps(out,indent=2,allow_nan=False),encoding="utf-8")
    print(json.dumps({"output":a.output,"subjects":next(iter(out["bins"].values()))["aggregate"]["subjects"],"source":source,"integrity_ok":None if integrity is None else integrity["ok"]},indent=2))
if __name__=="__main__": main()
