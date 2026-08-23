# NONZERO Fitness App — Product Roadmap & Backlog

> **AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.**  
> Edit `BACKLOG.json`, then run `npm run roadmap`. GitHub Actions will also rebuild this file automatically when the backlog changes.
>
> **Baseline:** `index.html` from 2026-08-23 is the current implemented app unless a newer version is explicitly promoted to baseline.

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
| NZ-005 | Hip-replacement countdown | P1 | 🟢 Ready | 4 | 3 | 1 | 0 | 12.00 | Very low effort, high motivational visibility |
| NZ-001 | Persistent workout + rest timers | P1 | 🟢 Ready | 5 | 3 | 2 | 0 | 7.50 | Core workout-use friction; useful every session |
| NZ-002 | Polished hip-pain + energy controls | P1 | 🟢 Ready | 5 | 3 | 2 | 0 | 7.50 | Readiness drives the entire adaptive experience |
| NZ-003 | Flexible day swap / reschedule | P1 | 🟢 Ready | 5 | 3 | 2 | 0 | 7.50 | Real schedules break rigid weekly plans |
| NZ-004 | Sunday report card | P1 | 🟢 Ready | 5 | 2 | 2 | 0 | 5.00 | Makes progress visible and reinforces consistency |
| NZ-006 | Home-gym equipment inventory UI | P1 | 🟢 Ready | 5 | 2 | 2 | 0 | 5.00 | Foundation for personalized/random workouts |
| NZ-007 | Better mobile/PWA behavior | P1 | 🟡 Define | 5 | 3 | 3 | 0 | 5.00 | App is primarily used like a phone app |

### NEXT — Make NONZERO adaptive and personalized

| ID | Feature | Priority | Status | V | F | E | D | Index | Why it matters |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-015 | Workout substitution / swap exercise | P1 | 🟡 Define | 5 | 3 | 3 | 0 | 5.00 | Lets user adapt around pain or preference mid-workout |
| NZ-014 | Cardio workout library expansion | P2 | 🟢 Ready | 4 | 2 | 2 | 0 | 4.00 | Adds variety across BikeErg, rower, Airdyne, treadmill |
| NZ-018 | Pre-op consistency score | P2 | 🟡 Define | 4 | 2 | 2 | 0 | 4.00 | Measures adherence rather than raw intensity |
| NZ-012 | Generator constraints: hip pain + energy | P1 | 🔵 Dependency | 5 | 3 | 3 | 1 | 3.75 | Makes random workouts safe and relevant |
| NZ-011 | Generator constraints: equipment | P1 | 🔵 Dependency | 5 | 2 | 2 | 1 | 3.33 | Prevents impossible workout recommendations |
| NZ-016 | Workout history detail view | P2 | 🟢 Ready | 3 | 2 | 2 | 0 | 3.00 | Makes progress data more useful |
| NZ-013 | Generator constraints: recent training | P2 | 🟡 Define | 4 | 2 | 3 | 0 | 2.67 | Avoids repeating the same movement patterns |
| NZ-010 | Random workout generator | P1 | 🔵 Dependency | 5 | 2 | 3 | 1 | 2.50 | High-value variety without decision fatigue |
| NZ-017 | Personal bests / trend highlights | P2 | 🟡 Define | 4 | 1 | 2 | 0 | 2.00 | Adds motivation without overcomplicating the UI |

### LATER — Connected fitness + native experience

| ID | Feature | Priority | Status | V | F | E | D | Index | Dependency / rationale |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| NZ-022 | PM5 pairing instructions UX | P2 | 🟢 Ready | 3 | 1 | 1 | 0 | 3.00 | Can improve guidance before full automatic sync exists |
| NZ-024 | Write completed workouts to Apple Health | P1 | 🔵 Dependency | 5 | 3 | 4 | 2 | 2.50 | Enables centralized workout history |
| NZ-025 | Apple Fitness ring contribution | P1 | 🔵 Dependency | 5 | 3 | 4 | 2 | 2.50 | Depends on properly recorded HealthKit workouts/energy |
| NZ-027 | Native iPhone shell / wrapper | P1 | 🟡 Define | 5 | 3 | 5 | 1 | 2.50 | Likely prerequisite for deeper HealthKit integration |
| NZ-023 | HealthKit architecture | P1 | 🟡 Define | 5 | 3 | 5 | 2 | 2.14 | Requires native iOS layer/wrapper |
| NZ-021 | PM5 metric capture | P2 | 🔵 Dependency | 5 | 2 | 4 | 2 | 1.67 | Capture meters, time, pace/power, calories where supported |
| NZ-020 | PM5 pairing architecture | P2 | 🟡 Define | 4 | 2 | 4 | 1 | 1.60 | Determine browser vs native integration path |
| NZ-026 | Launch matching Apple workout | P2 | 🔵 Dependency | 5 | 2 | 5 | 2 | 1.43 | Explore iPhone/Watch supported workflow |
| NZ-028 | Apple Watch companion experience | P3 | ⚪ Later | 4 | 2 | 5 | 2 | 1.14 | Longer-term native product evolution |

