# Actual PM5 workouts · Pi 7.16.0 / Phone 3.63 / Worker 5.16

## One-button finalization

During a workout, tap **Use PM5 data**. This bypasses the automatic quiet window and finalizes the app workout from the synced, completed BikeErg recordings for that date. The phone returns to Today with the actual ride, recorded duration, distance and monitor calories. Bike activity earns no strength-program completion credit. A saved workout can also be selected in the contextual Recorded PM5 workout card. Other saved records are preserved; recordings already linked to another record are protected against duplication.

The recorder closes a ride after five minutes without pedaling. Its completed summary normally uploads on the next one-minute Pi sync. The button is disabled until that summary is available. This release does not force-close a moving PM5 ride or fabricate the final unsynced seconds. Multiple completed BikeErg segments on the date are grouped, retaining their individual recorder IDs and summing each recorded segment’s sample-span duration rather than gaps between segments.

The displaced session and app state remain available through **Undo PM5 replacement**. **Keep with planned workout** suppresses automatic replacement for that date. Corrections do not rewrite raw Pi samples.

## Conservative automatic replacement

With the Pi and cloud sync online, three hours after the last recorded ride, automatic reconciliation may replace an untouched PM5-started planned session with actual aerobic work. A later PM5 activity restarts the wait. Overlapping recorder segments, primary or partner set checks, circuit laps, set-toggle history, another declared workout, or a still-running app-started workout prevent replacement. This preserves warmups, cooldowns and mixed sessions. The system can only assess logged data; it cannot detect unlogged strength work.

The Pi revisits candidates every fifteen minutes after upload, so finalization can occur up to fifteen minutes after the three-hour threshold. It runs on the Pi; the phone need not remain open. No new Worker cron trigger is needed.

## Weekly recalibration

Both screens derive the remaining week from the same baseline template and replacement record. A missed strength session shifts into the next training slot, subsequent strength/aerobic sessions shift forward, and the recorded ride takes the place of the last aerobic slot. Strength progression keeps its original prescription identity.

Completed days, recovery days and post-surgery clinical plans are protected. Shifts that cannot preserve spacing between strength days or would discard a strength session are not applied. The system does not add catch-up volume or invent strength completion. The Week view reflects completed activity and adjusted future slots. Undo removes the corresponding reshuffle. Multiple substitutions may leave insufficient remaining space; safety takes precedence over forcing all missed work into the week.

## Installation

1. Deploy the included Worker 5.16 `worker.js` to the existing **nonzero_sync** Worker. Keep existing secrets, NONZERO_STATE KV and NONZERO_COACH D1 bindings. No database/schema change. Health should report version 5.16 and pm5Reconciliation true.
2. Publish Phone 3.63 `index.html` and open the updated app once so its baseline weekly template can sync.
3. Leave the Pi 7.16.0 ZIP in Downloads and run the existing desktop updater.

Existing signed Wall pairing remains valid when the signing secret is retained.

## Validation limits

Pure policy tests, actual Worker/KV simulations, the Pi upload coordinator and real Chromium phone flows cover finalization, quiet-window protection, authentication, revisions, duplicate prevention, shared state, weekly shifting, Undo and regression flows. Physical Pi/PM5, iPhone camera and installed-device acceptance remain unverified. Prior full-release QA reports retain their original version; this release has its own targeted regression report.
