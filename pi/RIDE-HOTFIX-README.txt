NONZERO Pi 7.16.1 — Ride renderer recovery hotfix
Based on v7.16.0. No Worker or Phone update required.
- Adds 3-second outstanding frame watchdog; returns to animated 2D fallback when graphics worker stalls.
- Adds 2-second GPU fence timeout to prevent indefinite wait on a lost/stalled GPU.
- Preserves PM5 recorder and cloud/phone behavior.
This does NOT provide surveyed 360-degree scenery or guarantee physical Pi hardware recovery.
Test on the Pi and preserve the previous package for rollback.
