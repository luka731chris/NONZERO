NONZERO Pi v7.17.13 - Ambient stability hotfix
Based on v7.17.12 integration recovery.

TEMPORARY SAFETY TRADEOFF:
Immersive ride rendering is disabled. Performance cockpit, PM5 collection,
pairing, weight and AutoPilot code remain in place.
Three.js and GPU/worker ride engines are not loaded on the Wall page.
Ride-engine API remains present to avoid breaking existing app integrations.
Idle ride animation loop is throttled to 1Hz.

This does not establish the root cause of Chromium Aw Snap crashes.
This package has not been tested on the physical Raspberry Pi.
Retain the previous ZIP for rollback. Install with the standard desktop updater.
No Cloudflare Worker changes.
