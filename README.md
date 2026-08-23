# NONZERO Fitness App

This repository is the **single authoritative source of truth** for the current NONZERO home-fitness / hip-prehab app and its product-development roadmap.

## What is live today

`index.html` is the current implemented application baseline. It is a dependency-free browser app with local persistence and can be opened directly or hosted with GitHub Pages.

Implemented baseline:
- Today / Week / Progress / Settings tabs
- Hip-pain and energy inputs
- FULL / MINIMUM / FLARE modes
- Strength A — Upper + Hinge
- Strength B — Prehab + Upper
- BikeErg aerobic and long sessions
- Recovery session
- Exercise completion tracking
- Finish/save workout
- Weekly summary and recent-session history
- Program start date and reminder settings
- Export/import/reset progress
- LocalStorage persistence using `hipPrehabV2`

## Product directions preserved in the backlog

The repository retains the current development direction for:
- Home-gym equipment inventory
- Hip-friendly programming
- A/B strength workouts
- Cardio library
- Random/adaptive workout generator
- Persistent workout/rest timers
- Polished pain and energy controls
- Sunday report card
- Hip-replacement countdown
- PM5 integration concepts
- Apple Health / HealthKit integration
- Workout launching on Apple devices
- Apple Fitness ring contribution
- Flexible day swapping / rescheduling

## Dynamic roadmap system

The roadmap is generated, not hand-maintained.

- `BACKLOG.json` — **product-planning source of truth**
- `ROADMAP.md` — generated, human-readable roadmap; do not edit manually
- `scripts/build-roadmap.js` — recalculates scores, sorts priorities, and regenerates the roadmap
- `scripts/validate-backlog.js` — validates backlog structure and scoring inputs
- `.github/workflows/roadmap.yml` — automatically rebuilds and commits the roadmap when backlog inputs change
- `.github/workflows/quality.yml` — validates backlog + generated roadmap on pushes and pull requests

Priority formula:

```text
Priority Index = (Value × Frequency) / (Effort + Dependency Risk)
```

### Update the roadmap locally

```bash
npm run roadmap
npm test
```

### Update it conversationally

A natural-language request such as:

> Add automatic warm-up selection. High value, used most workouts, low-to-medium effort, no dependency. Put it in NOW.

should be translated into a structured change to `BACKLOG.json`. Once the backlog is committed, GitHub automatically regenerates `ROADMAP.md`.

## GitHub Pages

A Pages deployment workflow is included at `.github/workflows/pages.yml`.

For a new repository:
1. Upload this repository with the files at the repository root.
2. Use `main` as the default branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the source if GitHub has not already selected it.
4. Run the **Deploy NONZERO to GitHub Pages** workflow once, or push a change to `index.html`.

After that, changes to `index.html` on `main` deploy automatically.

## Repository structure

```text
NONZERO-Fitness-App/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── feature_request.yml
│   └── workflows/
│       ├── pages.yml
│       ├── quality.yml
│       └── roadmap.yml
├── docs/
│   ├── PROJECT-HANDOFF.md
│   ├── SOURCE-OF-TRUTH.md
│   └── original-prehab-program.html
├── scripts/
│   ├── build-roadmap.js
│   └── validate-backlog.js
├── .gitignore
├── BACKLOG.json
├── CHANGELOG.md
├── CONTRIBUTING.md
├── index.html
├── package.json
├── README.md
├── ROADMAP.md
└── TRANSFER-INSTRUCTIONS.md
```

## Home-gym inventory currently preserved

- Concept2 Rower with PM5
- Concept2 BikeErg with PM5
- Schwinn Airdyne
- Peloton Tread
- Squat rack and barbell
- ~350 lb bumper plates
- 53 lb kettlebell ×1
- 35 lb kettlebell ×2
- 12 lb kettlebell ×1
- Flat bench
- AbMat
- Westside Barbell reverse hyper
- ~20 lb medicine ball
- Rogue plyo box
- Pull-up bar
- Long resistance bands
- Hip mini-bands

## Source-of-truth rules

See [`docs/SOURCE-OF-TRUTH.md`](docs/SOURCE-OF-TRUTH.md). The key rule is simple: **edit `BACKLOG.json`; generate `ROADMAP.md`; treat `index.html` as the current implemented app baseline.**
