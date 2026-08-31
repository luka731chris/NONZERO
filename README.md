# NONZERO

**NONZERO** is a personal training system built around one idea: make the right workout easier to start, complete, and repeat.

It has three coordinated surfaces:

- **Phone/PWA** — primary control surface for readiness, programming, workout execution, progress, surgery countdown, and setup.
- **Cloudflare Worker + KV** — durable shared workout state, Roku pairing, BikeErg/ErgData automation, quote feed, and optional Concept2 reconciliation.
- **Roku Wall** — persistent garage display with Ambient, Performance, Victory, Night, and Deep Panel Protect behavior.

## Current development stack

| Component | Current | Role |
|---|---:|---|
| Phone/PWA | **v3.9** | Prioritized mobile training UI |
| Cloudflare Worker | **v4.3** | Pairing, cloud state, simple BikeErg automation, quote discovery |
| Roku Wall | **v4.3.5** | Ambient/Performance/Victory/Night/Deep display |
| Known-good Basecamp | **Phone v3.5 / Worker v4.1 / Roku v4.3.3** | Permanent rollback point |

> Basecamp is immutable. New development moves forward from it; do not rewrite the Basecamp tag/release.

## Product priorities

The phone is a **training control surface**, not a Wall remote. Prime mobile real estate is reserved for:

1. progress and consistency,
2. hip-surgery countdown / pre-op mission,
3. pain + energy readiness,
4. today's workout,
5. workout timer and start/pause/reset/finish controls,
6. BikeErg automatic workflow.

Roku pairing, schedule, and display-management controls remain available in **Settings**.

## BikeErg / ErgData operating model

ErgData owns the PM5 Bluetooth connection. NONZERO owns orchestration, durable state, Wall mode, and post-workout reconciliation.

Normal flow after one-time setup:

`Wake PM5 → Open ErgData → NONZERO becomes ACTIVE → Roku Ambient → Performance → Train`

Phone v3.9 + Worker v4.3 use a **one-link Shortcuts trigger**. The Shortcut no longer needs a POST method, custom header, or the private NONZERO sync key.

Because iOS does not expose “PM5 connected inside ErgData” as a Shortcuts trigger, **ErgData Is Opened** is the supported automatic trigger.

Do not create an ErgData “Is Closed” stop automation; switching apps during a workout must not terminate the session.

## Hip surgery / pre-op mode

Until a date is known, the phone displays **SURGERY DATE TBD**. Once entered, the date is stored in shared NONZERO state and drives a live countdown and pre-op phase.

Current phases:

- >84 days — BUILD BASE
- 43–84 days — BUILD CAPACITY
- 15–42 days — CONSISTENCY BLOCK
- 4–14 days — ARRIVE READY
- 1–3 days — FINAL APPROACH
- 0 days — SURGERY DAY
- after surgery — POST-OP / clinical-plan state

The countdown changes motivational emphasis; it must not automatically prescribe unsafe increases in training intensity.

## Wall behavior

A live/paused workout overrides the normal Wall schedule and enters Performance. Completed work transitions through a Victory-oriented state and then returns to the scheduled display. Completed-day quote weighting favors accomplishment, consistency, momentum, recovery, and returning tomorrow.

Default schedule:

- Ambient — 06:00
- Night — 20:30
- Deep Panel Protect — 01:00

Deep mode remains inside NONZERO so the scheduling heartbeat can return the Wall to Ambient in the morning. Roku/TV system screensavers and automatic power-off should be disabled on the garage display.

## Security

Never commit secrets. In particular:

- `C2_API_TOKEN` belongs in Cloudflare secrets.
- The NONZERO private sync key must not be committed.
- Roku pairing uses a one-time six-digit code followed by a long-lived Wall token.
- The BikeErg Shortcut uses a dedicated opaque automation URL rather than storing the private sync key in Shortcuts.

## Documentation map

- `ROADMAP.md` — priorities, backlog, decisions, and what is next.
- `CHANGELOG.md` — release history.
- `ARCHITECTURE.md` — current system design and invariants.
- `BIKEERG-ERGDATA.md` — current one-time setup and Concept2 behavior.
- `BASECAMP.md` — immutable rollback baseline.
- `RELEASE-CHECKLIST.md` — validation before promoting a release.
- `CONTRIBUTING.md` — development rules.
- `SECURITY.md` — secret/authentication rules.

