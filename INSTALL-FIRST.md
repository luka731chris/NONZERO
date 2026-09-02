# NONZERO Full Update
Phone v3.15 · Worker v4.7 · Roku v4.8.4

This is the complete forward release set.

## What this includes

### Phone v3.15
- Workout state presentation
- Current / Next Up
- Set-level tracking
- Automatic rest timer
- Phone-as-Wall controls
- Make It Nonzero
- Adaptive workout builder
- Flight recorder / diagnostics
- Wall Health panel
- Weekly Performance Report
- Garage Arrival-on-open
- Expanded canonical/offline reconciliation

### Worker v4.7
- Durable pairing preserved
- Canonical state preserved
- Wall heartbeat + Wall Health endpoint
- Revision-required hardening to prevent stale clients from overwriting canonical state

### Roku v4.8.4
Includes every Studio Polish / KPI / quote fix through v4.8.3, plus the missing Deep-mode wording refinement:
- 60pt Ambient quote hero
- quote author fully inside quote region
- direct visible quote update engine
- 17-second main-loop quote cadence
- SceneGraph timer retained as secondary trigger
- unique quote events / alwaysNotify support retained
- weekly M/T/W/T/F/S/S labels precisely aligned under their bars
- green started / muted-red missed / slate future day indicators
- missed-start count + current-week attendance
- truthful 30-day start-quality KPI paired with weekly adherence
- weekly minutes sparkline
- streak progress bar
- clean KPI card surfaces without the old decorative oval/header treatment
- AutoPilot and Workout panes exactly equal size
- premium Night/header/deep polish
- visible bottom-left build marker: `PAIR / SETTINGS · 4.8.4`

## Update order

### 1. Cloudflare Worker
Deploy `NONZERO-Worker-v4.7-INTELLIGENT-TRAINING.js` first.

Do NOT delete or recreate your KV namespace or pairing data.
Replace only the Worker code and deploy.

After deployment, your existing durable Roku pairing should remain valid.

### 2. Phone / PWA
Replace your current NONZERO `index.html` with:
`NONZERO-index-v3.15-INTELLIGENT-TRAINING.html`

If GitHub Pages is hosting it:
- open the repository containing NONZERO
- replace the existing `index.html`
- commit the change
- wait for GitHub Pages to redeploy
- fully close and reopen the PWA on iPhone

If Safari/PWA still shows an older UI, remove the old Home Screen shortcut and add NONZERO to Home Screen again only if a hard refresh/reopen does not update it.

### 3. Roku Wall
Sideload:
`NONZERO-Roku-v4.8.4-STUDIO-POLISH-COMPLETE-sideload.zip`

Use the Roku developer sideload page you already use:
- upload the ZIP
- install/replace the existing NONZERO channel
- launch NONZERO

Do not re-pair unless the Wall explicitly asks for a code.

### 4. Verify build
On Ambient, bottom-left must show:
`PAIR / SETTINGS · 4.8.4`

If it does not, the new Roku build is not actually running.

### 5. Verify quote rotation
Leave Ambient untouched for 20–25 seconds.
The visible quote should change without using the Roku remote.

### 6. Verify KPI polish
Confirm:
- M T W T F S S letters sit directly under their seven day bars
- elapsed missed days are muted red
- completed/started days are green
- future days remain slate
- THIS WEEK shows missed-start context and attendance %
- 30-day 100% is labeled as quality of starts, not overall adherence
- KPI cards do not have the old internal oval/header outlines
- AutoPilot and Workout panes are the same height and width

### 7. Verify Wall Health
Open Phone → Settings.
Within about one minute, Wall Health should report the Wall as healthy/current.

## Important
Do not redeploy older Worker builds after this.
Do not sideload any Roku build earlier than v4.8.4 after installing this release.
