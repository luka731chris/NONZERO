#!/usr/bin/env python3
"""Read-only NONZERO health sampler. Does not restart, kill, or reconfigure Chromium."""
import datetime as dt, json, os, pathlib, subprocess, time
home=pathlib.Path.home()
runtime=pathlib.Path(os.environ.get('XDG_RUNTIME_DIR',f'/run/user/{os.getuid()}'))/'nonzero-wall'
dest=home/'.local/state/nonzero/diagnostics'
dest.mkdir(parents=True,exist_ok=True)
def read(path, limit=150000):
    try: return pathlib.Path(path).read_text(errors='replace')[-limit:]
    except OSError: return ''
def proc(pid):
    try:
        status=pathlib.Path(f'/proc/{pid}/status').read_text()
        return {k:next((line.split(':',1)[1].strip() for line in status.splitlines() if line.startswith(k+':')),None)
                for k in ('Name','VmRSS','VmSize','Threads')}
    except OSError:return None
def sample():
    stamp=dt.datetime.now(dt.timezone.utc).isoformat()
    pidstr=read(runtime/'chromium.pid',40).strip()
    pid=int(pidstr) if pidstr.isdigit() else None
    try: hb=json.loads(read(runtime/'heartbeat.json',10000))
    except (ValueError,TypeError):hb=None
    log=read(home/'.local/state/nonzero/diagnostics/chromium-current.log',200000) or read(runtime/'chromium.log',200000)
    flags=('Aw, Snap','Out of memory','OOM','SIGSEGV','SIGTRAP','GPU process','Renderer process','crashed')
    recent=[line[:400] for line in log.splitlines()[-250:] if any(t.lower() in line.lower() for t in flags)][-12:]
    try:
        disk=os.statvfs(str(home))
        free=int(disk.f_bavail*disk.f_frsize)
    except OSError:free=None
    return {'at':stamp,'chromiumPid':pid,'chromiumProcess':proc(pid) if pid else None,
            'heartbeat':{k:hb.get(k) for k in ('mode','activeWorkout','framePulse')} if isinstance(hb,dict) else None,
            'heartbeatAgeSeconds':round(time.time()-(runtime/'heartbeat.json').stat().st_mtime,1) if (runtime/'heartbeat.json').exists() else None,
            'lastWatchdogExit':read(runtime/'last-exit.json',1000),
            'diskFreeBytes':free,'recentCrashIndicators':recent}
def main():
    path=dest/'health.jsonl'
    while True:
        data=sample()
        with path.open('a') as f:f.write(json.dumps(data,separators=(',',':'))+'\n')
        report=dest/'latest-report.txt'
        report.write_text(
            'NONZERO READ-ONLY DIAGNOSTICS\n'
            + 'Last sample: '+data['at']+'\\n'
            + 'Chromium PID: '+str(data['chromiumPid'])+'\\n'
            + 'Chromium RSS: '+str((data['chromiumProcess'] or {}).get('VmRSS'))+'\\n'
            + 'Heartbeat age (seconds): '+str(data['heartbeatAgeSeconds'])+'\\n'
            + 'Heartbeat: '+str(data['heartbeat'])+'\\n'
            + 'Free storage (bytes): '+str(data['diskFreeBytes'])+'\\n'
            + 'Last watchdog exit: '+str(data['lastWatchdogExit'])+'\\n'
            + 'Recent Chromium crash indicators:\\n'+'\\n'.join(data['recentCrashIndicators'])+'\\n'
        )
        # Rotate capped telemetry; keep last 5000 lines (~42 hours).
        if path.stat().st_size>6_000_000:
            lines=path.read_text().splitlines()[-5000:]
            path.write_text('\n'.join(lines)+'\n')
        time.sleep(30)
if __name__=='__main__':main()