---

## 4. Recommended Build Order

1. **NZ-005 — Hip-replacement countdown** — score 12.00; Configurable date; days remaining shown without overwhelming UI
2. **NZ-001 — Persistent workout + rest timers** — score 7.50; Timer persists across tabs/navigation and supports pause/reset
3. **NZ-002 — Polished hip-pain + energy controls** — score 7.50; Fast thumb-friendly controls; current values always obvious
4. **NZ-003 — Flexible day swap / reschedule** — score 7.50; Move today's workout without corrupting weekly tracking
5. **NZ-004 — Sunday report card** — score 5.00; Weekly adherence, starts, mode mix, strength/cardio, encouragement
6. **NZ-006 — Home-gym equipment inventory UI** — score 5.00; User can enable/disable owned equipment and changes persist

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

### Active backlog

| ID | Feature | Area | Priority | Status | Target | Score | Acceptance signal |
|---|---|---|---:|---|---|---:|---|
| NZ-005 | Hip-replacement countdown | Motivation | P1 | 🟢 Ready | NOW | 12.00 | Configurable date; days remaining shown without overwhelming UI |
| NZ-001 | Persistent workout + rest timers | Workout UX | P1 | 🟢 Ready | NOW | 7.50 | Timer persists across tabs/navigation and supports pause/reset |
| NZ-002 | Polished hip-pain + energy controls | Readiness | P1 | 🟢 Ready | NOW | 7.50 | Fast thumb-friendly controls; current values always obvious |
| NZ-003 | Flexible day swap / reschedule | Planning | P1 | 🟢 Ready | NOW | 7.50 | Move today's workout without corrupting weekly tracking |
| NZ-004 | Sunday report card | Progress | P1 | 🟢 Ready | NOW | 5.00 | Weekly adherence, starts, mode mix, strength/cardio, encouragement |
| NZ-006 | Home-gym equipment inventory UI | Personalization | P1 | 🟢 Ready | NOW | 5.00 | User can enable/disable owned equipment and changes persist |
| NZ-007 | Better mobile/PWA behavior | Platform | P1 | 🟡 Define | NOW | 5.00 | Installable feel, safe areas, touch targets, persistent app state |
| NZ-015 | Workout substitution / swap exercise | Workout UX | P1 | 🟡 Define | NEXT | 5.00 | Swap an exercise while preserving workout intent and hip constraints |
| NZ-014 | Cardio workout library expansion | Programming | P2 | 🟢 Ready | NEXT | 4.00 | Adds safe options for BikeErg, rower, Airdyne, Peloton Tread |
| NZ-018 | Pre-op consistency score | Progress | P2 | 🟡 Define | NEXT | 4.00 | Rewards adherence and appropriate adaptation |
| NZ-012 | Generator constraints: hip pain + energy | Workout engine | P1 | 🔵 Dependency | NEXT | 3.75 | FLARE/low-energy states materially change generated workout |
| NZ-011 | Generator constraints: equipment | Workout engine | P1 | 🔵 Dependency | NEXT | 3.33 | Generator never prescribes unavailable equipment |
| NZ-016 | Workout history detail view | Progress | P2 | 🟢 Ready | NEXT | 3.00 | Open a past session and see completed work / mode / metrics |
| NZ-013 | Generator constraints: recent training | Workout engine | P2 | 🟡 Define | NEXT | 2.67 | Avoid undesirable repetition within defined recovery window |
| NZ-010 | Random workout generator | Workout engine | P1 | 🔵 Dependency | NEXT | 2.50 | Generates viable workout from enabled equipment/readiness |
| NZ-017 | Personal bests / trend highlights | Progress | P2 | 🟡 Define | NEXT | 2.00 | Positive progress surfaced without encouraging unsafe intensity |
| NZ-022 | PM5 pairing instructions UX | Integration | P2 | 🟢 Ready | LATER | 3.00 | Clear step-by-step pairing help available in app |
| NZ-024 | Write completed workouts to Apple Health | Integration | P1 | 🔵 Dependency | LATER | 2.50 | Completed NONZERO sessions appear correctly in Apple Health |
| NZ-025 | Apple Fitness ring contribution | Integration | P1 | 🔵 Dependency | LATER | 2.50 | Eligible workout activity contributes through supported HealthKit path |
| NZ-027 | Native iPhone shell / wrapper | Platform | P1 | 🟡 Define | LATER | 2.50 | Native layer supports HealthKit while preserving NONZERO UX |
| NZ-023 | HealthKit architecture | Integration | P1 | 🟡 Define | LATER | 2.14 | Choose native wrapper/app approach and data model |
| NZ-021 | PM5 metric capture | Integration | P2 | 🔵 Dependency | LATER | 1.67 | Save useful erg metrics into NONZERO workout history |
| NZ-020 | PM5 pairing architecture | Integration | P2 | 🟡 Define | LATER | 1.60 | Technical spike documents viable connection approach |
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
