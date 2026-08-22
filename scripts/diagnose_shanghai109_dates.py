#!/usr/bin/env python3
import csv, json, os
from pathlib import Path
from datetime import datetime
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))

def p(s):
 s=(s or '').strip()
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M','%Y-%m-%d %H:%M:%S.%f','%m/%d/%Y %H:%M','%m/%d/%Y %H:%M:%S','%Y-%m-%d'):
  try:return datetime.strptime(s,fmt)
  except:pass
 try:return datetime.fromisoformat(s)
 except:return None
out=[]
for fp in sorted(ROOT.glob('*.csv')):
 total=parsed=cgmraw=cgmparsed=0; samples=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   total+=1; s=(r.get('Date') or '').strip(); g=(r.get('CGM (mg / dl)') or '').strip()
   if s and len(samples)<5:samples.append(s)
   ok=p(s) is not None
   parsed+=ok
   if g:cgmraw+=1; cgmparsed+=bool(g and ok)
 if cgmraw and not cgmparsed: out.append({'file':fp.name,'rows':total,'date_parsed':parsed,'cgm_raw':cgmraw,'samples':samples})
print(json.dumps(out,ensure_ascii=False,indent=2))
Path('analysis_out').mkdir(exist_ok=True)
Path('analysis_out/shanghai109_date_diagnostics.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
