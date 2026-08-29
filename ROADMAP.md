# NONZERO Fitness App — Product Roadmap & Backlog

> **Purpose:** Keep one lightweight, GitHub-native source of truth for what NONZERO should build next, why it matters, and what is already complete.
>
> **Baseline:** **NONZERO v3.3 (2026-08-29)** is the current implemented baseline: `index.html` phone/PWA + `/wall/` 4K web display + native Roku Wall/screensaver + optional Cloudflare Worker/KV shared state.

---

## 1. Product North Star

**Make it easier to start, complete, and sustain the right workout for today — even when hip pain, energy, schedule, or motivation are working against the user.**

NONZERO should reduce decision friction, reward consistency, adapt to readiness, and make meaningful progress visible without turning the app into a complicated fitness dashboard.

### Core principles

1. **Starting counts.** A MINIMUM or FLARE session is still a win.
2. **Hip-friendly first.** Never force painful hip range of motion or reward "pushing through" joint pain.
3. **Low decision friction.** The app should tell the user what to do next.
4. **Equipment-aware.** Recommendations should reflect what is actually available in the home gym.
5. **Adaptive, not random-for-random's-sake.** Pain, energy, recent training, equipment, and schedule should influence workout selection.
6. **Progress should feel motivating.** Weekly reporting, streaks, countdowns, and completed work should reinforce momentum.
7. **Native integrations should add value, not block the web app.** Browser functionality continues improving while PM5 / HealthKit architecture evolves.
8. **One state, multiple surfaces.** Phone and Wall Mode should show the same workout truth without requiring a home server.
9. **Local-first reliability.** Cloud sync should improve continuity without making workouts dependent on internet availability.

---

## 2. Status & Priority System

### Status

| Status | Meaning |
|---|---|
| ✅ Done | Implemented in the current baseline |
| 🟢 Ready | Well-defined and can be built now |
| 🟡 Define | Valuable, but needs product/technical definition |
| 🔵 Dependency | Depends on another feature/platform decision |
| ⚪ Later | Intentionally deferred |

### Priority

| Priority | Meaning |
|---|---|
| **P0** | Critical foundation / blocking issue |
| **P1** | High user value; should be built soon |
| **P2** | Meaningful improvement after P1 work |
| **P3** | Nice-to-have / longer-term exploration |

### Scoring

Use the following simple score when adding or reprioritizing features:

- **Value (V): 1–5** — How much does this improve consistency, usefulness, motivation, safety, or ease of use?
- **Frequency (F): 1–3** — How often will the user benefit? 1 = occasional, 2 = weekly, 3 = most workouts/days.
- **Effort (E): 1–5** — Relative implementation effort. 1 = very small, 5 = major architecture/integration.
- **Dependency Risk (D): 0–2** — 0 = self-contained, 1 = moderate dependency, 2 = major external/native dependency.

**Priority Index = (Value × Frequency) ÷ (Effort + Dependency Risk)**

Use the score as a guide, not a mandate. Safety, sequencing, and platform dependencies can override it.

---

## 3. Roadmap

### NOW — Make everyday use dramatically better

**Goal:** Remove friction from starting, adjusting, and completing workouts in the current browser app.

| ID | Feature | Priority | Status | V | F | E | D | Index | Why now |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-001 | Persistent workout + rest timers | P1 | 🟢 Ready | 5 | 3 | 2 | 0 | 7.50 | Core workout-use friction; useful every session |
| NZ-002 | Polished hip-pain + energy controls | P1 | 🟢 Ready | 5 | 3 | 2 | 0 | 7.50 | Readiness drives the entire adaptive experience |
| NZ-003 | Flexible day swap / reschedule | P1 | 🟢 Ready | 5 | 3 | 2 | 0 | 7.50 | Real schedules break rigid weekly plans |
| NZ-004 | Sunday report card | P1 | 🟢 Ready | 5 | 2 | 2 | 0 | 5.00 | Makes progress visible and reinforces consistency |
| NZ-005 | Hip-replacement countdown | P1 | 🟢 Ready | 4 | 3 | 1 | 0 | 12.00 | Very low effort, high motivational visibility |
| NZ-006 | Home-gym equipment inventory UI | P1 | 🟢 Ready | 5 | 2 | 2 | 0 | 5.00 | Foundation for personalized/random workouts |
| NZ-007 | Better mobile/PWA behavior | P1 | 🟡 Define | 5 | 3 | 3 | 0 | 5.00 | App is primarily used like a phone app |

**NOW exit criteria:** Daily workout flow feels polished on mobile; readiness is easy to enter; timers survive navigation; sessions can be moved; weekly progress is immediately understandable.

