# NONZERO v7.17.3 — No-keyboard ride remote

Phone app → Settings → Garage Wall → **Open ride remote**. On same Wi-Fi, connect using the QR / TV code once. The LAN remote provides **Show ride**, **Metrics view**, **Next scenery**, **Center view**, and four camera pan controls. These use the existing capability-protected port 8788; no Cloudflare Worker update is required. The controls are disabled until the Wall has an active performance session. **Metrics view does not end or save the workout.** If the cloud connection is lost, the LAN remote can still work on the same Wi-Fi. Do not expose port 8788 to the public internet.

A separate iPhone browser tab opens the remote; the QR/code is required after Pi service restart. If `nonzero-pi.local` does not resolve, use the Pi LAN IP and port 8788. The remote's own access code is not the Cloudflare private sync key.
