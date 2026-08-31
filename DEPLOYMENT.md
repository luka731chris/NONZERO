# NONZERO Deployment

## Current development combination

- Phone v3.9
- Worker v4.3
- Roku v4.3.5

## Phone
GitHub Pages serves the root `index.html`.

For a phone-only UI release:
1. replace root `index.html`;
2. commit;
3. wait for Pages deployment;
4. refresh/reopen NONZERO;
5. verify visible version badge.

## Worker
Cloudflare Worker is `nonzero-sync`.

Preserve:
- `NONZERO_STATE` KV binding;
- private sync-key configuration;
- `C2_API_TOKEN` when configured;
- scheduled cron for Concept2 reconciliation.

After Worker deployment, verify `/health` before testing other components.

## Roku
Sideload the release ZIP through Roku developer mode.

Do not change Worker URL/private key on the TV. Pair with the six-digit phone-generated code when pairing is required.

## Rollback
Use the immutable Basecamp release:
- Phone v3.5
- Worker v4.1
- Roku v4.3.3

Rollback one component at a time unless the state schema requires a coordinated rollback.

