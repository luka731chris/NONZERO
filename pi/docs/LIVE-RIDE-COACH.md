# Live Ride Coach · Pi 7.15.0 / Phone 3.61

The ride cockpit now puts watts, cadence and heart rate in three large, high-contrast cards. Target ranges come from the existing adaptive goal controller. Unknown power targets say calibrating; unknown HR targets say monitoring. No HR ceiling is invented. The trail remains visible above the cockpit. The graphics worker acknowledges GPU completion before accepting the next frame, preventing a render queue from accumulating on slower hardware while telemetry remains on the main thread.

Live coaching reflects warmup, cooldown, goal completion, recovery, sustained cadence or power deviation, and data loss. Ordinary corrections wait four seconds to avoid reacting to transient fluctuations. Heart rate above an established target immediately takes priority over cadence/power encouragement. On-target technique and consistency cues rotate every 15 seconds. These are on-screen coaching cues; spoken coaching is not included.

## Phone controls during a workout

- **Metrics view / Ride scenes** toggles the Wall between the full analytics cockpit and the moving landscape. This uses the existing authenticated ride control channel and requires paired cloud sync. Your timer, completed sets and partner workout remain intact.
- **Soundtrack: off/on** starts or stops the original instrumental on the phone in one tap. Output follows the phone's selected speaker/headphones. No cloud connection is required to start phone audio. Keep the phone app visible; iOS may suspend audio in the background.
- **Ride controls** opens all seven scene choices, phone/TV soundtrack buttons and volume. Selecting TV stops phone playback; selecting phone stops a TV score enabled in these controls.

Each landscape has a distinct original musical palette (North Shore pulse, country road acoustic, trail drive, coastal flow, open horizon ambient, alpine ascent, grand tour momentum). Roots, melodies, timbre and percussion vary by scene. Cadence changes tempo and energy gradually. It is generated instrumental audio, not licensed tracks or control of Amazon Music. No subscription, media download, Worker change or extra polling frequency is introduced.

TV output uses direct PM5 telemetry, remains available in both scenes and metrics view, and fades on pause, stale readings, departure from Performance or page hide. The installed Pi kiosk enables browser audio without a keyboard gesture; TV/speaker output must be enabled on the Pi. A regular browser may block TV audio; the phone displays an actionable message and phone audio remains available. Phone cadence follows the existing Wall health snapshots (about 15 seconds), with steady tempo when unavailable, disclosed in the UI.

The release includes regression, deterministic coaching/music, and real Chromium controls/visual checks. Physical Pi audio routing, TV loudness, iOS background behavior and physical PM5 acceptance require device verification. See QA JSON reports for actual executed checks.
