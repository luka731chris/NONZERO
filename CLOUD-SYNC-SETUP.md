# NONZERO Lightweight Cloud Sync Setup

NONZERO v3 uses a **local-first + Cloudflare Worker/KV** architecture. The phone remains usable if the internet is down. When cloud sync is configured, the phone mirrors its state to a tiny Worker endpoint and Wall Mode reads that same state every 10 seconds.

## Architecture

`iPhone / PWA → localStorage → Cloudflare Worker → KV ← 4K Wall Mode`

- The phone is currently the writer.
- Wall Mode is intentionally read-only to avoid merge/conflict problems.
- Each installation uses an unguessable private sync key. The Worker hashes that key before using it as the KV storage key.
- No account system, server VM, SQL database, or always-on home computer is required.

## Deploy the Worker

1. In Cloudflare, create a Workers KV namespace for NONZERO.
2. Copy `cloud/wrangler.toml.example` to `cloud/wrangler.toml` and place the KV namespace ID in it.
3. From the `cloud` folder, deploy with Wrangler (`npx wrangler deploy`) or paste `worker.js` into a Cloudflare Worker and bind the KV namespace as `NONZERO_STATE`.
4. Copy the resulting HTTPS Worker URL.

## Pair the phone

1. Open NONZERO → Settings → Cloud sync.
2. Paste the Worker URL.
3. Tap **Generate key** (or use a private random key of at least 16 characters).
4. Tap **Sync now**.

Existing local workout history is preserved and becomes the initial cloud state if the cloud is empty.

## Pair Garage Wall Mode

1. Open `/wall/` on the garage mini PC.
2. Enter the same Worker URL and private sync key once.
3. Wall Mode stores those credentials locally in that browser and refreshes shared state every 10 seconds.

## Security model

The private sync key acts like a bearer secret. Do not commit it to GitHub, put it in screenshots, or embed it in the HTML source. Because Wall Mode is read-only in the app, accidental TV interactions cannot overwrite history; the Worker itself accepts writes from any holder of the key, so treat the key as private.