---

### NEXT — Make NONZERO adaptive and personalized

**Goal:** Turn the app from a fixed program tracker into a smart home-workout coach.

| ID | Feature | Priority | Status | V | F | E | D | Index | Why it matters |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-010 | Random workout generator | P1 | 🔵 Dependency | 5 | 2 | 3 | 1 | 2.50 | High-value variety without decision fatigue |
| NZ-011 | Generator constraints: equipment | P1 | 🔵 Dependency | 5 | 2 | 2 | 1 | 3.33 | Prevents impossible workout recommendations |
| NZ-012 | Generator constraints: hip pain + energy | P1 | 🔵 Dependency | 5 | 3 | 3 | 1 | 3.75 | Makes random workouts safe and relevant |
| NZ-013 | Generator constraints: recent training | P2 | 🟡 Define | 4 | 2 | 3 | 0 | 2.67 | Avoids repeating the same movement patterns |
| NZ-014 | Cardio workout library expansion | P2 | 🟢 Ready | 4 | 2 | 2 | 0 | 4.00 | Adds variety across BikeErg, rower, Airdyne, treadmill |
| NZ-015 | Workout substitution / swap exercise | P1 | 🟡 Define | 5 | 3 | 3 | 0 | 5.00 | Lets user adapt around pain or preference mid-workout |
| NZ-016 | Workout history detail view | P2 | 🟢 Ready | 3 | 2 | 2 | 0 | 3.00 | Makes progress data more useful |
| NZ-017 | Personal bests / trend highlights | P2 | 🟡 Define | 4 | 1 | 2 | 0 | 2.00 | Adds motivation without overcomplicating the UI |
| NZ-018 | Pre-op consistency score | P2 | 🟡 Define | 4 | 2 | 2 | 0 | 4.00 | Measures adherence rather than raw intensity |

**NEXT exit criteria:** NONZERO can generate a safe, equipment-aware workout based on today's readiness and recent activity, while still preserving A/B and planned cardio structure.

---

### LATER — Connected fitness + native iPhone/Apple Watch experience

**Goal:** Reduce duplicate tracking and make NONZERO workouts participate naturally in the Apple/Concept2 ecosystem.

| ID | Feature | Priority | Status | V | F | E | D | Index | Dependency / note |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-020 | PM5 pairing architecture | P2 | 🟡 Define | 4 | 2 | 4 | 1 | 1.60 | Determine browser vs native integration path |
| NZ-021 | Direct PM5 live metric capture | P2 | 🔵 Dependency | 5 | 2 | 4 | 2 | 1.67 | Capture live meters, time, pace/power, calories directly from PM5 where supported |
| NZ-022 | PM5 pairing instructions UX | P2 | 🟢 Ready | 3 | 1 | 1 | 0 | 3.00 | Can improve guidance before full automatic sync exists |
| NZ-023 | HealthKit architecture | P1 | 🟡 Define | 5 | 3 | 5 | 2 | 2.14 | Requires native iOS layer/wrapper |
| NZ-024 | Write completed workouts to Apple Health | P1 | 🔵 Dependency | 5 | 3 | 4 | 2 | 2.50 | Enables centralized workout history |
| NZ-025 | Apple Fitness ring contribution | P1 | 🔵 Dependency | 5 | 3 | 4 | 2 | 2.50 | Depends on properly recorded HealthKit workouts/energy |
| NZ-026 | Launch matching Apple workout | P2 | 🔵 Dependency | 5 | 2 | 5 | 2 | 1.43 | Explore iPhone/Watch supported workflow |
| NZ-027 | Native iPhone shell / wrapper | P1 | 🟡 Define | 5 | 3 | 5 | 1 | 2.50 | Likely prerequisite for deeper HealthKit integration |
| NZ-028 | Apple Watch companion experience | P3 | ⚪ Later | 4 | 2 | 5 | 2 | 1.14 | Longer-term native product evolution |

**LATER exit criteria:** A NONZERO workout can be initiated and recorded with minimal duplicate entry, with HealthKit/Apple Fitness participation and useful PM5 metrics where technically feasible.

---

## 4. Master Backlog

### Implemented baseline

These are already present in `index.html` and should not be re-added as backlog items unless they are being materially redesigned.

