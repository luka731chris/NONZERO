# NONZERO v3.4 / Roku v4.3.1 — Installation

## 1. Phone
Replace the GitHub Pages/PWA `index.html` with `phone/index.html`. Existing local storage is preserved; the shared schema is additive.

## 2. Cloudflare Worker
Replace your current Worker with `cloud/worker.js`. Keep the existing `NONZERO_STATE` KV binding. Set the Concept2 bearer token as `C2_API_TOKEN`. Enable the once-per-minute cron from `cloud/wrangler.toml.example`.

## 3. Roku
Sideload `NONZERO-Roku-v4.3.1-sideload.zip`. Existing v4.1.9-derived pairing architecture remains unchanged.

## 4. iPhone Shortcuts automation
Follow `CONCEPT2-ERGDATA-FIRST.md`. Once configured, the Erg-day daily flow is intended to be: **open ErgData → train**.

## 5. Validation test
1. Leave Roku in Ambient.
2. Open ErgData; allow the automation to run.
3. Within the next Roku poll, Wall should switch to Performance.
4. Switch iPhone to Mail/Music/Teams/Roku Remote for several minutes. Wall must remain Performance and timer must continue.
5. Finish the ErgData workout and let it sync to the Concept2 Logbook.
6. Within roughly 1–2 minutes of the new Logbook result, Worker reconciliation should mark the NONZERO session complete and Wall should return to schedule.
