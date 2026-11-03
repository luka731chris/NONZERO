# NONZERO phone-first Wall controls v7.17.7

The phone app contains a compact contextual Wall remote, with a primary End Ride Now control while immersive mode is active, scene switching, soundtrack access, and a collapsed recovery panel. The Pi remains v7.17.6 ride safety logic and pairing recovery. No Cloudflare Worker changes are included.

Deploy the standalone phone HTML to your existing phone app hosting location. The Pi ZIP is a complete standard-updater-compatible release and includes the phone HTML at phone/index.html.

Commands use /ride/control and check /wall/health for the matching control nonce. A cloud HTTP success alone is not shown as Wall confirmation.

Limitations: A frozen browser main thread may not process commands. Live Pi GPU testing is required before treating the graphics issue as resolved.
