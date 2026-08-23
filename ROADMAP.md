# NONZERO Fitness App — Product Roadmap & Backlog

> **AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.**  
> Edit `BACKLOG.json`, then run `npm run roadmap`. GitHub Actions will also rebuild this file automatically when the backlog changes.
>
> **Baseline:** `NONZERO v0.7.0 — restored from hip-prehab v7 on 2026-08-23` from 2026-08-23 is the current implemented app unless a newer version is explicitly promoted to baseline.

---

## 1. Product North Star

**Make it easier to start, complete, and sustain the right workout for today — even when hip pain, energy, schedule, or motivation are working against the user.**

### Core principles

1. Starting counts. A MINIMUM or FLARE session is still a win.
2. Hip-friendly first. Never force painful hip range of motion or reward pushing through joint pain.
3. Low decision friction. The app should tell the user what to do next.
4. Equipment-aware. Recommendations should reflect what is actually available in the home gym.
5. Adaptive, not random-for-random's-sake. Pain, energy, recent training, equipment, and schedule should influence workout selection.
6. Progress should feel motivating. Weekly reporting, streaks, countdowns, and completed work should reinforce momentum.
7. Native integrations should add value, not block the web app.

---

## 2. Dynamic Prioritization

**Priority Index = (Value × Frequency) ÷ (Effort + Dependency Risk)**

- **Value (1–5):** improvement to consistency, usefulness, motivation, safety, or ease of use.
- **Frequency (1–3):** 1 = occasional, 2 = weekly, 3 = most workouts/days.
- **Effort (1–5):** relative implementation effort.
- **Dependency Risk (0–2):** 0 = self-contained, 1 = moderate dependency, 2 = major native/external dependency.
- **Strategic priority:** can override raw score for safety, sequencing, or foundation work.

Changing those values in `BACKLOG.json` automatically changes the score and sort order when the roadmap is rebuilt.

---

## 3. Roadmap

### NOW — Make everyday use dramatically better

| ID | Feature | Priority | Status | V | F | E | D | Index | Why now |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-001 | Add dedicated rest timer to persistent workout timer | P1 | 🟢 Ready | 5 | 3 | 1 | 0 | 15.00 | v7 already has a persistent workout timer; add quick rest intervals without losing session state |
| NZ-006 | Make home-gym inventory user-toggleable | P1 | 🟢 Ready | 5 | 2 | 2 | 0 | 5.00 | v7 displays the full inventory; toggles make personalization and random generation truly equipment-aware |
| NZ-007 | Further mobile/PWA polish beyond v7 baseline | P1 | 🟢 Ready | 5 | 3 | 3 | 0 | 5.00 | v7 is already installable/PWA-capable; remaining work is iPhone polish, caching/update UX and touch refinement |

### NEXT — Make NONZERO adaptive and personalized

| ID | Feature | Priority | Status | V | F | E | D | Index | Why it matters |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-015 | Workout substitution / swap exercise | P1 | 🟡 Define | 5 | 3 | 3 | 0 | 5.00 | Lets user adapt around pain or preference mid-workout |
| NZ-014 | Cardio workout library expansion | P2 | 🟢 Ready | 4 | 2 | 2 | 0 | 4.00 | Adds variety across BikeErg, rower, Airdyne, treadmill |
| NZ-012 | Random generator constraint: hip pain + energy | P1 | 🟢 Ready | 5 | 3 | 3 | 1 | 3.75 | v7 adapts random workouts for severe pain; extend logic to energy and finer readiness bands |
| NZ-011 | Random generator constraint: enabled equipment | P1 | 🔵 Dependency | 5 | 2 | 2 | 1 | 3.33 | v7 random generation uses safe pools; next step is filtering those pools by user-enabled inventory |
| NZ-016 | Workout history detail view | P2 | 🟢 Ready | 3 | 2 | 2 | 0 | 3.00 | Makes progress data more useful |
| NZ-013 | Generator constraints: recent training | P2 | 🟡 Define | 4 | 2 | 3 | 0 | 2.67 | Avoids repeating the same movement patterns |

### LATER — Connected fitness + native experience

