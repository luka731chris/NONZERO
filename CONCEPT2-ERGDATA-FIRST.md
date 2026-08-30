# NONZERO — ErgData-First Concept2 Integration (v3.4)

## Operating model

**ErgData owns the PM5 Bluetooth connection. NONZERO owns orchestration, durable session state, Wall mode, and post-workout reconciliation.**

Preferred Erg-day flow:

`Open ErgData → iOS Shortcut POSTs NONZERO start intent → Worker marks workout active → Roku enters Performance → ErgData records PM5 + Apple Watch HR → ErgData syncs Concept2 Logbook → Worker cron detects new result → NONZERO stores metrics + completes session → Roku returns to scheduled mode`

This deliberately avoids having NONZERO compete with ErgData for the PM5 Bluetooth connection.

## One-time iPhone automation

1. Configure NONZERO Cloud Sync first.
2. In NONZERO Settings → ErgData-first automation, copy the **start endpoint** and **sync key**.
3. Open Apple Shortcuts → Automation → **App** → choose **ErgData** → **Is Opened** → **Run Immediately**.
4. Add **Get Contents of URL**.
5. Paste the start endpoint. Method: **POST**.
6. Add HTTP header `X-NONZERO-Key` with the private sync key.
7. Body may be empty JSON `{}`.
8. Do **not** create an “ErgData closed” stop automation. Switching to Mail, Teams, Music, Roku Remote, etc. must not terminate the session.

## Automatic completion

Cloud Worker v3 includes a once-per-minute scheduled reconciler. On Erg start, it remembers the latest existing Concept2 result ID. When ErgData later uploads a new result, the Worker treats that new result as the authoritative completion signal, imports its metrics, stops the NONZERO timer, and returns the Wall to its normal schedule.

Enable the cron trigger using the included `wrangler.toml.example`.

## Apple Health / Fitness

Keep ErgData's Apple Health permissions enabled, including all requested write permissions. ErgData remains the source that publishes the erg workout into Apple's health ecosystem; NONZERO does not create a duplicate HealthKit workout in this web/PWA release.

## Live leaderboard limitation

The Wall can show the live NONZERO timer/session immediately, but this release does **not** pretend that completed Logbook data is live PM5 telemetry. A future telemetry bridge is still required for live watts, pace, cadence, meters, and HR on the Wall while ErgData remains the PM5 recorder.
