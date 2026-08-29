# NONZERO v4.0 — Performance Wall

Release date: 2026-08-29

## What ships

- `index.html` — phone/PWA app with one-time 6-digit Roku pairing.
- `cloud/worker.js` — Cloudflare Worker supporting 6-digit pairing, read-only Wall tokens, shared state, and Concept2 proxy support.
- `cloud/wrangler.toml.example` — Worker/KV binding example.
- `roku/` — Roku SceneGraph Performance Wall source and packaged sideload ZIP.
- `wall/index.html` — browser/mini-PC 4K Performance Wall using the same 6-digit pairing flow.
- `ROKU-SETUP.md` — Roku deployment and pairing instructions.
- `CLOUD-SYNC-SETUP.md` — Worker deployment and cloud-sync instructions.
- `WALL-V4-DESIGN.md` — v4 visual architecture and telemetry contract.
- `CHANGELOG.md`, `ROADMAP.md`, `README.md`, `CONCEPT2-INTEGRATION.md`.

## v4 Wall highlights

- Peloton-style performance hierarchy with a large live timer, current movement, progress strip, performance rail, and KPI row.
- Automatic visual states: READY, LIVE, COMPLETE, and PAIR.
- 2-second cloud polling for much faster phone-to-wall state transitions.
- Live timer interpolation on the Wall between cloud updates.
- Optional telemetry fields for heart rate, power, cadence, and distance when they are present in `activeWorkout.liveMetrics`.
- Animated ambient sweep, live-state breathing indicator, and progress glow.
- 4K source background asset plus FHD Roku SceneGraph composition optimized for clean 4K-TV upscaling.
- Six-digit pairing only; no Worker URL or private sync key entry on the Roku.

## Deployment order

1. Deploy `cloud/worker.js` to the existing NONZERO Cloudflare Worker.
2. Publish the root app and `/wall/` files to GitHub Pages.
3. Sideload `roku/NONZERO-Roku-v4.0-sideload.zip` to the Roku developer installer.
4. In the phone app, open Settings → Roku Wall pairing → Generate 6-digit pairing code.
5. On the Roku, press `*`, enter the six digits, and select **Pair Wall**.