| ID | Feature | Priority | Status | V | F | E | D | Index | Dependency / rationale |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-024 | Write completed workouts to Apple Health | P1 | 🔵 Dependency | 5 | 3 | 4 | 2 | 2.50 | Enables centralized workout history |
| NZ-025 | Apple Fitness ring contribution | P1 | 🔵 Dependency | 5 | 3 | 4 | 2 | 2.50 | Depends on properly recorded HealthKit workouts/energy |
| NZ-027 | Native iPhone shell / wrapper | P1 | 🟡 Define | 5 | 3 | 5 | 1 | 2.50 | Likely prerequisite for deeper HealthKit integration |
| NZ-023 | Native HealthKit architecture and migration layer | P1 | 🟡 Define | 5 | 3 | 5 | 2 | 2.14 | v7 intentionally stores HealthKit-ready workout fields; native entitlement/write architecture remains future work |
| NZ-021 | Automate PM5 metric capture beyond manual/experimental v7 capture | P2 | 🔵 Dependency | 5 | 2 | 4 | 2 | 1.67 | v7 supports manual ErgData metrics and experimental live FTMS; automate reliable capture where platform permits |
| NZ-020 | Harden PM5 pairing architecture beyond experimental v7 path | P2 | 🟡 Define | 4 | 2 | 4 | 1 | 1.60 | v7 contains browser FTMS experimentation and iPhone ErgData guidance; production-grade integration still needs architecture work |
| NZ-026 | Launch matching Apple workout | P2 | 🔵 Dependency | 5 | 2 | 5 | 2 | 1.43 | Explore iPhone/Watch supported workflow |
| NZ-028 | Apple Watch companion experience | P3 | ⚪ Later | 4 | 2 | 5 | 2 | 1.14 | Longer-term native product evolution |

---

## 4. Recommended Build Order

1. **NZ-001 — Add dedicated rest timer to persistent workout timer** — score 15.00; Workout timer remains persistent and user can launch/pause/reset common rest intervals during strength work
2. **NZ-006 — Make home-gym inventory user-toggleable** — score 5.00; User can enable/disable owned or currently available equipment; choices persist and feed workout generation
3. **NZ-007 — Further mobile/PWA polish beyond v7 baseline** — score 5.00; Installable feel, safe areas, touch targets, persistent app state

---

## 5. Master Backlog

### Implemented baseline

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
- [x] Wheel-style hip-pain and energy readiness controls (recovered v7)
- [x] Choose-another-day workout selection / flexible session substitution (recovered v7)
- [x] Sunday report card with week-over-week observations (recovered v7)
- [x] Configurable hip-replacement countdown and preparation phases (recovered v7)
- [x] Hip-aware random workout generator with time and emphasis controls (recovered v7)
- [x] Pre-op personal records and progress highlights (recovered v7)
- [x] Per-session prehab score plus average prehab score (recovered v7)
- [x] PM5 / ErgData connection instructions with experimental browser Bluetooth path (recovered v7)
- [x] Persistent active workout timer with visibility/pagehide persistence (recovered v7)
- [x] Live workout metrics panel including active time, meters, watts, calories, stress-busted score and prehab score (recovered v7)
- [x] Post-workout hip and effort reflection capture (recovered v7)
- [x] Milestone tracking (recovered v7)
- [x] PWA manifest, service worker and iOS Home Screen metadata
- [x] NONZERO black/gold branding and app-icon assets

### Active backlog

