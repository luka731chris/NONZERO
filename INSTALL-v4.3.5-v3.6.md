# Install order — NONZERO Victory + Pre-Op Countdown

1. Keep Cloudflare Worker v4.1 exactly as deployed. No Worker change is needed.
2. In GitHub, replace the current root `index.html` with `NONZERO-phone-v3.6-index.html` and commit it.
3. Open the phone app once and confirm Settings contains **Hip surgery countdown**. Leave the date blank while it is TBD.
4. Sideload `NONZERO-Roku-v4.3.5-sideload.zip` on the Roku developer page.
5. Confirm the Wall reconnects without re-pairing and returns to its scheduled mode.
6. Test a completed workout: after the completion hold, Ambient should show **VICTORY LAP / NONZERO DAY LOCKED IN** and quote selection should trend toward accomplishment + future consistency.
7. Optional countdown test: temporarily enter a future surgery date in Phone → Settings. After cloud sync, the Roku right-side Ambient panel should change to the live countdown. Clear the test date afterward if the real date is still TBD.

## Do not change
- Cloudflare Worker v4.1
- KV binding / sync key
- Pairing token
- Roku screensaver / auto-power settings already configured for appliance behavior
