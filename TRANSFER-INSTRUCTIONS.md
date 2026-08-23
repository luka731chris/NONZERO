# NONZERO Transfer / Recovery Instructions

## Canonical package

This folder is the corrected **NONZERO v0.7.0 GitHub master** created August 23, 2026.

Its app implementation was restored from the verified `hip_prehab_v7_github_pages_ready` lineage after an older/simpler `index.html` was accidentally promoted in a prior master package.

## If moving this project to another ChatGPT thread

Upload the entire repository ZIP and say:

> Treat this repository as the authoritative NONZERO fitness-app baseline. Read README.md, docs/SOURCE-OF-TRUTH.md, docs/HIP-PREHAB-V7-RECOVERY.md, BACKLOG.json, and docs/PROJECT-HANDOFF.md before changing the app. Preserve the recovered v7 capabilities and use BACKLOG.json as the roadmap source of truth.

## If restoring GitHub

Upload the **contents of this repository folder to the GitHub repository root**. Do not nest them inside an extra directory.

Critical live-app files:

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `assets/nonzero-icon-180.png`
- `assets/nonzero-icon-192.png`
- `assets/nonzero-icon-512.png`
- `assets/nonzero-icon-1024.png`

Critical planning files:

- `BACKLOG.json` — edit this
- `ROADMAP.md` — generated; do not edit by hand
- `scripts/build-roadmap.js`
- `scripts/validate-backlog.js`
- `.github/workflows/roadmap.yml`
- `.github/workflows/quality.yml`

Critical deployment file:

- `.github/workflows/pages.yml`

## Verification after deployment

In NONZERO Settings, look for:

**NONZERO v0.7.0 · restored from hip-prehab v7 · build 2026.08.23**

Also verify the app has:

- wheel-style hip pain + energy controls
- Surprise me / random workout generation
- active workout timer
- Sunday report card
- hip replacement countdown
- Equipment tab
- PM5 section
- post-workout reflection

If those are missing, an older `index.html` is still being served or cached.
