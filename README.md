# NONZERO

**Canonical build: v0.8.0 — recovered full-feature hip-prehab v7+ baseline (2026-08-23).**


This repository is the **single authoritative source of truth** for NONZERO: the current hip-friendly home-fitness app, its installable web-app files, and its dynamic product roadmap.

## Current application baseline

**NONZERO v0.7.0** is restored directly from the latest verified pre-NONZERO application lineage: **`hip_prehab_v7_github_pages_ready`**. The recovery was performed on August 23, 2026 after an older app implementation was accidentally promoted during repository consolidation.

`index.html` is the canonical live app. It preserves the v7 functionality and adds NONZERO naming, black/gold branding, iOS/PWA icon assets, and an explicit build marker in Settings.

### Implemented today

- Today / Week / Progress / Equipment / Settings experience
- Hip-friendly Strength A and Strength B programming
- BikeErg aerobic, long-cardio, recovery and flare-safe programming
- FULL / MINIMUM / FLARE plus rescue/random workout paths
- Wheel-style hip-pain and energy readiness controls
- Recommendation logic that considers pain, energy and recent workout feedback
- Choose-another-day session substitution
- Hip-aware random workout generator
- Persistent active-workout timer
- Live workout metrics panel
- Exercise completion and workout saving
- PM5 / ErgData manual metric capture plus experimental browser FTMS path
- Sunday report card and week-over-week observations
- Hip-replacement countdown with preparation phases
- Milestones, pre-op personal records and prehab scoring
- Post-workout hip/effort reflection
- Home-gym equipment inventory display
- Export/import/reset progress
- LocalStorage persistence using the historical `hipPrehabV2` key so existing browser data remains compatible
- PWA manifest + service worker
- iOS Home Screen metadata and NONZERO icon assets

## Dynamic roadmap system

The roadmap is generated, not hand-maintained.

- `BACKLOG.json` — **product-planning source of truth**
- `ROADMAP.md` — generated roadmap; do not edit manually
- `scripts/build-roadmap.js` — scores, sorts, and regenerates the roadmap
- `scripts/validate-backlog.js` — validates backlog data
- `.github/workflows/roadmap.yml` — regenerates `ROADMAP.md` after backlog changes
- `.github/workflows/quality.yml` — validates pushes and pull requests

Priority formula:

```text
Priority Index = (Value × Frequency) / (Effort + Dependency Risk)
```

Use natural-language requests such as “add X,” “move Y to NOW,” or “raise Z to P1” as instructions to update **`BACKLOG.json`**, then regenerate `ROADMAP.md`.

## Local checks

```bash
npm run roadmap
npm test
```

## GitHub Pages

`.github/workflows/pages.yml` deploys the repository to GitHub Pages.

For a new or corrected repository:

1. Put the **contents of this folder directly at the GitHub repository root**.
2. Use `main` as the default branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the deployment source.
4. Push/commit the files. The Pages workflow will deploy `index.html` plus its PWA assets.
5. On iPhone, open the deployed URL in Safari and use **Share → Add to Home Screen**.

Because this recovery changes the service-worker cache name, the corrected build should replace the older cached web-app files after redeployment. If an existing Home Screen copy still looks old, close it completely, open the GitHub Pages URL once in Safari, refresh, then relaunch the Home Screen app.

## Repository structure

```text
NONZERO-Fitness-App/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── assets/
│   ├── nonzero-icon-180.png
│   ├── nonzero-icon-192.png
│   ├── nonzero-icon-512.png
│   └── nonzero-icon-1024.png
├── docs/
│   ├── HIP-PREHAB-V7-RECOVERY.md
│   ├── PROJECT-HANDOFF.md
│   ├── SOURCE-OF-TRUTH.md
│   └── original-prehab-program.html
├── scripts/
│   ├── build-roadmap.js
│   └── validate-backlog.js
├── BACKLOG.json
├── CHANGELOG.md
├── CONTRIBUTING.md
├── index.html
├── manifest.webmanifest
├── package.json
├── README.md
├── ROADMAP.md
├── sw.js
└── TRANSFER-INSTRUCTIONS.md
```

## Home-gym inventory preserved in the app

- Concept2 Rower with PM5
- Concept2 BikeErg with PM5
- Schwinn Airdyne
- Peloton Tread
- Squat rack + barbell + ~350 lb bumper plates
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

See `docs/SOURCE-OF-TRUTH.md` for the rules that prevent future version drift.