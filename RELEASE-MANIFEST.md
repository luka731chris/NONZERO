# NONZERO v3.3.1 — Release Manifest

**Release date:** 2026-08-29  
**Baseline:** v3.3 — Native Roku Wall + Screensaver

## Included
- `index.html` — phone/PWA workout experience.
- `wall/index.html` — 4K web Wall fallback.
- `roku/` — native Roku SceneGraph Wall/screensaver source.
- `roku/NONZERO-Roku-v3.3-sideload.zip` — upload this directly to Roku Development Application Installer.
- `ROKU-SETUP.md` — developer-mode, sideload, pairing, screensaver, and daily-use instructions.
- `cloud/worker.js` — shared-state API and Concept2 proxy.
- `CLOUD-SYNC-SETUP.md` — Worker/KV shared-state setup.
- `CONCEPT2-INTEGRATION.md` — Concept2 completed-workout bridge.
- `ROADMAP.md` — NZ-036/NZ-037 shipped; Roku foreground automation remains an optional later experiment.
- `CHANGELOG.md` — v3.3 release notes.

## Roku architecture
`Phone/PWA → Cloudflare Worker/KV ← Roku Wall / Roku screensaver`

The Roku client is read-only and uses the same `X-NONZERO-Key` pairing secret as the web Wall. It does not require a Raspberry Pi, mini-PC, Fire TV, or separate home server.

## Platform boundary
Roku's OS Home screen remains Roku-controlled. NONZERO is the practical garage landing surface and selectable screensaver, with the Home button providing an immediate path back to Roku apps.


## v3.3.1 patch
- Cloud Sync settings now include a Show / Hide toggle for the private sync key.
- The key remains masked by default; no cloud schema or Roku compatibility changes.
