# Check-in and saved workout corrections · Pi 7.15.1 / Phone 3.62

The check-in QR previously advertised the Pi's port 8787, although that service deliberately binds only to loopback. A phone could not open it. The QR now opens the HTTPS Nonzero phone app with `#check-in`, which goes directly to Coach. It uses the configured Suite phone URL when valid, or the standard NONZERO GitHub Pages address. Credentials and query parameters are never included. The private Pi API remains private.

Publish Phone 3.62 and install Pi 7.15.1 together. The phone keeps its existing connection; a browser/device without that saved connection needs its normal sync setup. The same check-in is available by opening the phone app and tapping Coach. The QR does not install or pair the app automatically.

After saving a workout, tap **Edit completed workout** on Today, or **History → Edit** for a particular session. The existing summary editor now also supports workout name, exercise names, reps/time/load, total sets and completed sets (1–8 total), adding/removing movements, and independent primary/partner corrections. Changes remain drafts until Save changes; Cancel discards them. A save acknowledgement offers Undo for ten seconds. The editor uses session IDs so multiple workouts on the same date remain separate. A stale draft cannot overwrite a session changed on another device.

Corrections keep the saved workout's identity, source and original PM5/imported metrics. They do not rewrite the raw PM5 recorder. Changed movement names lose their old lift identifier; changed prescriptions do not receive unchanged-program credit. Set completion and saved summary values update and synchronize through the existing revisioned Worker. Unrelated running workouts and the future workout plan are preserved.

Worker stays 5.15. No new database, binding or secret is required. Validation is recorded separately in QA/checkin-release-results.json; prior broad release reports describe their original versions. Physical iPhone QR-camera testing and installed-device verification were not available.
