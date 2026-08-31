# NONZERO Basecamp

## Immutable known-good baseline

**Verified 2026-08-30**

- Phone/PWA: **v3.5**
- Cloudflare Worker: **v4.1**
- Roku Wall: **v4.3.3**

## Hardware-verified

- [x] Phone generates six-digit Roku pairing code.
- [x] Roku claims code successfully.
- [x] Roku enters synced/Cloud Live state.
- [x] Shared cloud state loads.
- [x] Active workout produces Performance mode.
- [x] Finished/stale workout releases Performance.
- [x] Wall automatically returns to scheduled Ambient without manual Reset.

## Not part of Basecamp verification

- Concept2 API token/reconciliation.
- One-link BikeErg Shortcut.
- v4.3.4 overnight keep-awake behavior.
- v4.3.5 Victory/surgery countdown.
- Phone v3.9 prioritized UI.

## Rule

Do not rewrite, move, or delete the Basecamp Git tag/release. If a future release fails, restore these exact component versions and then debug forward.

