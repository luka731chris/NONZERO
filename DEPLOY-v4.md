# Deploy NONZERO v4

Use this order so the new Roku client never points at an older pairing service.

## A. Cloudflare
Replace the current Worker code with `cloud/worker.js` and deploy. Keep the existing `NONZERO_STATE` KV binding and Worker URL.

Quick check: opening `<your-worker>/health` should return a JSON response whose `version` is `4` and `pairing` is `6-digit`.

## B. GitHub Pages
Replace the current NONZERO site files with this release, including the `/wall/` folder. The phone app's existing local data and private sync key remain in Safari/localStorage.

## C. Roku
In Roku Developer Application Installer, upload `roku/NONZERO-Roku-v4.0-sideload.zip`.

## D. Pair
On phone: Settings → Roku Wall pairing → **Generate 6-digit pairing code**.

On Roku: press `*` → enter six digits → **Pair Wall**.

After pairing, the Wall should show `● CLOUD LIVE` and automatically switch to LIVE when a workout is started on the phone.
