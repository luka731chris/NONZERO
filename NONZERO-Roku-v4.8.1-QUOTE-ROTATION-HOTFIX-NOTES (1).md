# NONZERO Roku v4.8.1 — Quote Rotation Hotfix

Root issue addressed:
- `quoteTimer` existed in SceneGraph but was not actually observed/started by the Wall scene.
- Quote rotation therefore depended entirely on the outer `main.brs` elapsed loop.

Fix:
- `quoteTimer` now runs independently every 17 seconds.
- It emits an automatic `rotate` action that does NOT count as negative/skip feedback.
- `main.brs` has a 21-second watchdog: if the normal timer path ever stalls, it forces a quote change.
- Existing cloud/local quote intelligence, preference learning, author attribution, and A/B crossfade remain intact.
- Deep/Panel Protect still suspends quote rotation.
- v4.8.0 Studio Polish layout/KPIs are unchanged.

No phone or Worker redeploy is required.
