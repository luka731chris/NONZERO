# NONZERO Architecture

## Current components

### Phone/PWA — v3.9
Primary human control surface.

Responsibilities:
- readiness: hip pain + energy;
- today's program and mode;
- durable workout timer and controls;
- completion/post-workout metrics;
- progress/history;
- surgery date/countdown;
- BikeErg automation setup;
- cloud configuration;
- Roku pairing and schedule in Settings.

The phone is local-first. Cloud state improves continuity but should not make the basic workout UI unusable offline.

### Cloudflare Worker — v4.3
Shared-state/orchestration layer backed by `NONZERO_STATE` KV.

Responsibilities:
- phone-key state GET/PUT;
- Roku pairing-code creation/claim;
- Wall-token state GET;
- BikeErg/ErgData start intents;
- simple one-link Shortcuts setup/run/revoke;
- quote feed/feedback;
- optional Concept2 latest-result lookup;
- scheduled Concept2 reconciliation.

Current health target:

`version: 4.3`
`ergDataFirst: true`
`quoteDiscovery: true`
`rokuPairing: true`
`bikeErgAuto: true`
`simpleShortcut: true`

`concept2` is true only when `C2_API_TOKEN` is configured.

### Roku Wall — v4.3.5
Persistent read-mostly display.

Modes:
- **Ambient** — motivation, progress, mission/countdown.
- **Performance** — active/paused workout.
- **Victory** — immediate/completed-day accomplishment treatment.
- **Night** — low-light clock/branding.
- **Deep Panel Protect** — near-black overnight mode while keeping NONZERO's schedule heartbeat alive.

## State authority

The phone historically writes full state. Worker v4.x is also a narrow writer for automation/reconciliation. This creates a known race risk: a stale whole-state phone PUT could overwrite a newer Worker-created state.

**Required hardening:** revision/ETag or field-aware merge semantics before expanding multi-writer behavior.

## Pairing protocol

1. Authenticated phone calls `POST /pair/create`.
2. Worker creates short-lived six-digit code.
3. Roku sends `{code}` to public `POST /pair/claim`.
4. Worker returns a random `wallToken`.
5. Roku stores token locally.
6. Roku polls `GET /state` with `X-NONZERO-Wall`.
7. Invalid/expired token returns `missing_or_invalid_key`.

Do not require Worker URL/private key entry on the television.

## BikeErg automation

### Design constraint
ErgData owns the PM5 Bluetooth connection.

### Start
Phone v3.9 creates a dedicated opaque automation URL through authenticated Worker setup. Apple Shortcuts calls that URL when ErgData opens. Worker marks:

- `activeWorkout.status = active`
- `activeWorkout.source = ergdata-automation`
- `activeWorkout.type = bike`
- durable `sessionId`
- timestamp-based running timer

Roku sees active state on its normal cloud poll and enters Performance.

### App switching
Reopening ErgData while the same automation session is active is idempotent. Closing ErgData is not a stop signal.

### Completion
Preferred future-complete loop:

`ErgData → Concept2 Logbook → Worker cron → new result detected → metrics mapped → active workout completed → Roku returns to schedule`

This path requires `C2_API_TOKEN`.

## Surgery countdown

Shared state includes `surgeryPlan.date`. The phone and Wall derive days remaining and presentation phase from the date.

Countdown logic must remain presentation/program-emphasis logic, not an autonomous medical prescription engine.

## Wall schedule

Default:
- Ambient 06:00
- Night 20:30
- Deep 01:00

Active or paused workout overrides schedule. Completion releases the override.

## Release invariants

Never ship a release that silently breaks:
- six-digit pairing;
- existing Wall token behavior without a documented re-pair;
- cloud state loading;
- active → Performance;
- completed → scheduled mode;
- ErgData single-recorder architecture;
- saved progress compatibility.

