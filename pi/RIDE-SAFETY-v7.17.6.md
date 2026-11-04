# Ride safety v7.17.6

- GPU worker starts only on immersive ride entry, not during Ambient startup.
- Exiting ride immediately terminates worker, removes canvas and returns to cockpit.
- `END RIDE NOW` is a dedicated control; existing phone `view: lab` control also ends ride.
- After first real PM5 cadence >=3, 20 seconds without valid cadence returns to cockpit.
- Configure via browser `localStorage.setItem('nz.rideIdleSeconds','30')` (5–180 seconds), then reload.
- Worker failure ends immersive ride and stays in cockpit.
- The graphics worker does not automatically relaunch after a fault or idle stop.
- Does not change Cloudflare or the PM5 recording lifecycle.
- Keep v7.17.5 ZIP for rollback. Hardware GPU hangs cannot be ruled out without on-device soak tests.
