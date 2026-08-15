# Hip Prehab Training V5 — GitHub Pages

This folder is ready to publish on GitHub Pages.

## Publish

1. Create a new GitHub repository, for example `hip-prehab`.
2. Upload all files from this folder to the repository root:
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
5. Save.
6. GitHub will publish the site at an address similar to:
   `https://YOUR-USERNAME.github.io/hip-prehab/`

## Install on iPhone

1. Open the published GitHub Pages URL in **Safari**.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. If shown, enable **Open as Web App**.
5. Tap **Add**.

## Progress storage

Workout history is stored locally in the browser on the device you use.
Use **Settings → Export progress** inside the app periodically to save a backup.

## Updating later

Replace the files in this repository with newer versions.
The GitHub Pages URL stays the same, so your Home Screen icon continues to work.


## V3 additions
- Equipment inventory inside the app.
- Hip-aware random workout generator using the equipment you own.
- Random workout time and emphasis controls.
- Random sessions can be saved into progress history.


## V4 additions
- Large one-tap **Start Today's Workout** button with automatic Full / Minimum / Flare recommendation based on pain and energy.
- **I really don't want to work out** 10-minute rescue workflow.
- Native-style scroll-wheel inputs for hip pain and energy.
- Workout elapsed timer plus 60- and 90-second rest timers.
- Optional pre-op performance tracking: push-ups, pull-ups, BikeErg meters, and average watts.
- Pre-op personal records dashboard.
- Sunday report card with weekly grade, adherence, training minutes, pain comparison, and coaching note.
- Target hip replacement date with automatic countdown and Build / Maintain / Surgery Runway phases.
- Apple Health/Fitness integration status information and workout records structured for a future HealthKit-native version.

### Apple Health note
GitHub Pages/PWA code cannot access HealthKit directly. A native iOS application with Apple's HealthKit entitlement is required to write workout data to Apple Health/Fitness.


## V5 additions
- Automatic Apple Watch workout recommendation on every session.
- Indoor Cycle prompts for BikeErg/cardio days.
- Traditional Strength Training prompts for strength days.
- Recovery-day guidance for when Watch workout tracking is optional.
- In-app setup guidance for pairing the workflow with an Apple Watch Ultra Action button or Watch Shortcut.
