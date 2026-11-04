# NONZERO v7.17.21 — renderer recovery hardening
- Independent CDP renderer checks every 30 seconds, including when heartbeat remains fresh.
- Probe exit codes distinguish healthy (0), unhealthy (1), protocol/config (2), timeout (3), unavailable (4).
- 3 failed renderer/timeout probes trigger bounded recovery; CDP unavailable requires six checks plus stale heartbeat.
- CDP configuration failure does not trigger destructive restart; it is logged for repair.
- Installer checks Chromium return if kiosk was active before installation; headless deployments cannot certify display health.
- Incident logging and existing mode-aware optimization retained.
- Real Pi/PM5 and remote integration validation remain required.
