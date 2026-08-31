# BikeErg / ErgData Integration

## Desired daily experience

After one-time setup:

**Wake PM5 → Open ErgData → Ride**

NONZERO should automatically:
1. create/retain an ACTIVE BikeErg workout;
2. update shared cloud state;
3. cause Roku to switch Ambient → Performance.

No NONZERO launch is required to start the session.

## One-time setup — v4.3 simple flow

Prerequisites:
- Phone/PWA v3.9 or newer.
- Worker v4.3.
- Cloud Sync configured.
- Worker `/health` shows `simpleShortcut:true`.

On the phone:
1. NONZERO → Settings → **BikeErg Auto-Launch**.
2. Tap **CREATE MY SHORTCUT LINK**.
3. Tap **COPY LINK + OPEN SHORTCUTS**.

In Apple Shortcuts:
4. Automation → `+` → **App**.
5. Choose **ErgData**.
6. Select **Is Opened**.
7. Choose **Run Immediately**.
8. Add **Get Contents of URL**.
9. Paste the copied NONZERO URL.
10. Do **not** change Method.
11. Do **not** add Headers.
12. Tap Done.

Do not create an ErgData “Is Closed” automation.

## Why app-open rather than PM5-connect?

iOS Shortcuts does not expose the internal event “ErgData connected to PM5” as a personal-automation trigger. Opening/switching to ErgData is therefore the reliable automatic trigger.

## Security model

The Shortcut URL contains a dedicated opaque automation credential. It is not the private NONZERO sync key.

If the URL is exposed, use NONZERO's reset/revoke control and create a replacement.

## Concept2 completion

The automatic **start and Wall flip do not require the Concept2 API**.

Automatic completed-workout reconciliation does.

Configure Cloudflare secret:

`C2_API_TOKEN`

with Concept2 `results:read` authorization, then ensure the scheduled Worker reconciler is enabled.

Expected health after configuration:

`concept2:true`

## Do not fake live telemetry

A Concept2 Logbook result is post-workout data. Until a dedicated telemetry bridge exists, do not label completed-result data as live PM5 watts/pace/cadence/meters/HR.

