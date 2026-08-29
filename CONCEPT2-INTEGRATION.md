# NONZERO — Concept2 Integration

NONZERO v3.1 supports a lightweight completed-workout import path:

**PM5 → ErgData → Concept2 Online Logbook → NONZERO Cloudflare Worker → NONZERO**

Concept2 states that ErgData automatically syncs with the Online Logbook. NONZERO then reads the latest Logbook workout through Concept2's supported API.

## One-time setup

1. In your Concept2 Online Logbook profile, create a long-lived personal API authorization token with `results:read`.
2. In the Cloudflare Worker project, store it as a secret named `C2_API_TOKEN` (do not put it in `worker.js` or GitHub).
3. Redeploy the Worker.
4. In NONZERO, Cloud Sync must already be configured.
5. After an ErgData workout syncs, open **Post-workout metrics** and tap **Import latest Concept2 workout**.

The import can prefill duration, distance, calories, pace, average watts when derivable, cadence/stroke rate, heart rate, and drag factor when those fields exist in the Logbook result.

## Why this path

It avoids storing Concept2 credentials in the browser and uses the supported Logbook API. It is a completed-workout feed, not live telemetry. Live PM5 data remains a separate future enhancement because it requires a direct PM5 connection layer.
