# NONZERO v7.17.20 — tested recovery fixes
- CDP WebSocket Origin handshake now matches Chromium explicit loopback allowlist.
- Failed-probe count resets on Chromium PID changes.
- Installer verifies the latest observer sample belongs to this exact release, not a stale file.
- Persistent Chromium logs and crash dumps remain configured; actual dump generation requires Pi validation.
- This is NOT a guarantee of automatic recovery from every Aw Snap renderer failure.
