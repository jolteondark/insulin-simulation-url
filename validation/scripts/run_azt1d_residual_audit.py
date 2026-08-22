#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--csv-dir', required=True)
    ap.add_argument('--audit-script', default='validation/scripts/azt1d_clock_demeaned_acf_audit_v2.py')
    ap.add_argument('--output-dir', default='validation/results/azt1d_residual_acf')
    a=ap.parse_args()
    out=Path(a.output_dir); out.mkdir(parents=True,exist_ok=True)
    produced=[]
    for bin_min in (5,10,15,30):
        target=out/f'azt1d_clock_demeaned_acf_bin{bin_min}.json'
        cmd=[sys.executable,a.audit_script,'--csv-dir',a.csv_dir,'--clock-bin-min',str(bin_min),'--output',str(target)]
        subprocess.run(cmd,check=True)
        payload=json.loads(target.read_text(encoding='utf-8'))
        produced.append({'clock_bin_min':bin_min,'output':str(target),'aggregate':payload['aggregate']})
    (out/'SUMMARY.json').write_text(json.dumps({'runs':produced},indent=2,allow_nan=True),encoding='utf-8')
    print(out/'SUMMARY.json')
if __name__=='__main__': main()
