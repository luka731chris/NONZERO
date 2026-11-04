#!/usr/bin/env bash
set -u
RUNTIME="${XDG_RUNTIME_DIR:-/tmp}/nonzero-wall"; mkdir -p "$RUNTIME"
STATE="$HOME/.local/state/nonzero/diagnostics"; mkdir -p "$STATE"
HB="$RUNTIME/heartbeat.json"; PID="$RUNTIME/chromium.pid"; STARTED="$RUNTIME/chromium.started"
LOG="$STATE/watchdog.log"; LAST_EXIT="$RUNTIME/last-exit.json"
STALE="${NZ_WATCHDOG_STALE:-150}"; GRACE="${NZ_WATCHDOG_GRACE:-120}"; INTERVAL=15
LAST_RESTART="$STATE/last-watchdog-restart.epoch"; HISTORY="$STATE/restart-history.epoch"
BAD_PROBES=0
UNAVAILABLE_PROBES=0
LAST_PID=""
LAST_PROBE=0
PROBE_INTERVAL="${NZ_RENDERER_PROBE_INTERVAL:-30}"
log(){ printf '%s %s\n' "$(date -Is)" "$*" >> "$LOG"; }
rotate(){ if [[ -f "$LOG" ]] && (( $(stat -c%s "$LOG" 2>/dev/null || echo 0) > 2000000 )); then tail -c 800000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi; }
capture(){
 local pid="$1" reason="$2" age="$3" now="$4" bundle="$STATE/incident-$(date -u +%Y%m%dT%H%M%SZ)-${pid}.txt"
 {
  printf 'Timestamp: %s\nReason: %s\nHeartbeat age: %s\nChromium pid: %s\n' "$(date -Is)" "$reason" "$age" "$pid"
  echo '=== heartbeat (may include device metadata; keep private) ==='; head -c 12000 "$HB" 2>/dev/null; echo
  echo '=== process state ==='; ps -o pid,ppid,stat,%cpu,%mem,rss,etime,comm -p "$pid" 2>&1
  echo '=== chromium recent stderr ==='; tail -n 160 "$STATE/chromium-current.log" 2>/dev/null
  echo '=== browser exits ==='; tail -n 30 "$STATE/browser-exits.log" 2>/dev/null
  echo '=== kernel OOM indicators ==='; dmesg 2>/dev/null | grep -Ei 'out of memory|oom-killer|killed process|segfault' | tail -n 20 || true
 } > "$bundle"
 find "$STATE" -maxdepth 1 -name 'incident-*.txt' -type f -printf '%T@ %p\n' | sort -nr | tail -n +21 | cut -d' ' -f2- | while IFS= read -r old; do rm -f -- "$old"; done
}
while true; do
 sleep "$INTERVAL"; rotate
 [[ -f "$PID" ]] || continue
 pid=$(cat "$PID" 2>/dev/null || true); [[ "$pid" =~ ^[0-9]+$ ]] || continue
 kill -0 "$pid" 2>/dev/null || continue
 if [[ "$pid" != "$LAST_PID" ]]; then BAD_PROBES=0; UNAVAILABLE_PROBES=0; LAST_PID="$pid"; LAST_PROBE=0; fi
 # Never kill a recycled PID: require actual chromium command line.
 [[ -r "/proc/$pid/cmdline" ]] || continue
 tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q '127.0.0.1:8787' || continue
 now=$(date +%s); started=$(cat "$STARTED" 2>/dev/null || echo "$now"); [[ "$started" =~ ^[0-9]+$ ]] || started="$now"
 (( now-started > GRACE )) || continue
 mt=$(stat -c%Y "$HB" 2>/dev/null || echo 0); age=$((now-mt))
 # Probe independent of heartbeat age: Aw Snap may occur while heartbeat still advances.
 if (( now-LAST_PROBE < PROBE_INTERVAL )); then continue; fi
 LAST_PROBE="$now"
 PROBE_RESULT=0
 python3 "$HOME/NONZERO-Pi/bin/renderer-probe.py" >/dev/null 2>&1 || PROBE_RESULT=$?
 if (( PROBE_RESULT == 0 )); then
  BAD_PROBES=0; UNAVAILABLE_PROBES=0
  if (( age > STALE )); then log "STALE HEARTBEAT WITH HEALTHY RENDERER pid=$pid age=${age}s; preserve browser"; fi
  continue
 fi
 if (( PROBE_RESULT == 2 )); then
  BAD_PROBES=0; UNAVAILABLE_PROBES=0
  log "CDP CONFIGURATION/PROTOCOL FAILURE pid=$pid; no restart (requires repair)"
  continue
 fi
 if (( PROBE_RESULT == 4 )); then
  UNAVAILABLE_PROBES=$((UNAVAILABLE_PROBES+1))
  # Endpoint unavailable can be transient; recover only after sustained outage AND stale heartbeat.
  if (( age <= STALE || UNAVAILABLE_PROBES < 6 )); then
   log "CDP UNAVAILABLE pid=$pid count=$UNAVAILABLE_PROBES age=${age}s; waiting"
   continue
  fi
  log "SUSTAINED CDP UNAVAILABLE + STALE HEARTBEAT pid=$pid count=$UNAVAILABLE_PROBES"
 else
  UNAVAILABLE_PROBES=0
 fi
 BAD_PROBES=$((BAD_PROBES+1))
 if (( BAD_PROBES < 3 )); then log "RENDERER FAILURE code=$PROBE_RESULT $BAD_PROBES/3 pid=$pid age=${age}s"; continue; fi
 BAD_PROBES=0; UNAVAILABLE_PROBES=0
 last=$(cat "$LAST_RESTART" 2>/dev/null || echo 0); [[ "$last" =~ ^[0-9]+$ ]] || last=0
 # Cap recoveries, but keep retrying at a measured rate if the renderer stays broken.
 count=$(awk -v t="$now" '$1>t-3600{n++} END{print n+0}' "$HISTORY" 2>/dev/null || echo 0)
 if (( now-last < 180 || count >= 12 )); then log "RECOVERY SUPPRESSED pid=$pid age=${age}s 60m_count=$count"; continue; fi
 log "RECOVERY START pid=$pid age=${age}s"; capture "$pid" "renderer probe failures code=$PROBE_RESULT; heartbeat age=$age" "$age" "$now"
 printf '%s\n' "$now" >> "$HISTORY"; tail -n 100 "$HISTORY" > "$HISTORY.tmp" && mv "$HISTORY.tmp" "$HISTORY"
 printf '%s\n' "$now" > "$LAST_RESTART"
 python3 - "$LAST_EXIT" "$age" <<'PYEXIT'
import json,pathlib,sys,time
p=pathlib.Path(sys.argv[1]);t=p.with_suffix('.tmp');t.write_text(json.dumps({'at':int(time.time()*1000),'reason':'renderer unresponsive after 3 CDP probes','ageSeconds':int(sys.argv[2])}));t.replace(p)
PYEXIT
 kill -TERM "$pid" 2>/dev/null || true
 sleep 5
 if kill -0 "$pid" 2>/dev/null && [[ "$(cat "$PID" 2>/dev/null)" == "$pid" ]]; then
  tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q '127.0.0.1:8787' && kill -KILL "$pid" 2>/dev/null || true
 fi
done
