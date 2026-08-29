# NONZERO v3.3 — Roku Wall + Screensaver Setup

## What this release does

The Roku client is a native SceneGraph application that reads the same Cloudflare Worker `/state` document used by the phone app and web Wall. It is read-only.

- Launch the **NONZERO Wall** tile for the persistent garage landing view.
- Press **Home** at any time to return to normal Roku Home / Netflix / other apps.
- Select **NONZERO Wall** as the Roku screensaver so idle Roku sessions fall back to NONZERO automatically.
- While NONZERO is foregrounded, state refreshes every 5 seconds and changes automatically as the phone starts/updates/completes a workout.
- Press `*` inside NONZERO Wall to re-enter pairing settings.

## 1. Enable Roku developer mode

On the Roku remote, press:

`Home ×3 → Up ×2 → Right → Left → Right → Left → Right`

Accept the developer agreement, create a developer password, and note the Roku's IP/installer URL.

## 2. Sideload the Roku build

1. From a computer/phone on the same network, open the Roku developer installer URL.
2. Sign in as `rokudev` with the password you created.
3. Upload `roku/NONZERO-Roku-v3.3-sideload.zip` from this release.
4. Install it. Roku should launch NONZERO Wall immediately.

> Roku development devices permit only one sideloaded development app at a time. Installing another sideloaded app replaces this development build.

## 3. Pair NONZERO

On first launch, press `OK` or `*`.

Enter:

1. **Worker URL** — the same Cloudflare Worker URL configured in the phone app.
2. **Private sync key** — the same private sync key configured in the phone app.

The values are stored in the Roku app's local registry. The client then reads `GET <worker>/state` with `X-NONZERO-Key`.

## 4. Make NONZERO your practical garage home

Roku's system Home screen cannot be replaced by a third-party app. The intended interaction is:

`NONZERO Wall → Home button → Roku Home / Netflix → launch NONZERO tile → Wall`

Move the NONZERO tile to the first position on Roku Home for the fastest return.

## 5. Make NONZERO the screensaver

After installation, open Roku screensaver settings and choose **NONZERO Wall** as the active screensaver, then choose the desired idle delay.

When Roku calls the app's `RunScreenSaver()` entry point, NONZERO renders the same shared Wall state in screensaver mode. Setup dialogs are disabled while running as a screensaver.

## Current platform limitation

Starting a workout on the phone does **not** forcibly interrupt Netflix or another foreground Roku app. When NONZERO is already foregrounded, the display updates automatically. If another Roku app is foregrounded, press Home and launch NONZERO when you want the workout dashboard visible.
