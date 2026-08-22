#!/usr/bin/env python3
import csv,os,re,json
from collections import Counter,defaultdict
from datetime import datetime,timedelta
from pathlib import Path
ROOT=Path(os.environ.get('SHANGHAI_RAW','/tmp/tju/pre-process/raw-data/Shanghai_T2DM'))
OUT=Path('analysis/regular_breakfast_dose_audit');OUT.mkdir(parents=True,exist_ok=True)
IDS={'2025_0_20210506','2035_0_20210629','2036_0_20210803','2043_0_20210513','2074_0_20210707','2094_0_20211109'}
def dtparse(s):
 for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %H:%M:%S','%Y-%m-%d %H:%M'):
  try:return datetime.strptime((s or '').strip(),fmt)
  except:pass
 return None
def nums(s):return [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*IU\b',s or '',re.I)]
records=[]
for fp in sorted(ROOT.glob('*.csv')):
 if fp.stem not in IDS:continue
 rows=[]
 with fp.open(encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   d=dtparse(r.get('Date'))
   if d:rows.append((d,r))
 breakfasts=[]
 for d,r in rows:
  if (r.get('Dietary intake') or '').strip() and 5<=d.hour+d.minute/60<10:breakfasts.append(d)
 for bt in breakfasts:
  hits=[]
  for d,r in rows:
   if bt-timedelta(minutes=45)<=d<=bt+timedelta(minutes=15):
    s=(r.get('Insulin dose - s.c.') or '').strip()
    cs=(r.get('CSII - bolus insulin (Novolin R, IU)') or '').strip()
    if s or cs:hits.append({'time':d.isoformat(),'relative_min':(d-bt).total_seconds()/60,'sc':s,'csii':cs,'all_numeric_iu':sum(nums(s))+sum(nums(cs))})
  records.append({'session':fp.stem,'breakfast':bt.isoformat(),'hits':hits})
(OUT/'audit.json').write_text(json.dumps(records,indent=2,ensure_ascii=False),encoding='utf-8')
md=['# Regular basal-bolus breakfast dose audit','',f'Breakfast records: {len(records)}','']
for pid in sorted(IDS):
 md.append(f'## {pid}')
 seen=[]
 for x in records:
  if x['session']!=pid:continue
  for h in x['hits']:
   key=(h['sc'],h['csii'])
   if key not in seen:seen.append(key)
 for sc,cs in seen[:20]:md.append(f'- SC: `{sc}`; CSII: `{cs}`')
 md.append('')
(OUT/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8');print('\n'.join(md))
