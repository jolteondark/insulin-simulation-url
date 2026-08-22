#!/usr/bin/env python3
"""Robust raw-vs-clock-demeaned ACF audit for harmonized CGM participant files.

Supports a directory of CSVs with timestamp,glucose_value_mg_dl columns and optionally
GlucoFM-Bench parquet files with dataset/subject_id/timestamp/BGvalue columns.
No network access is required at runtime.
"""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
import numpy as np
import pandas as pd

LAGS_MIN = (30, 60, 120, 240)
DAYTIME_START_MIN = 6 * 60


def corr(x, y, min_pairs=50):
    x=np.asarray(x,float); y=np.asarray(y,float)
    ok=np.isfinite(x)&np.isfinite(y)
    if ok.sum()<min_pairs: return math.nan, int(ok.sum())
    x=x[ok]; y=y[ok]
    sx=x.std(ddof=1); sy=y.std(ddof=1)
    if sx<=0 or sy<=0: return math.nan, len(x)
    return float(np.corrcoef(x,y)[0,1]), len(x)


def summarize(vals):
    a=np.asarray([v for v in vals if np.isfinite(v)],float)
    if not len(a): return {"n":0,"median":math.nan,"q25":math.nan,"q75":math.nan}
    return {"n":int(len(a)),"median":float(np.median(a)),"q25":float(np.quantile(a,.25)),"q75":float(np.quantile(a,.75))}


def prepare(df):
    z=df[["timestamp","glucose"]].copy().dropna()
    z["timestamp"]=pd.to_datetime(z["timestamp"], errors="coerce")
    z=pd.DataFrame(z.dropna()).sort_values("timestamp").drop_duplicates("timestamp",keep="last")
    z["date"]=z.timestamp.dt.date
    z["minute_of_day"]=z.timestamp.dt.hour*60+z.timestamp.dt.minute
    return z


def add_residuals(z, clock_bin_min=5):
    z=z.copy()
    z["clock_bin"]=(z.minute_of_day//clock_bin_min)*clock_bin_min
    means=z.groupby("clock_bin").glucose.transform("mean")
    z["residual_clock"]=z.glucose-means
    # Leave-one-day-out clock mean: protects against self-inclusion, especially in short simulator runs.
    g=z.groupby(["clock_bin","date"]).glucose.agg(["sum","count"]).reset_index()
    tot=z.groupby("clock_bin").glucose.agg(["sum","count"]).rename(columns={"sum":"tot_sum","count":"tot_count"}).reset_index()
    g=g.merge(tot,on="clock_bin",how="left")
    denom=g.tot_count-g["count"]
    g["loo_mean"]=(g.tot_sum-g["sum"])/denom.where(denom>0,np.nan)
    z=z.merge(g[["clock_bin","date","loo_mean"]],on=["clock_bin","date"],how="left")
    z["residual_loo"]=z.glucose-z.loo_mean
    return z


def acf_exact(z, col):
    base=z.set_index("timestamp")
    out={}
    for lag in LAGS_MIN:
        shifted=base[[col,"minute_of_day"]].copy()
        shifted.index=shifted.index-pd.Timedelta(minutes=lag)
        shifted=shifted.rename(columns={col:"y","minute_of_day":"y_min"})
        m=base[[col,"minute_of_day"]].rename(columns={col:"x","minute_of_day":"x_min"}).join(shifted,how="inner")
        m=m[(m.x_min>=DAYTIME_START_MIN)&(m.y_min>=DAYTIME_START_MIN)]
        r,n=corr(m.x,m.y)
        out[str(lag)]={"r":r,"pairs":n}
    return out


def audit_subject(z, clock_bin_min=5):
    z=add_residuals(z,clock_bin_min)
    days=int(z.date.nunique())
    res_sd=float(z.residual_clock.std(ddof=1)) if len(z)>1 else math.nan
    loo_sd=float(z.residual_loo.std(ddof=1)) if z.residual_loo.notna().sum()>1 else math.nan
    return {
        "points":int(len(z)),"days":days,
        "raw":acf_exact(z,"glucose"),
        "clock_demeaned":acf_exact(z,"residual_clock"),
        "leave_one_day_out":acf_exact(z,"residual_loo"),
        "residual_sd_mg_dl":res_sd,
        "loo_residual_sd_mg_dl":loo_sd,
    }


def load_csv_dir(path):
    for f in sorted(Path(path).glob("*.csv")):
        d=pd.read_csv(f)
        if not {"timestamp","glucose_value_mg_dl"}.issubset(d.columns): continue
        yield f.stem, prepare(d.rename(columns={"glucose_value_mg_dl":"glucose"}))


def load_parquets(paths, dataset_name="AZT1D"):
    frames=[pd.read_parquet(p) for p in paths]
    d=pd.concat(frames,ignore_index=True)
    if "dataset" in d.columns: d=d[d.dataset==dataset_name]
    for _,row in d.iterrows():
        ts=pd.to_datetime(np.asarray(row.timestamp,dtype=float),unit="s",utc=True).tz_convert(None)
        z=pd.DataFrame({"timestamp":ts,"glucose":np.asarray(row.BGvalue,dtype=float)})
        yield str(row.subject_id),prepare(z)


def aggregate(results):
    out={"subjects":len(results)}
    for estimand in ("raw","clock_demeaned","leave_one_day_out"):
        out[estimand]={}
        for lag in map(str,LAGS_MIN):
            vals=[x[estimand][lag]["r"] for x in results.values()]
            pairs=[x[estimand][lag]["pairs"] for x in results.values()]
            out[estimand][lag]={**summarize(vals),"median_pairs":float(np.median(pairs)) if pairs else math.nan}
    out["residual_sd_mg_dl"]=summarize([x["residual_sd_mg_dl"] for x in results.values()])
    out["loo_residual_sd_mg_dl"]=summarize([x["loo_residual_sd_mg_dl"] for x in results.values()])
    out["days_per_subject"]=summarize([x["days"] for x in results.values()])
    return out


def main():
    ap=argparse.ArgumentParser()
    src=ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv-dir")
    src.add_argument("--parquet",nargs="+")
    ap.add_argument("--dataset",default="AZT1D")
    ap.add_argument("--clock-bin-min",type=int,default=5,choices=(5,10,15,30))
    ap.add_argument("--output")
    a=ap.parse_args()
    it=load_csv_dir(a.csv_dir) if a.csv_dir else load_parquets(a.parquet,a.dataset)
    res={}
    for sid,z in it:
        if len(z)>=100: res[sid]=audit_subject(z,a.clock_bin_min)
    payload={
        "method":{
            "daytime":"06:00-24:00 both endpoints",
            "lags_min":list(LAGS_MIN),
            "pairing":"exact timestamps; no interpolation performed by this script",
            "clock_demeaning":f"within-subject {a.clock_bin_min}-min clock bins",
            "sensitivity":"leave-one-day-out clock mean to quantify self-inclusion bias",
        },
        "aggregate":aggregate(res),"subjects":res,
    }
    txt=json.dumps(payload,indent=2,allow_nan=True)
    if a.output: Path(a.output).write_text(txt,encoding="utf-8")
    else: print(txt)

if __name__=="__main__": main()
