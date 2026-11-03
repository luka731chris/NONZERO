# Rebuild branch source recovery (2026-11-03)

This tree was reconstructed from the original GitHub branch snapshot plus the v7.19 nutrition and v7.17.21 Pi release source archives, **not** by rearranging the flattened GitHub upload.

Do not deploy this source to the Pi, Cloudflare, or main branch without checking against running deployments.

- `index.html`: phone app, original rebuild branch
- `workers/nutrition/index.js`: v7.19 nutrition worker
- `workers/wall/worker.js`: recovered Wall worker
- `database/migrations/`: recovered SQL migration files (not a production schema export)
- `pi/`: recovered Pi release source, images and bundled third-party libraries
- `tests/checks.py`: static source-presence checks only

The Pi vendor tree is retained to avoid breaking an offline Pi release. Audit licenses and dependencies before commercial distribution.

The PWA manifest references icon assets not recovered here. The service worker and package scripts are stale; see the existing repository audit.
