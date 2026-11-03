# NONZERO v7.17.16 — Titanium mode-aware stability batch

## Changes
- Ambient: analytics/quote/agenda prioritized; expensive readiness computation every 60 seconds instead of every clock tick; PM5 wake polling every 2 seconds.
- Night: readiness every 5 minutes, PM5 wake polling every 4 seconds, cloud state every 12 seconds.
- Deep: readiness every 15 minutes, PM5 wake polling every 5 seconds, cloud state every 20 seconds.
- Performance: 500ms PM5 telemetry, 2s cloud state, 10s readiness, live cockpit/coach preserved.
- All modes: local phone commands every 1s; heartbeat every 5s, cloud heartbeat behavior retained.
- RAF health pulse no longer consumes a continuous 60fps loop while idle.
- Watchdog stale threshold 120s, minimum 180s between forced restarts, RAF stalls logged rather than blindly killed.
- Persistent bounded Chromium exit and stderr logging in ~/.local/state/nonzero/diagnostics.
- Version metadata corrected; monitor reads persistent log.
- Existing nutrition phone app, pairing, weight fallback, AutoPilot agenda cache retained.

## Important limitations
- The initiating Chromium renderer crash is still not identified; this is a risk-reduction and observability release, not a proven cure.
- AutoPilot and nutrition backend end-to-end synchronization is not newly implemented here; browser-local nutrition entries remain local.
- No real Pi hardware testing or 24-hour soak has been performed. Run a soak test after installing.
- Deliberately preserves the existing Cloudflare worker and D1 schema to avoid data migration risk.
