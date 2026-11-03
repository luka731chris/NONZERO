#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
RUNTIME="${XDG_RUNTIME_DIR:-/tmp}/nonzero-wall"; mkdir -p "$RUNTIME"
HB="$RUNTIME/heartbeat.json"; STARTED="$RUNTIME/chromium.started"
URL="http://127.0.0.1:8787/"
find_chromium(){ for c in chromium chromium-browser google-chrome; do command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return; }; done; return 1; }
CHROME="$(find_chromium || true)"
if [[ -z "$CHROME" ]]; then echo "Chromium not found. Run install.sh"; exit 1; fi
# Best-effort display power management disable. Safe on both X11 and Wayland sessions.
command -v xset >/dev/null 2>&1 && { xset s off || true; xset -dpms || true; xset s noblank || true; }
LOG_DIR="$HOME/.local/state/nonzero/diagnostics"
mkdir -p "$LOG_DIR" "$LOG_DIR/crash-dumps"
chmod 700 "$LOG_DIR/crash-dumps" 2>/dev/null || true
while true; do
  # Keep the previous run's browser stderr for postmortem inspection.
  if [[ -f "$LOG_DIR/chromium-current.log" ]]; then
    tail -c 524288 "$LOG_DIR/chromium-current.log" > "$LOG_DIR/chromium-previous.log" 2>/dev/null || true
  fi
  rm -f "$RUNTIME/chromium.pid" "$HB"
  if [[ -f "$LOG_DIR/chromium-current.log" ]] && (( $(stat -c%s "$LOG_DIR/chromium-current.log") > 3000000 )); then tail -c 1000000 "$LOG_DIR/chromium-current.log" > "$LOG_DIR/chromium-current.log.tmp" && mv "$LOG_DIR/chromium-current.log.tmp" "$LOG_DIR/chromium-current.log"; fi
  date +%s > "$STARTED"
  "$CHROME" --ozone-platform=wayland --kiosk --no-first-run --disable-session-crashed-bubble --disable-infobars --disable-pinch \
    --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000 \
    --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
    --disable-background-networking --disable-component-update --disable-features=Translate,MediaRouter \
    --remote-debugging-address=127.0.0.1 --remote-debugging-port=9223 --remote-allow-origins=http://127.0.0.1:9223 --enable-logging=stderr --log-level=1 --enable-crash-reporter --crash-dumps-dir="$LOG_DIR/crash-dumps" \
    --user-data-dir="$HOME/.config/nonzero-chromium" "$URL" >> "$LOG_DIR/chromium-current.log" 2>&1 &
  pid=$!; echo "$pid" > "$RUNTIME/chromium.pid"
  wait "$pid"; code=$?
  printf '%s chromium exited code=%s pid=%s\n' "$(date -Is)" "$code" "$pid" >> "$LOG_DIR/browser-exits.log"
  tail -c 1048576 "$LOG_DIR/chromium-current.log" > "$LOG_DIR/chromium-last.log" 2>/dev/null || true
  : > "$LOG_DIR/chromium-current.log"
  sleep 2
done
