# NONZERO — Platform documentation

**Documentation baseline:** 2026-11-03 · **Latest generated release candidate:** Phone + Nutrition Worker **v7.19.0** · **Deployment status:** unverified.

NONZERO is a personal fitness and nutrition system comprising a GitHub Pages phone web app, a Raspberry Pi Wall, and Cloudflare Worker/D1 services. It integrates workout telemetry, nutrition logging, food lookup, and experimental AI-assisted food interpretation. AutoPilot is a separate family logistics application; its integration with NONZERO is incomplete.

> **Status is not the same as deployment.** The v7.19.0 source package was generated and locally syntax-checked. The user has confirmed successful execution of the additive `nutrition_ai_usage` D1 migration, but has **not yet confirmed** deployment of the v7.19.0 Worker or Phone app, or successful live conversational logging. Earlier cross-device deletion issues are not conclusively resolved. Treat this as a release candidate.

## Quick links
- Phone app: https://luka731chris.github.io/NONZERO/
- Phone repository: https://github.com/luka731chris/NONZERO
- Nutrition Command Center: https://luka731chris.github.io/NONZERO-Nutrition/

## Components and version baseline
| Component | Latest known/generated | Confirmed deployment | Notes |
|---|---|---|---|
| Phone app | 7.19.0 candidate | Last explicitly confirmed 7.18.1.1; later uploads not independently verified | Single HTML web app hosted by GitHub Pages |
| Nutrition Worker | 7.19.0 candidate | 7.18.0.0 previously verified; later versions not confirmed | Cloudflare Worker `nonzero-nutrition-api` |
| Nutrition Command Center | 7.18.0.1 | Previously user-confirmed | Secondary laptop food-management interface |
| Raspberry Pi Wall | 7.17.21 | Previously user-reported | Do not update as part of nutrition releases |
| AutoPilot | Separate versioning | Not assessed | Separate app and Worker/D1 services |

## Features in the 7.19.0 candidate
- Phone-first food logging with automatic sync while the page is active.
- Conversational text-to-meal interpretation: multiple estimated foods, editable values, bulk log.
- USDA FoodData Central and Open Food Facts lookup; smart ranked search with a personal catalog and cached external results.
- Barcode lookup, camera scanning where browser-supported, and photo nutrition-label/meal analysis.
- Daily and seven-day nutrition summaries, target-gap guidance.
- Monthly *conversational* AI usage accounting and application threshold.

## Not yet delivered or verified
- Full 30/90-day predictive nutrition coaching and live AutoPilot meal-plan integration.
- USDA verification for **each** AI-interpreted meal item (AI estimates are not independently grounded in this release).
- One universal hard cap covering photo + text + all other OpenAI API usage.
- Background synchronization when the iPhone browser/web app is suspended.
- Complete end-to-end validation of delete propagation, offline edits, conflict handling, and no-resurrection behavior.

## Documentation index
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment and rollback](docs/DEPLOYMENT.md)
- [API reference](docs/API.md)
- [D1 data model and migrations](docs/DATABASE.md)
- [Security, privacy and cost controls](docs/SECURITY-AND-COST.md)
- [Testing and release acceptance](docs/TESTING.md)
- [Known issues and roadmap](docs/KNOWN-ISSUES-ROADMAP.md)
- [Operations and troubleshooting](docs/OPERATIONS.md)

## Repository layout recommendation
```text
NONZERO/
  index.html                  # deployed Phone app
  docs/                       # documentation in this package
  releases/                   # optional archived release notes, not secrets
  worker/                     # version-controlled Worker source (deploy separately)
  migrations/                 # additive SQL migrations
  tests/                      # local regression tests
```
The supplied documentation package does **not** overwrite your existing GitHub `index.html`, Worker, or D1 data. Copy the Markdown files into the repository; deploy code from the separately generated v7.19.0 release only after validation.
