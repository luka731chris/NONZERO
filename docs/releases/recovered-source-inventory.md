# NONZERO recovered source inventory — 2026-11-03

This upload is an **additive overlay** intended for branch `rebuild/nonzero-7.19`. It does not contain or replace root `index.html`, existing nutrition Worker source, existing `tests/checks.py`, or the conversational migration already uploaded.

Recovered:
- Pi Wall release v7.17.21, including its Wall assets, runtime scripts, systemd services and vendored dependencies (`pi/`).
- Pi-associated Cloudflare Worker source (`workers/wall/worker.js`), deployment status unknown.
- Nutrition D1 baseline schema from prior Nutrition Worker Command Center release.
- Nutrition D1 smart-search schema from v7.18.3.
- Nutrition Worker example Wrangler configuration (inspect before use).

Not established:
- Current live Pi source matches v7.17.21 release.
- Cloudflare Wall Worker and Nutrition Worker match uploaded source.
- Actual D1 database schemas, bindings, secrets, or deployed state.
- PWA icon assets, service worker configuration, full functional tests, or end-to-end sync.

This is a source recovery package, **not a production-ready or validated deployment**.
