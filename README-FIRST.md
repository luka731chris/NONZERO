# NONZERO Pro Timer + Laps

Forward stack:
- Phone v3.13
- Worker v4.6 (unchanged)
- Roku Wall v4.5.0

## Performance timer
The master NONZERO workout timer is now the visual centerpiece of every active Performance mode.

Display:
- MM:SS.hh below one hour
- HH:MM:SS.hh at one hour and beyond
- Hundredths are computed from the underlying timestamp.
- Roku refreshes the visible timer every 0.05 seconds.
- Phone animates its visible timer locally via requestAnimationFrame.
- The master timer never resets when a lap is logged.

## Lap / sprint timer
Phone v3.13 adds a LAP button for BikeErg sprint/interval work.

Each lap records:
- lap number
- lap duration
- master-workout elapsed time at lap end
- optional average RPM
- optional average watts

Pressing LAP immediately starts timing the next lap while the master workout timer continues uninterrupted.

RPM and watts are manual-entry fields in this release. NONZERO does not yet receive a live PM5/ErgData telemetry stream. When a live Concept2 metric bridge is added, these fields can be auto-populated without changing the lap data model.

The Wall shows:
- current live lap time for BikeErg/Erg sessions
- next/current lap number
- most recently logged RPM and watts when supplied

## Motivation
Short motivational phrases remain immediately beneath the massive master timer.

## Ambient
Ambient quote text increased from 50pt to 60pt.
Attribution increased from 20pt to 29pt and uses a lighter typographic treatment.

Native Roku SceneGraph system fonts do not expose an italic variant. This build therefore does not bundle or redistribute a third-party font merely to force italics; the attribution is larger, lighter, and visually separated. A licensed app-owned italic font can be added later if desired.

## Deploy
1. Worker v4.6 is unchanged. Since it is already healthy, do not redeploy it.
2. Replace GitHub root index.html with Phone v3.13.
3. Sideload Roku v4.5.0.
4. Durable pairing should carry forward.
