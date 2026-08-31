# NONZERO — Product Roadmap & Backlog

> **Updated:** 2026-08-31  
> **Current development stack:** Phone v3.9 + Worker v4.3 + Roku v4.3.5  
> **Immutable rollback Basecamp:** Phone v3.5 + Worker v4.1 + Roku v4.3.3

## North Star

**Make it easier to start, complete, and sustain the right workout for today — while making progress toward hip surgery visible and motivating.**

### Product rules

1. Starting counts; MINIMUM/FLARE work can still be a win.
2. Hip-friendly first; do not reward pushing through joint pain.
3. Phone = training control surface. Wall management is secondary mobile functionality.
4. ErgData owns PM5 Bluetooth; NONZERO should not compete for the connection.
5. One state, multiple surfaces.
6. Local-first phone behavior; cloud adds continuity and orchestration.
7. Completed work should feel different: celebrate the win and reinforce future consistency.
8. Pre-op countdown should create urgency without automatically escalating unsafe intensity.
9. Basecamp releases are immutable.
10. Appliance behavior matters: the Wall should require as little manual interaction as possible.

## Current shipped capabilities

| ID | Capability | Status |
|---|---|---|
| NZ-001 | Durable timestamp-based workout timer | ✅ Done |
| NZ-002 | Hip pain + energy readiness inputs | ✅ Done |
| NZ-005 | Configurable hip-surgery date + countdown | ✅ Done |
| NZ-007 | Prioritized mobile/PWA UI | ✅ Done v3.9 |
| NZ-008 | Roku Wall experience | ✅ Done |
| NZ-009 | Shared Cloudflare/KV state | ✅ Done |
| NZ-033 | Restart/reset controls | ✅ Done |
| NZ-034 | Post-workout metrics | ✅ Done |
| NZ-035 | Concept2 Logbook bridge architecture | ✅ Built; token not yet configured |
| NZ-036 | Six-digit Roku pairing | ✅ Done |
| NZ-037 | Scheduled Ambient/Night/Deep modes | ✅ Done |
| NZ-038 | Deep Panel Protect + morning schedule heartbeat | 🧪 Hardware validation |
| NZ-039 | Adaptive quote engine + cloud discovery | ✅ Done |
| NZ-040 | Victory/completed-day motivational state | ✅ Done v4.3.5 |
| NZ-041 | ErgData-open → active BikeErg → Performance | ✅ Built v4.3 |
| NZ-042 | One-link, no-header Shortcuts setup | ✅ Built v4.3 |
| NZ-043 | Phone Wall controls demoted to Settings | ✅ Done v3.9 |

## NOW — stabilize the automatic training loop

| ID | Feature | Priority | Status | Acceptance signal |
|---|---|---:|---|---|
| NZ-044 | Validate one-link ErgData automation on iPhone | P0 | 🟢 Ready | Open ErgData once; NONZERO becomes ACTIVE and Wall enters Performance without opening NONZERO |
| NZ-045 | Configure Concept2 API token | P0 | 🟢 Ready | `/health` reports `concept2:true` |
| NZ-046 | Validate automatic Concept2 completion | P0 | 🔵 Dependency | Finished ErgData result is detected, metrics imported, workout completed, Wall releases Performance |
| NZ-047 | Overnight appliance validation | P0 | 🧪 Test | Deep survives overnight and returns to Ambient at configured morning time |
| NZ-048 | Cloud-state revision/conflict hardening | P1 | 🟡 Define | Phone writes cannot overwrite a newer Worker-created active/completed session |
| NZ-049 | Recovery/status diagnostics | P1 | 🟡 Define | Settings shows Phone/Worker/Roku/Concept2 health in one compact diagnostic view |

## NEXT — make the pre-op program genuinely adaptive

