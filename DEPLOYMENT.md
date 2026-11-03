# Deployment, release verification and rollback

## Before changing anything
1. Back up current GitHub Pages `index.html`, deployed Worker JavaScript, and D1 data (Cloudflare export/backup if available).
2. Record currently deployed `/version` response and the Phone app's displayed version.
3. Keep the Pi Wall and AutoPilot backend unchanged for nutrition-only updates.
4. Never commit `API_TOKEN`, `OPENAI_API_KEY`, `USDA_API_KEY`, or real user food logs to GitHub.

## v7.19.0 deployment order
1. **D1:** The user already ran `CREATE TABLE IF NOT EXISTS nutrition_ai_usage (...)` and Cloudflare reported successful execution. Verify table existence with the query below. Do not rerun destructive schema commands.
2. **Worker:** From the separate `NONZERO-v7.19.0-CONVERSATIONAL-NUTRITION.zip`, deploy `Worker/index.js` to existing `nonzero-nutrition-api`.
3. Preserve existing D1 binding `DB`, `API_TOKEN`, `ALLOWED_ORIGINS`, `USDA_API_KEY`, `OPENAI_API_KEY`. Optional variables: `OPENAI_NUTRITION_MODEL`, `AI_INPUT_USD_PER_M_TOKEN`, `AI_OUTPUT_USD_PER_M_TOKEN`.
4. **Verify** `GET /version` returns `version: 7.19.0`, then authenticated `GET /v3/nutrition/usage` returns a usage payload.
5. **Phone:** Replace GitHub Pages root `index.html` with `Phone/index.html` from the same release; hard refresh and verify version.
6. Run the [acceptance checklist](TESTING.md) before relying on it.

```sql
SELECT name FROM sqlite_master
WHERE type = 'table' AND name = 'nutrition_ai_usage';
```

## Required pre-existing smart search schema
The v7.19.0 Worker references `food_catalog` and `food_search_cache` from the v7.18.3.0 migration. Confirm they exist before enabling smart search. If missing, apply `Database/schema-smart-search.sql` from the **v7.18.3.0** release, after backup. Do not infer their existence merely from the conversational migration succeeding.

## Deployment checklist
- [ ] Existing source and data backed up
- [ ] D1 `nutrition_ai_usage` table verified
- [ ] D1 `food_catalog` and `food_search_cache` tables verified
- [ ] Worker `/version` returns `7.19.0`
- [ ] Authenticated usage endpoint works
- [ ] Phone displays `7.19.0`
- [ ] Food search returns relevant short labels
- [ ] Free-text meal returns reviewable estimates
- [ ] Log all creates one record per reviewed item, no duplicates
- [ ] Auto sync from phone to laptop confirmed
- [ ] Delete on one device disappears on the other
- [ ] No secrets appear in public HTML or GitHub

## Rollback
Restore the previous Phone HTML and Worker JS independently. Additive D1 tables can remain; do **not** drop tables as part of routine rollback. If a migration partially fails, inspect schema before retrying. Rollback of code does not automatically roll back data created under newer schema.