- [x] Today / Week / Progress / Settings tabs
- [x] Hip-pain input
- [x] Energy input
- [x] FULL / MINIMUM / FLARE modes
- [x] Strength A — Upper + Hinge
- [x] Strength B — Prehab + Upper
- [x] BikeErg aerobic sessions
- [x] Long BikeErg session
- [x] Recovery session
- [x] Exercise completion checklist
- [x] Finish & save workout
- [x] Weekly summary
- [x] Total starts / strength sessions / BikeErg minutes
- [x] Recent-session history
- [x] Program start date
- [x] Reminder-time setting
- [x] Export / import progress
- [x] Reset progress
- [x] LocalStorage persistence (`hipPrehabV2`)
- [x] **NZ-008 — Native 4K UHD Wall Mode (`/wall/`)**
- [x] **NZ-009 — Lightweight shared cloud state (Cloudflare Worker + KV)**
- [x] In-progress workout/readiness synchronization from phone to wall
- [x] **NZ-033 — Workout restart + timer clear controls**
- [x] **NZ-034 — Robust post-workout metrics capture**
- [x] **NZ-035 — Concept2 Logbook completed-workout bridge**
- [x] Wall Mode read-only polling to avoid cross-device write conflicts
- [x] Offline-first phone behavior with cloud fallback/recovery
- [x] **NZ-036 — Zero-hardware Wall home behavior / faster active sync**
- [x] **NZ-037 — Native Roku Wall + screensaver client**

### Active backlog

| ID | Feature | Area | Priority | Status | Target | Notes / acceptance signal |
|---|---|---|---:|---|---|---|
| NZ-001 | Persistent workout + rest timers | Workout UX | P1 | 🟢 Ready | NOW | Timer persists across tabs/navigation and supports pause/reset |
| NZ-002 | Polished pain + energy inputs | Readiness | P1 | 🟢 Ready | NOW | Fast thumb-friendly controls; current values always obvious |
| NZ-003 | Day swap / flexible scheduling | Planning | P1 | 🟢 Ready | NOW | Move today's workout without corrupting weekly tracking |
| NZ-004 | Sunday report card | Progress | P1 | 🟢 Ready | NOW | Weekly adherence, starts, mode mix, strength/cardio, encouragement |
| NZ-005 | Hip-replacement countdown | Motivation | P1 | 🟢 Ready | NOW | Configurable date; days remaining shown without overwhelming UI |
| NZ-006 | Equipment inventory UI | Personalization | P1 | 🟢 Ready | NOW | User can enable/disable owned equipment and changes persist |
| NZ-007 | Mobile/PWA polish | Platform | P1 | 🟡 Define | NOW | Installable feel, safe areas, touch targets, persistent app state |
| NZ-033 | Workout restart + clear-timer controls | Workout UX | P1 | ✅ Done | NOW | Restart clears today’s checkoffs/timer; Clear timer resets only elapsed time |
| NZ-034 | Robust post-workout metrics | Progress | P1 | ✅ Done | NOW | Save duration, RPE, post-pain/energy, erg metrics, HR and notes |
| NZ-035 | Concept2 Logbook result bridge | Integration | P1 | ✅ Done | NOW | Import latest ErgData-synced Concept2 result through Worker without exposing token to browser |
| NZ-029 | Optional external kiosk watchdog | Wall / Platform | P3 | ⚪ Later | LATER | Only needed if a future dedicated display host replaces native Roku/web clients |
| NZ-036 | Zero-hardware Wall home + active sync | Wall / Platform | P1 | ✅ Done | NOW | Wall remains a read-only shared-state display and refreshes automatically during active workouts |
| NZ-037 | Native Roku Wall + screensaver | Wall / Platform | P1 | ✅ Done | NOW | Native Roku SceneGraph client renders shared state as app + selectable screensaver; Home remains Roku-controlled |
| NZ-038 | Roku foreground automation experiment | Wall / Platform | P3 | 🟡 Define | LATER | Explore supported local-launch/deep-link paths without forcibly interrupting media or relying on unsupported hacks |
| NZ-030 | Live PM5 telemetry on Wall Mode | Wall / Integration | P2 | 🔵 Dependency | LATER | Active Concept2 workout can surface live time, pace/power, meters and calories on the 4K wall |
| NZ-031 | Wall ambient rotation / milestone scenes | Wall / Motivation | P2 | 🟡 Define | NEXT | Idle wall rotates restrained motivational/progress scenes without becoming visually noisy |
| NZ-032 | Cloud state conflict/version hardening | Platform | P2 | 🟡 Define | NEXT | State API supports revision/ETag semantics before any second writable client is introduced |
| NZ-010 | Random workout generator | Workout engine | P1 | 🔵 Dependency | NEXT | Generates viable workout from enabled equipment/readiness |
| NZ-011 | Equipment constraints | Workout engine | P1 | 🔵 Dependency | NEXT | Generator never prescribes unavailable equipment |
| NZ-012 | Pain + energy constraints | Workout engine | P1 | 🔵 Dependency | NEXT | FLARE/low-energy states materially change generated workout |
| NZ-013 | Recent-training constraints | Workout engine | P2 | 🟡 Define | NEXT | Avoid undesirable repetition within defined recovery window |
| NZ-014 | Expanded cardio library | Programming | P2 | 🟢 Ready | NEXT | Adds safe options for BikeErg, rower, Airdyne, Peloton Tread |
| NZ-015 | Exercise substitution | Workout UX | P1 | 🟡 Define | NEXT | Swap an exercise while preserving workout intent and hip constraints |
| NZ-016 | Workout history details | Progress | P2 | 🟢 Ready | NEXT | Open a past session and see completed work / mode / metrics |
| NZ-017 | Trend highlights / PBs | Progress | P2 | 🟡 Define | NEXT | Positive progress surfaced without encouraging unsafe intensity |
| NZ-018 | Pre-op consistency score | Progress | P2 | 🟡 Define | NEXT | Rewards adherence and appropriate adaptation |
| NZ-020 | PM5 pairing architecture | Integration | P2 | 🟡 Define | LATER | Technical spike documents viable connection approach |
| NZ-021 | Direct PM5 live metric capture | Integration | P2 | 🔵 Dependency | LATER | Stream useful live erg metrics directly from PM5; completed Logbook imports are already handled by NZ-035 |
| NZ-022 | PM5 pairing instructions | Integration | P2 | 🟢 Ready | LATER | Clear step-by-step pairing help available in app |
| NZ-023 | HealthKit architecture | Integration | P1 | 🟡 Define | LATER | Choose native wrapper/app approach and data model |
| NZ-024 | Apple Health workout writes | Integration | P1 | 🔵 Dependency | LATER | Completed NONZERO sessions appear correctly in Apple Health |
| NZ-025 | Apple Fitness rings | Integration | P1 | 🔵 Dependency | LATER | Eligible workout activity contributes through supported HealthKit path |
| NZ-026 | Matching Apple workout launch | Integration | P2 | 🔵 Dependency | LATER | Minimize manual work to start corresponding workout on Apple devices |
| NZ-027 | Native iPhone shell/wrapper | Platform | P1 | 🟡 Define | LATER | Native layer supports HealthKit while preserving NONZERO UX |
| NZ-028 | Apple Watch companion | Platform | P3 | ⚪ Later | LATER | Watch-first controls only after iPhone/native foundations are stable |