| ID | Feature | Priority | Status | Acceptance signal |
|---|---|---:|---|---|
| NZ-003 | Flexible day swap/reschedule | P1 | 🟢 Ready | Move a workout without corrupting adherence/history |
| NZ-004 | Sunday report card | P1 | 🟢 Ready | Weekly adherence, starts, strength/cardio, mode mix, trend and encouragement |
| NZ-018 | Pre-op consistency score | P1 | 🟡 Define | Rewards appropriate adherence, not raw intensity |
| NZ-050 | Surgery-phase programming rules | P1 | 🟡 Define | Countdown phase changes recommendations while respecting pain/readiness constraints |
| NZ-051 | Surgery-date milestone scenes | P2 | 🟡 Define | Wall surfaces restrained 12/8/6/4/2/1-week milestones |
| NZ-052 | Post-op mode transition | P1 | 🔵 Dependency | Surgery date passing disables pre-op prescriptions and clearly defers to clinical plan |
| NZ-006 | Equipment inventory UI | P1 | 🟢 Ready | Enabled equipment persists and constrains recommendations |
| NZ-010 | Adaptive workout generator | P1 | 🔵 Dependency | Produces viable session from equipment + pain + energy + recent work |
| NZ-015 | Exercise substitution | P1 | 🟡 Define | Swap movement while preserving intent and hip constraints |
| NZ-016 | Workout history details | P2 | 🟢 Ready | Past session opens with completion and metrics |
| NZ-017 | Trend highlights/PBs | P2 | 🟡 Define | Positive progress without unsafe intensity incentives |

## LATER — richer connected fitness

| ID | Feature | Priority | Status | Note |
|---|---|---:|---|---|
| NZ-030 | Live PM5 telemetry on Wall | P2 | 🔵 Dependency | Separate bridge; do not create a competing ErgData Bluetooth recorder |
| NZ-023 | HealthKit architecture | P1 | 🟡 Define | Likely requires native iOS layer |
| NZ-024 | Apple Health workout writes | P1 | 🔵 Dependency | Avoid duplicates with ErgData |
| NZ-025 | Apple Fitness rings | P1 | 🔵 Dependency | Supported HealthKit path only |
| NZ-027 | Native iPhone shell | P2 | 🟡 Define | Consider when web/PWA becomes the limiting factor |
| NZ-028 | Apple Watch companion | P3 | ⚪ Later | After native foundation |

## Friction log

| ID | Friction | Status / decision |
|---|---|---|
| F-001 | Roku keypad froze in early pairing builds | Resolved by stable six-digit pairing architecture |
| F-002 | Worker upgrade broke pairing | Resolved; Basecamp created; pairing preservation is release invariant |
| F-003 | Phone replacement temporarily removed pairing UI | Resolved; pairing is now required regression check |
| F-004 | Manual Shortcuts POST/header/key setup was confusing | Replaced by v4.3 one-link trigger |
| F-005 | Garage Wall card consumed too much phone real estate | Removed from Today in v3.9; controls live in Settings |
| F-006 | Surgery date/countdown was not visible enough | Date input now appears directly on Today and Settings |
| F-007 | Roku system screensaver interrupted overnight behavior | NONZERO Deep Panel Protect added; system screensaver/power settings remain external prerequisite |
| F-008 | `concept2:false` | Open: configure `C2_API_TOKEN` |

## Durable decisions

### D-001 — Basecamp is immutable
Known-good Basecamp is **Phone v3.5 / Worker v4.1 / Roku v4.3.3**. Do not move/delete its Git tag or overwrite its release assets.

### D-002 — ErgData-first
ErgData remains the sole PM5 Bluetooth recorder. NONZERO orchestrates state, Wall behavior, and reconciliation.

### D-003 — App-open is the automatic BikeErg trigger
iOS does not expose PM5-inside-ErgData connection as an automation trigger. Use **ErgData Is Opened → Run Immediately**.

### D-004 — Never stop on ErgData close
The user may switch to Music, Mail, Teams, Roku Remote, etc. A foreground-app change must not terminate the workout.

### D-005 — Phone prioritizes training
The Today screen should not become a Wall administration dashboard.

### D-006 — Completed work changes the emotional architecture
Victory mode and completed-day quote weighting should reinforce accomplishment plus the next repetition, not generic hype.

### D-007 — Surgery countdown is motivational, not medical autopilot
Countdown phases may change emphasis and presentation; pain/readiness and the clinical plan govern actual exercise suitability.

## Definition of Done

A release is not done because it renders. Relevant releases must:

- preserve six-digit Roku pairing;
- preserve cloud sync and existing saved progress;
- preserve active-workout override of Wall schedule;
- preserve automatic return to scheduled mode after completion;
- preserve ErgData-first / single-PM5-recorder architecture;
- survive app switching without resetting an active session;
- avoid exposing secrets in GitHub or Shortcuts;
- render clearly on phone and Roku;
- include an explicit empty/error state;
- update `CHANGELOG.md` and this roadmap;
- pass syntax/package checks;
- be hardware-tested before being promoted to a new Basecamp.

