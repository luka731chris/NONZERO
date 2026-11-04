#!/usr/bin/env python3
"""Read-only observer; no network uploads, no browser restarts."""
import datetime,json,os,pathlib,time,subprocess,shutil
RELEASE_VERSION='7.17.20'
HOME=pathlib.Path.home(); OUT=HOME/'.local/state/nonzero/diagnostics'; OUT.mkdir(parents=True,exist_ok=True)
RT=pathlib.Path(os.environ.get('XDG_RUNTIME_DIR',f'/run/user/{os.getuid()}'))/'nonzero-wall'
def read(p,limit=4096):
 try:return p.read_text(errors='replace')[-limit:]
 except OSError:return ''
def process(pid):
 try:
  d={}
  for line in pathlib.Path(f'/proc/{pid}/status').read_text().splitlines():
   if line.startswith(('VmRSS:','VmSize:','Threads:','State:')):
    k,v=line.split(':',1);d[k]=v.strip()
  try:
   fields=pathlib.Path(f'/proc/{pid}/stat').read_text().rsplit(')',1)[1].split()
   d['cpuTicksTotal']=int(fields[11])+int(fields[12])
  except (OSError,ValueError,IndexError):pass
  return d
 except OSError:return None
def append(path,rec,max_bytes=3_000_000):
 with path.open('a') as f:f.write(json.dumps(rec,separators=(',',':'),ensure_ascii=True)+'\n')
 if path.stat().st_size>max_bytes:
  with path.open('rb') as f:
   f.seek(max(0,path.stat().st_size-max_bytes//2));b=f.read()
  path.write_bytes(b[b.find(b'\n')+1:] if b'\n' in b else b)
def renderer_snapshot():
 count=0; pids=[]
 try:
  for entry in pathlib.Path('/proc').iterdir():
   if not entry.name.isdigit():continue
   try: cmd=(entry/'cmdline').read_bytes().replace(b'\0',b' ')
   except (OSError,PermissionError):continue
   if b'--type=renderer' in cmd and b'nonzero-chromium' in cmd:
    count+=1;pids.append(int(entry.name))
 except OSError:pass
 return {'count':count,'pids':pids[:20]}
def system_snapshot():
 try:
  load=list(os.getloadavg()); disk=shutil.disk_usage(HOME)
  return {'load1m':round(load[0],2),'load5m':round(load[1],2),'diskFreeBytes':disk.free,'diskUsedPercent':round(100*disk.used/disk.total,1)}
 except OSError:return {}
def crash_dumps():
 folder=OUT/'crash-dumps'
 try:
  items=sorted((p for p in folder.iterdir() if p.is_file()),key=lambda p:p.stat().st_mtime,reverse=True)
  return {'count':len(items),'latest': [{'name':p.name,'bytes':p.stat().st_size} for p in items[:5]]}
 except OSError:return {'count':0,'latest':[]}
def main():
 lastpid=None;last_age=None;last_frame=None;last_frame_at=time.monotonic();last_cpu=None;last_cpu_time=None
 while True:
  try:
   now=time.time(); pidtext=read(RT/'chromium.pid',40).strip();pid=int(pidtext) if pidtext.isdigit() else None
   try: hb=json.loads(read(RT/'heartbeat.json',12000))
   except (ValueError,TypeError):hb={}
   hbpath=RT/'heartbeat.json';age=round(now-hbpath.stat().st_mtime,1) if hbpath.exists() else None
   frame=hb.get('framePulse');mode=hb.get('mode','unknown')
   if frame!=last_frame:last_frame=frame;last_frame_at=time.monotonic()
   proc=process(pid) if pid else None
   cpu_ticks=proc.get('cpuTicksTotal') if proc else None
   clock=time.monotonic(); cpu_percent=None
   if pid==lastpid and cpu_ticks is not None and last_cpu is not None and last_cpu_time is not None and clock>last_cpu_time:
    cpu_percent=round(max(0,(cpu_ticks-last_cpu)/os.sysconf('SC_CLK_TCK')/(clock-last_cpu_time)*100),1)
   last_cpu=cpu_ticks;last_cpu_time=clock
   rec={'observerRelease':RELEASE_VERSION,'ts':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':pid,'proc':proc,'chromiumCpuPercent':cpu_percent,
        'heartbeatAge':age,'frameStallSeconds':round(time.monotonic()-last_frame_at,1),
        'mode':mode,'framePulse':frame,'activeWorkout':bool(hb.get('activeWorkout')),
        'version':hb.get('version'),'watchdogLastExit':read(RT/'last-exit.json',600),
        'system':system_snapshot(),'renderers':renderer_snapshot(),'crashDumps':crash_dumps()}
   append(OUT/'health.jsonl',rec)
   if pid!=lastpid and lastpid is not None:append(OUT/'events.jsonl',{'ts':rec['ts'],'event':'browser-pid-change','old':lastpid,'new':pid})
   if age is not None and age>40 and (last_age is None or last_age<=40):append(OUT/'events.jsonl',{'ts':rec['ts'],'event':'heartbeat-stale','age':age,'mode':mode})
   lastpid=pid;last_age=age
   (OUT/'latest-report.txt').write_text('NONZERO TITANIUM DIAGNOSTICS\n'+'\n'.join(f'{k}: {v}' for k,v in rec.items())+'\n')
  except Exception as exc:
   append(OUT/'observer-errors.jsonl',{'ts':time.time(),'error':type(exc).__name__})
  time.sleep(15)
if __name__=='__main__':main()
