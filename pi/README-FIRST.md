# NONZERO · Actual PM5 workouts

Pi 7.16.0 · Phone 3.63 · Worker 5.16

1. Extract the Worker ZIP and deploy its **worker.js** to the existing **nonzero_sync** Worker. Keep the existing signing secret, private sync key, NONZERO_STATE KV and NONZERO_COACH D1 binding. No schema change, new database or re-pairing is required when the signing secret is retained.
2. Extract the Phone ZIP and publish **index.html** to GitHub Pages. Open https://luka731chris.github.io/NONZERO/?v=3.63 once and let sync complete.
3. Leave **NONZERO-Pi-v7.16.0-PM5-ACTUAL-WORKOUT.zip** zipped in Downloads and run your existing **Update NONZERO** desktop shortcut. Confirm Pi 7.16.0.

During a workout, use **Use PM5 data** to finalize from a synced, completed BikeErg recording. The recorder closes after five minutes without pedaling; normal Pi upload follows within about a minute. Manual finalization bypasses the three-hour automatic wait.

Automatic replacement waits three hours after the last ride and is checked every fifteen minutes. Set checks, partner work, circuit laps, other workouts or a running app-started workout block it. **Keep with planned workout** and **Undo PM5 replacement** remain available in the recorded-workout card.

Week recalibrates remaining training slots without claiming strength completion for cycling, moving completed days, or adding catch-up volume. If recovery/strength spacing leaves no safe slot, the missed strength stays uncredited. See docs/PM5-ACTUAL-WORKOUT.md for behavior and test limits.
