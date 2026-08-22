# Hip Prehab V7

GitHub Pages-ready build. Replace the existing site files with index.html, manifest.webmanifest, and sw.js. Existing localStorage history remains under the same app storage key.

## New in V7
- Live workout strip: active time, meters, calories, watts, Stress Busted, Prehab Score
- Measured-vs-estimated calorie source labels
- Body-weight setting for calorie estimates
- PM5/ErgData result capture: meters, watts, calories, heart rate, cadence
- Strength-volume logging
- Progress totals for meters, calories, Stress Busted, hip-safe minutes, strength volume, average Prehab Score
- Experimental Web Bluetooth FTMS connector for supported browsers/devices
- iPhone-specific PM5 companion guidance: use ErgData as the PM5 Bluetooth recorder

## Important PM5 limitation
Mobile Safari on iPhone does not expose generic Web Bluetooth to this GitHub Pages app, so direct PM5 telemetry cannot be read by this web build on iPhone. Use Concept2 ErgData to connect to the PM5, record the erg workout, then enter the measured PM5 results in V7. Browsers/devices that expose Web Bluetooth can try the experimental direct FTMS button.
