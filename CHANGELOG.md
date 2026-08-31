# CHANGELOG

## Phone v3.14
- Removed stale undefined ensureTimerLoop() call that could abort startup.
- Added monotonic performance.now() timer rendering.
- Timer face updates independently from cloud/state/UI rendering.
- Major Today cockpit redesign.
- Consolidated Start / Pause / Lap / Reset / Finish & Save.
- Removed connection, readiness and orchestration clutter from visible Today.

## Worker v4.6
- Unchanged.

## Roku v4.6.0
- Replaced second-resolution elapsed calculation with roTimespan millisecond interpolation.
- Timer target refresh ~60 fps.
- Hid placeholder telemetry panel.
- Moved massive timer + workout agenda into the former metrics side.
- Kept current movement context on left.
- Expanded text wrapping in Performance and Ambient dynamic content.