| ID | Feature | Area | Priority | Status | Target | Score | Acceptance signal |
|---|---|---|---:|---|---|---:|---|
| NZ-001 | Add dedicated rest timer to persistent workout timer | Workout UX | P1 | 🟢 Ready | NOW | 15.00 | Workout timer remains persistent and user can launch/pause/reset common rest intervals during strength work |
| NZ-006 | Make home-gym inventory user-toggleable | Personalization | P1 | 🟢 Ready | NOW | 5.00 | User can enable/disable owned or currently available equipment; choices persist and feed workout generation |
| NZ-007 | Further mobile/PWA polish beyond v7 baseline | Platform | P1 | 🟢 Ready | NOW | 5.00 | Installable feel, safe areas, touch targets, persistent app state |
| NZ-015 | Workout substitution / swap exercise | Workout UX | P1 | 🟡 Define | NEXT | 5.00 | Swap an exercise while preserving workout intent and hip constraints |
| NZ-014 | Cardio workout library expansion | Programming | P2 | 🟢 Ready | NEXT | 4.00 | Adds safe options for BikeErg, rower, Airdyne, Peloton Tread |
| NZ-012 | Random generator constraint: hip pain + energy | Workout engine | P1 | 🟢 Ready | NEXT | 3.75 | FLARE/low-energy states materially change generated workout |
| NZ-011 | Random generator constraint: enabled equipment | Workout engine | P1 | 🔵 Dependency | NEXT | 3.33 | Generator never prescribes unavailable equipment |
| NZ-016 | Workout history detail view | Progress | P2 | 🟢 Ready | NEXT | 3.00 | Open a past session and see completed work / mode / metrics |
| NZ-013 | Generator constraints: recent training | Workout engine | P2 | 🟡 Define | NEXT | 2.67 | Avoid undesirable repetition within defined recovery window |
| NZ-024 | Write completed workouts to Apple Health | Integration | P1 | 🔵 Dependency | LATER | 2.50 | Completed NONZERO sessions appear correctly in Apple Health |
| NZ-025 | Apple Fitness ring contribution | Integration | P1 | 🔵 Dependency | LATER | 2.50 | Eligible workout activity contributes through supported HealthKit path |
| NZ-027 | Native iPhone shell / wrapper | Platform | P1 | 🟡 Define | LATER | 2.50 | Native layer supports HealthKit while preserving NONZERO UX |
| NZ-023 | Native HealthKit architecture and migration layer | Integration | P1 | 🟡 Define | LATER | 2.14 | Choose native wrapper/app approach and data model |
| NZ-021 | Automate PM5 metric capture beyond manual/experimental v7 capture | Integration | P2 | 🔵 Dependency | LATER | 1.67 | Save useful erg metrics into NONZERO workout history |
| NZ-020 | Harden PM5 pairing architecture beyond experimental v7 path | Integration | P2 | 🟡 Define | LATER | 1.60 | Technical spike documents viable connection approach |
| NZ-026 | Launch matching Apple workout | Integration | P2 | 🔵 Dependency | LATER | 1.43 | Minimize manual work to start corresponding workout on Apple devices |
| NZ-028 | Apple Watch companion experience | Platform | P3 | ⚪ Later | LATER | 1.14 | Watch-first controls only after iPhone/native foundations are stable |

---

## 6. Idea Inbox

| ID | Idea | Why / problem | Requested | Decision |
| --- | --- | --- | --- | --- |
| NZ-INBOX-001 | Add idea here | What friction or opportunity does it address? | 2026-08-23 | Untriaged |

### Fast feature entry

Add an object under `features` in `BACKLOG.json`:

```json
{
  "id": "NZ-###",
  "feature": "Feature name",
  "area": "Workout UX",
  "status": "Ready",
  "target": "NOW",
  "value": 5,
  "frequency": 3,
  "effort": 2,
  "dependency_risk": 0,
  "strategic_priority": "P1",
  "why": "One-sentence reason this matters.",
  "acceptance": "One-sentence signal that tells us it is done."
}
```

Then run `npm run roadmap`.

---

## 7. Bugs / Friction Log

| ID | Issue | Severity | Status | Related feature | Notes |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Add issue here | Medium | New |  |  |

**Bug override:** anything preventing workout start, recording, completion, or recovery can be promoted above scored feature work.

---

## 8. Product Decisions

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-08-23 | index.html transfer artifact is the current implementation baseline | Separates recovered implementation from requested roadmap features |
| 2026-08-23 | FULL / MINIMUM / FLARE remain core | Preserves consistency across variable pain and energy |
| 2026-08-23 | A/B strength structure remains | Keeps strength programming simple and familiar |
| 2026-08-23 | Hip-friendly programming takes precedence over intensity | Pre-op usability and safety are central to product value |
| 2026-08-23 | Equipment inventory becomes a personalization foundation | Needed for viable workout generation and substitutions |
| 2026-08-23 | Browser app continues improving while native integrations are designed | HealthKit requirements should not stall core product development |
| 2026-08-23 | Product prioritization should emphasize value and frequency relative to effort | Enables fast, transparent reprioritization |

---

## 9. Conversational Maintenance

You can describe backlog changes naturally, for example:

- “Add a warm-up generator. Value 4, frequency 3, effort 2, no dependencies. Put it in NOW.”
- “Move PM5 metric capture to NEXT and raise its value to 5.”
- “Make exercise substitution the highest priority.”
- “Add this bug: timer resets when I change tabs.”
- “Reprioritize the backlog for maximum daily-use value.”

The source-of-truth change belongs in `BACKLOG.json`; after regeneration, `ROADMAP.md` reflects the recalculated scores and ordering.

---

_Generated by `scripts/build-roadmap.js` from `BACKLOG.json`._
