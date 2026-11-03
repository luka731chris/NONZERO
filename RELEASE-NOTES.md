# NONZERO Coordinated Release — Phone v3.4 / Worker v3 / Roku v4.3.1

**Release goal:** Make Erg days function with the minimum practical foreground apps while preserving NONZERO's timer, Wall, history, and synchronization.

## Phone v3.4
- Restores/retains explicit Start, Pause, Reset fallback controls.
- Adds ErgData-first orchestration/status card.
- Adds Settings helpers for iOS Shortcut start endpoint and private sync key.
- Reflects Worker-started workouts after cloud pull.
- Continues timestamp-based timer recovery across iOS app switching.

## Worker v3
- Adds authenticated `/intent/erg/start`, `/pause`, `/reset`.
- Adds supported Concept2 `/concept2/latest` proxy using `C2_API_TOKEN`.
- Adds once-per-minute reconciliation for active ErgData sessions.
- Stores only narrow deterministic orchestration changes rather than turning Roku into a writer.
- Auto-releases abandoned Erg sessions after four hours.

## Roku v4.3.1
- Treats ErgData automation as Performance state.
- Keeps the existing v4.1.9 pairing/runtime architecture.
- Preserves quote engine, graphics, Night/Deep scheduling, and dropout protection.

## Not claimed
This release does not provide true live PM5 watts/meters/cadence through ErgData. Completed Concept2 result reconciliation is automatic; live metric relay remains a future integration.
