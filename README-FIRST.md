# NONZERO Intelligent Training — v3.15 / Worker v4.7 / Roku v4.7.0

This release implements the full 15-item enhancement batch: state-machine presentation, Current/Next Up, phone Wall remote, automatic rest, set-level tracking, PR cue framework, adaptive Performance typography, richer Victory, Make It Nonzero, adaptive 30-minute builder, Garage Arrival-on-open, flight recorder, expanded offline reconciliation, Wall Health watchdog, and Weekly Performance Report.

External boundaries: live automatic PM5 RPM/Watts still requires the PM5 telemetry bridge; Garage Arrival is phone-app foregrounding rather than geofence hardware; Roku cannot run as a normal hidden app under Netflix, but the cloud workout persists and reconstructs when NONZERO reopens.

DEPLOY ORDER:
1. Worker v4.7
2. Phone v3.15
3. Roku v4.7.0
4. Check Phone Settings → Wall Health after ~60 sec

Worker v4.7 preserves durable pairing and the existing v4.6 routes. It also rejects stale unversioned state PUTs after revisioned state exists (HTTP 428), closing the known overwrite hole.
