#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, urllib.parse, urllib.request
from pathlib import Path

BASE='https://raw.githubusercontent.com/Augmented-Health-Lab/Glucose-ML-Project/main/3_Glucose-ML-collection/AZT1D/AZT1D-extracted-glucose-files'
SUBJECTS=list(range(1,26))

def sha256_bytes(b:bytes)->str:
    return hashlib.sha256(b).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--output-dir', default='validation/data/AZT1D-extracted-glucose-files')
    ap.add_argument('--manifest', default=None)
    ap.add_argument('--timeout', type=int, default=60)
    a=ap.parse_args()
    out=Path(a.output_dir); out.mkdir(parents=True, exist_ok=True)
    rows=[]
    for sid in SUBJECTS:
        name=f'Subject {sid}.csv'
        url=f'{BASE}/{urllib.parse.quote(name)}'
        with urllib.request.urlopen(url, timeout=a.timeout) as r:
            b=r.read()
        if not b.startswith(b'timestamp,glucose_value_mg_dl'):
            raise RuntimeError(f'unexpected schema for {name}')
        p=out/name; p.write_bytes(b)
        rows.append({'subject':sid,'file':name,'bytes':len(b),'sha256':sha256_bytes(b),'source_url':url})
        print(f'{name}: {len(b)} bytes {rows[-1]["sha256"][:12]}')
    manifest=Path(a.manifest) if a.manifest else out.parent/'azt1d_glucose_ml_manifest.json'
    payload={'source':'Glucose-ML harmonized AZT1D extracted participant CSVs','base_url':BASE,'subjects':rows}
    manifest.write_text(json.dumps(payload,indent=2),encoding='utf-8')
    print(f'manifest: {manifest}')
if __name__=='__main__': main()
