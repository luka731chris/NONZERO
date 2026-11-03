#!/usr/bin/env python3
"""Local support bundle with optional sensitive raw incident data; never uploads."""
import pathlib,zipfile,time,json,subprocess,sys,re
home=pathlib.Path.home();state=home/'.local/state/nonzero/diagnostics';out=home/'Downloads';out.mkdir(exist_ok=True)
zip_path=out/f'NONZERO-support-{time.strftime("%Y%m%d-%H%M%S")}.zip'
def redact(data):
 text=data.decode('utf-8','replace')
 text=re.sub(r'(?i)(authorization\s*[:=]\s*bearer\s+)\S+',r'\1[REDACTED]',text)
 text=re.sub(r'(?i)((?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|sync[_-]?key)\s*[=:]\s*)[\w.\-+/=]+',r'\1[REDACTED]',text)
 text=re.sub(r'https?://[^\s\"\']+',lambda m: re.sub(r'\?.*$', '?[REDACTED]',m.group(0)),text)
 text=text.replace(str(home),'[HOME]')
 return text.encode('utf-8')
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for name in ('health.jsonl','events.jsonl','observer-errors.jsonl','watchdog.log','browser-exits.log','chromium-last.log','chromium-previous.log','latest-report.txt'):
  p=state/name
  if p.exists():z.writestr(name,redact(p.read_bytes()[-1000000:]))
 if '--include-sensitive' in sys.argv:
  for p in sorted(state.glob('incident-*.txt'))[-10:]:z.writestr('sensitive-incidents/'+p.name,redact(p.read_bytes()[-200000:]))
 z.writestr('bundle-info.json',json.dumps({'version':(home/'NONZERO-Pi/VERSION.txt').read_text().strip() if (home/'NONZERO-Pi/VERSION.txt').exists() else 'unknown','includesSensitiveIncidents':'--include-sensitive' in sys.argv}))
print(zip_path)