---

## 5. Quick Add — New Feature Intake

### Fastest possible method

Add a single row to the **Inbox** table below. Do not worry about perfect scoring at capture time.

| ID | Idea | Why / problem | Requested | Decision |
|---|---|---|---|---|
| NZ-INBOX-001 | _Add idea here_ | _What friction or opportunity does it address?_ | YYYY-MM-DD | Untriaged |

### Triage when ready

For any idea worth pursuing:

1. Give it the next permanent `NZ-###` ID.
2. Assign an **Area**.
3. Score **Value, Frequency, Effort, Dependency Risk**.
4. Calculate the **Priority Index**.
5. Set **P0–P3** and **NOW / NEXT / LATER**.
6. Add one sentence describing the acceptance signal.
7. Move it from Inbox into the Active Backlog.

### Copy/paste feature card

```md
### NZ-### — Feature name

- **Problem:**
- **User value:**
- **Area:** Workout UX / Readiness / Planning / Progress / Programming / Personalization / Integration / Platform
- **Priority:** P0 / P1 / P2 / P3
- **Status:** ✅ Done / 🟢 Ready / 🟡 Define / 🔵 Dependency / ⚪ Later
- **Target:** NOW / NEXT / LATER
- **Value (1–5):**
- **Frequency (1–3):**
- **Effort (1–5):**
- **Dependency Risk (0–2):**
- **Priority Index:**
- **Dependencies:**
- **Acceptance criteria:**
  - [ ]
- **Notes:**
```

---

## 6. Bugs / Friction Log

Use this for problems that should not get lost inside the feature backlog.

| ID | Issue | Severity | Status | Related feature | Notes |
|---|---|---|---|---|---|
| BUG-001 | _Add issue_ | High / Medium / Low | New | NZ-### | |

**Bug priority rule:** A bug that prevents starting, recording, completing, or recovering a workout can override roadmap scoring and become P0/P1.

---

## 7. Decisions Log

