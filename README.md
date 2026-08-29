# NONZERO v4

NONZERO v4 adds the Performance Wall: a premium garage-TV experience with six-digit pairing, automatic READY/LIVE/COMPLETE states, live workout timing, and a Peloton-inspired telemetry layout.

**New in v4.0:** the Roku/garage Wall is now a premium performance display with automatic READY/LIVE/COMPLETE states, a large live timer, current-movement focus, performance rail, animated progress, and the v3.4 six-digit pairing flow preserved underneath it.

# NONZERO Fitness

NONZERO is a local-first fitness consistency app with FULL / MINIMUM / FLARE workout modes and a dedicated 4K garage Wall Mode.

## v3 structure

- `index.html` — phone/PWA experience and canonical writer
- `wall/index.html` — 4K UHD garage display
- `cloud/worker.js` — lightweight Cloudflare sync API
- `cloud/wrangler.toml.example` — Worker/KV binding template
- `CLOUD-SYNC-SETUP.md` — deployment + pairing instructions
- `ROADMAP.md` — product backlog and roadmap
- `CHANGELOG.md` — release history

The phone works offline using local storage and mirrors to cloud when configured. Wall Mode reads the same cloud state, so both surfaces stay aligned without requiring a home server.


## v3.3.1 workout controls and Concept2
See `CONCEPT2-INTEGRATION.md` for the ErgData → Logbook → NONZERO bridge and the expanded post-workout metrics workflow.

## Roku TV Wall + Screensaver (v3.3)

`roku/` contains a native Roku SceneGraph client that reads the same shared Worker/KV state as the phone and web Wall. The Roku build can be launched as a normal app and exposes `RunScreenSaver()` so it can also be selected as the TV screensaver. See `ROKU-SETUP.md`.

The Roku system Home UI remains Roku-controlled. NONZERO is designed as the garage TV's practical landing surface: launch NONZERO for Wall Mode, press Home for Roku/Netflix, and return using the NONZERO tile; idle sessions can fall back to NONZERO through Roku's screensaver mechanism.


### Cloud Sync key visibility
In Settings → Cloud sync, use **Show / Hide** beside the private sync key to reveal it temporarily when pairing another device. It is hidden by default.