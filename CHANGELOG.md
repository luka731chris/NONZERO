# Changelog

All meaningful NONZERO releases should be recorded here.

## [Phone v3.9] — 2026-08-31

### Changed
- Reprioritized the phone Today screen around training rather than Wall administration.
- Removed the large Garage Wall Mode card from prime mobile real estate.
- Preserved Wall pairing/schedule/display controls in Settings.
- Kept surgery countdown/date, readiness, today's workout, timer/controls, and BikeErg workflow prominent.
- Added visible v3.9 identification.

## [Worker v4.3 / Phone v3.8] — 2026-08-31

### Added
- One-link BikeErg/ErgData Shortcuts setup.
- Authenticated `/automation/bikeerg/setup` and revoke flow.
- Dedicated opaque GET trigger `/automation/bikeerg/run/<token>`.
- `simpleShortcut:true` health capability.
- Surgery date input made visible directly on Today as well as Settings.

### Changed
- Shortcut no longer requires POST configuration, `X-NONZERO-Key`, or the private sync key.
- ErgData app-open is the automatic BikeErg start signal.
- Repeated ErgData opens during an active automation session are idempotent.

## [Roku v4.3.5 / Phone v3.6] — 2026-08-31

### Added
- Completed-workout Victory presentation.
- Completed-day quote weighting toward accomplishment, consistency, identity, momentum, recovery, and future repetition.
- Hip-surgery countdown architecture and pre-op phase messaging.
- Post-surgery state that stops treating the pre-op program as current.

## [Roku v4.3.4] — 2026-08-31

### Changed
- Deep overnight behavior redesigned as NONZERO-managed Panel Protect rather than intentionally surrendering to Roku screensaver behavior.
- Scheduling heartbeat remains alive so Deep can transition back to Ambient in the morning.
- Added moving minimal overnight status treatment and keep-awake strategy.

### External prerequisite
- Roku/TV system screensaver and automatic power-off settings may still need to be disabled.

## [BASECAMP] — 2026-08-30

**Phone v3.5 / Worker v4.1 / Roku v4.3.3**

Hardware-verified known-good rollback point.

Verified:
- phone six-digit code generation;
- Roku code claim and pairing;
- Cloud Live / state synchronization;
- Performance activation;
- automatic Performance → scheduled Ambient reconciliation.

This release/tag is immutable.

## [Worker v4.1] — 2026-08-30

### Restored
- Six-digit pairing routes compatible with Roku PairTask.
- `X-NONZERO-Wall` state authentication.
- Pair-code creation/claim and Wall token mapping.

### Preserved
- ErgData-first capability.
- Quote discovery.
- Concept2 API/reconciler architecture.

## [Roku v4.3.3] — 2026-08-30

### Added
- Cloud quote discovery feed and feedback task.
- Persistent local quote fallback.
- Remote feedback: UP=MORE, DOWN=LESS, RIGHT=NEXT.

## [Roku v4.3.2] — 2026-08-30

### Added
- Expanded quote intelligence/library.
- Stoic/classical, discipline, leadership, sport, psychology, business, resilience, and NONZERO themes.
- Higher-fidelity American flag and refined LukaLab branding.
- Persistent quote taste/recency behavior.

## [Roku v4.3.1 / Phone v3.4 / Worker v3] — 2026-08-30

### Architecture
- Established ErgData-first operating model.
- Worker can create active session from iOS automation.
- Cloud session survives phone app switching.
- Worker cron architecture reconciles Concept2 result and completes session.
- Roku distinguishes ErgData automation from true live PM5 telemetry.

