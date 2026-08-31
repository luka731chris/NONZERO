# NONZERO Workout Cockpit — v3.14 / v4.6 / v4.6.0

## The timer bug found
The prior phone build still called `ensureTimerLoop()` even though that function no longer existed.
That exception could stop the startup sequence before the smooth timer animator and canonical sync loop were started. This is fixed.

The Wall also previously tried to derive hundredths from `roDateTime.AsSeconds()`, which is only second-granularity.
The Wall now anchors the canonical timer once and interpolates locally with `roTimespan.TotalMilliseconds()`.

## Today page
Today is now intentionally a workout cockpit:
- huge elapsed timer
- Start
- Pause
- Lap
- Reset
- Finish & Save
- current lap
- optional RPM / Watts entry
- today's workout agenda and checkboxes

Connection status, pain/energy readiness, ErgData status blocks and post-workout metric clutter are removed from the visible Today page.

## Performance Wall
- Placeholder performance metrics are completely hidden.
- The former telemetry side is now used by the master timer and workout agenda.
- Session/current movement context stays on the left.
- Dynamic session, current-movement and agenda text has expanded wrapping.
- Ambient dynamic/agenda wrapping is also expanded.

## Deployment
Worker v4.6 is unchanged. Do not redeploy it if current health is good.
Replace GitHub `index.html` with Phone v3.14 and sideload Roku v4.6.0.