Keep durable product decisions here so future development does not accidentally reverse them.

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-23 | `index.html` transfer artifact is the current implementation baseline | Separates recovered implementation from requested roadmap features |
| 2026-08-23 | FULL / MINIMUM / FLARE remain core | Preserves consistency across variable pain and energy |
| 2026-08-23 | A/B strength structure remains | Keeps strength programming simple and familiar |
| 2026-08-23 | Hip-friendly programming takes precedence over intensity | Pre-op usability and safety are central to product value |
| 2026-08-23 | Equipment inventory becomes a personalization foundation | Needed for viable workout generation and substitutions |
| 2026-08-23 | Browser app continues improving while native integrations are designed | HealthKit requirements should not stall core product development |
| 2026-08-23 | Product prioritization should emphasize value and frequency relative to effort | Enables fast, transparent reprioritization |
| 2026-08-28 | Promote NONZERO v3.0 as the implementation baseline | Adds native 4K Wall Mode and shared phone/wall state |
| 2026-08-28 | Promote NONZERO v3.1 as the implementation baseline | Adds richer in-workout controls, post-workout metrics, and Concept2 result import |
| 2026-08-28 | Use Concept2 Online Logbook API as the completed-workout bridge | ErgData already syncs to Logbook; Worker keeps Concept2 token out of the browser while direct PM5 remains the live-telemetry path |
| 2026-08-28 | Use local-first Cloudflare Worker + KV for lightweight shared state | Keeps the phone functional offline while avoiding a home server or full database stack |
| 2026-08-28 | Keep Wall Mode read-only initially | Eliminates avoidable multi-writer merge conflicts while the phone remains the workout control surface |
| 2026-08-29 | Native Roku becomes preferred garage Wall client | Uses existing TV hardware; native app + screensaver consume the same read-only cloud state with no Pi/mini-PC dependency |
| 2026-08-29 | Do not attempt to replace Roku system Home | Roku Home remains OS-controlled; NONZERO acts as the practical landing screen and idle screensaver |

---

## 8. Release Planning

### Shipped — v3.0 · 4K Wall + Shared State (2026-08-28)

- NZ-008 Native 4K UHD Wall Mode — ✅ Done
- NZ-009 Lightweight Cloudflare Worker/KV shared state — ✅ Done
- Live in-progress phone → wall synchronization — ✅ Done
- Offline-first phone persistence and cloud recovery — ✅ Done

**Release objective:** Turn NONZERO from a single-device workout page into a two-surface training system: phone as the control surface, garage TV as the persistent motivational/performance display.

### Suggested next release — UX + Momentum

Recommended scope:

- NZ-001 Persistent timers
- NZ-002 Polished hip-pain + energy controls
- NZ-003 Day swap / flexible scheduling
- NZ-004 Sunday report card
- NZ-005 Hip-replacement countdown
- NZ-006 Equipment inventory UI

**Release objective:** Make NONZERO noticeably easier and more motivating to use every day before adding deeper integrations.

### Following release — Adaptive Coach

Recommended scope:

- NZ-010 Random workout generator
- NZ-011 Equipment constraints
- NZ-012 Pain + energy constraints
- NZ-014 Expanded cardio library
- NZ-015 Exercise substitutions

**Release objective:** Let the app answer: **“Given how I feel and what I have available, what should I do right now?”**

---

## 9. Definition of Done

A feature is not "done" just because the UI exists. Unless explicitly waived, it should:

- [ ] Work on mobile-sized screens
- [ ] If Wall Mode is affected, render correctly at 3840×2160 / 16:9 and remain readable at garage viewing distance
- [ ] Preserve existing saved progress
- [ ] Persist appropriately across refresh/reopen
- [ ] Respect FULL / MINIMUM / FLARE where relevant
- [ ] Respect hip-friendly programming rules
- [ ] Avoid requiring unavailable equipment
- [ ] Have a clear empty/error state
- [ ] Avoid breaking export/import compatibility
- [ ] Be reflected in `CHANGELOG.md`
- [ ] Be promoted from backlog status to ✅ Done

---

## 10. Maintenance Rule

After each meaningful development session:

1. Update feature statuses in this file.
2. Add newly discovered ideas to the Inbox immediately.
3. Add bugs to the Friction Log immediately.
4. Record durable product decisions in the Decisions Log.
5. Re-score only when scope/value materially changes — do not waste time continuously re-ranking stable items.
6. Update `CHANGELOG.md` when implementation changes.

This file is the **product-planning source of truth**. `README.md` describes the product; `CHANGELOG.md` describes what changed; `ROADMAP.md` describes what should happen next and why.
