# NONZERO Wall v4 — Roku Setup

## 1. Deploy the cloud update

Deploy `cloud/worker.js` to the existing Cloudflare Worker before installing the Roku v4 package. Keep the existing `NONZERO_STATE` KV binding. No workout-data migration is required.

## 2. Sideload the Roku package

Use the Roku developer installer and upload:

`roku/NONZERO-Roku-v4.0-sideload.zip`

The public Worker endpoint is already compiled into the app. The private sync key is not.

## 3. Pair with six digits

1. On the phone, open NONZERO → Settings → **Roku Wall pairing**.
2. Tap **Generate 6-digit pairing code**.
3. On the Roku Wall, press `*`.
4. Enter the six digits and choose **Pair Wall**.

The code expires after five minutes and can be claimed once. The Worker exchanges it for a long random read-only Wall token, which the Roku stores in its registry.

## 4. Normal use

Leave NONZERO Wall open. It refreshes shared workout state every two seconds and updates the active workout timer locally every second. The UI switches automatically between READY, LIVE, and COMPLETE without Roku remote interaction.

## 5. Re-pair

Press `*` at any time to pair the Wall again. Generate a fresh code in the phone app first.
