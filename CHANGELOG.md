# NONZERO v3.3.1 — Sync Key Visibility

- Added **Show / Hide** control beside the Cloud Sync private key.
- Private key remains masked by default and storage/sync behavior is unchanged.
- Added accessible pressed-state and label updates for the visibility control.

# NONZERO Changelog

## v3.3 — Roku Wall + Screensaver (2026-08-29)

- Added native Roku SceneGraph Wall client under `roku/`.
- Added `RunScreenSaver()` entry point so the same client can operate as the selected Roku screensaver.
- Added first-launch Roku pairing using Worker URL + private sync key, stored in the Roku registry.
- Roku client polls shared NONZERO state every 5 seconds and remains read-only.
- Added Roku remote behavior: `*` opens pairing; Home exits naturally to Roku Home.
- Added `ROKU-SETUP.md` and a ready-to-sideload Roku ZIP.
- Retained web `/wall/` as a browser/fallback display.
- Reframed dedicated kiosk hardware as optional rather than required.


## v3.1 — Workout Controls + Metrics + Concept2 Bridge (2026-08-28)
- Added persistent workout timer with Start/Pause.
- Added **Clear timer** without clearing exercise completion.
- Added **Restart workout** to clear today’s checkoffs/timer while preserving readiness inputs.
- Added robust post-workout metrics: actual duration, RPE, post-workout pain/energy, distance, calories, pace, watts, cadence/stroke rate, HR, drag factor, and notes.
- Added Concept2 completed-workout bridge through the existing Cloudflare Worker and Concept2 Online Logbook API.
- Bumped shared-state schema to v4.
# Changelog

## v3.0 — 2026-08-28 — 4K Wall + Shared Cloud State

- Added native 3840×2160-oriented `/wall/` dashboard for garage TV use.
- Added distance-readable workout, progress, streak, week starts, BikeErg minutes, total starts, clock/date, and rotating NONZERO motivation.
- Added Wall Mode launcher to phone app.
- Added local-first shared-state architecture using a Cloudflare Worker + KV.
- Added phone cloud configuration, secure random sync-key generation, manual sync, queued background sync, and offline fallback.
- Added Wall Mode pairing and 10-second read-only cloud polling.
- Added cloud setup documentation and deployable Worker source.
- Preserved `hipPrehabV2` local storage compatibility and existing session history.
