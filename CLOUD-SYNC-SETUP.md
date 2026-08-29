# NONZERO v4 Cloud Sync + 6-Digit Wall Pairing

NONZERO remains local-first on the phone and mirrors workout state to a small Cloudflare Worker/KV service.

`iPhone/PWA → localStorage → Cloudflare Worker + KV ← read-only Wall token ← Roku / browser Wall`

## Deploy

1. Keep or create a Workers KV namespace.
2. Bind it to the Worker as `NONZERO_STATE`.
3. Deploy `cloud/worker.js`.
4. Keep the existing Worker URL configured in the phone app.

## Phone sync

The phone continues to authenticate with the private sync key. Tap **Sync now** after deployment to confirm the phone still shows Synced.

## Roku pairing

The Roku never needs the private sync key. The phone creates a one-time six-digit code at `/pair/start`; the Roku claims it at `/pair/claim`; the Worker returns a separate random Wall token mapped to the user's state. Wall tokens can read `/state` but cannot write it.

## Security

- Pair codes expire after 5 minutes and are single-use.
- Wall tokens are long random bearer credentials.
- The Worker rejects state writes authenticated with a Wall token.
- Do not publish the phone's private sync key.
