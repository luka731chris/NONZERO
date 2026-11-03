# NONZERO Titanium v7.17.17 — Recovery & Observability

This is a **stability instrumentation and controlled-recovery** release, not proof that Chromium renderer faults are eliminated.

## What changed
- Persistent 15-second browser process and heartbeat samples; capped JSONL logs and local readable report.
- Crash-context capture **before** forced watchdog restart, preserving 20 recent incident snapshots.
- Watchdog uses a 150-second stale threshold and 120-second startup grace, and limits forced restarts to 2 per 30 minutes with a 5-minute spacing. If a crash persists after the budget, the screen may remain unhealthy rather than being forcibly restarted.
- Corrected diagnostic service startup path; updater verifies observer service status.
- Chromium stderr preserved on disk, with bounded files; support ZIP generated locally with `bin/titanium-support-bundle.py`. No automatic data upload.
- Keeps v7.17.16 mode-specific budgets, quote/analytics emphasis, cockpit performance, pairing, PM5, AutoPilot fallback, and phone nutrition UI.

## Important limitations
- Cannot prove or fix Chromium renderer's initial failure without on-device logs.
- Nutrition data is still browser-local and does not sync across devices. AutoPilot is still cached fallback, not a newly guaranteed durable integration.
- No remote push-button retrieval of logs from the phone is included; support bundles are local to the Pi.
- No hardware-in-the-loop test was possible. Use 24-hour unattended soak and two PM5 sessions as acceptance criteria.
- Diagnostic logs can contain sensitive device and integration metadata; keep support bundles private.
