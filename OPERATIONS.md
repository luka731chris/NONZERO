# Operations and troubleshooting runbook

## Version mismatch
- Check the public Worker `/version` response.
- Check Phone version in the UI; force-refresh GitHub Pages if stale.
- Verify you deployed the Worker and Phone files from the **same** v7.19.0 package.

## Food lookup errors
- `invalid_query`: search field is empty or malformed; UI should show an invitation to type a food rather than a tiny technical error.
- No relevant branded match: search shorter brand/product terms, then scan a label or create a verified personal catalog entry. Do not substitute unrelated USDA foods.
- USDA unavailable: check `USDA_API_KEY` Worker secret and upstream response/rate limits.

## Conversational interpretation unavailable
- Confirm Worker `/version` is 7.19.0, `OPENAI_API_KEY` is configured, and the `nutrition_ai_usage` table exists.
- Check authenticated `/v3/nutrition/usage` for monthly usage and budget state.
- Check model name, token rates, provider errors, and timeouts in sanitized Worker logs.
- Avoid sharing API keys or full personal food descriptions in issue reports.

## Food stays visible after deletion
1. Do not clear local browser storage or delete the food repeatedly.
2. In D1, inspect `records` for that ID, `deleted`, `revision`, and `updated_at`.
3. If D1 tombstone exists, compare local food ID with cloud ID and verify the Phone's active in-memory food log refreshes after sync.
4. Check whether legacy local-only items were archived and whether queued writes attempted to resurrect the record.
5. Preserve an export and sanitized repro before modifying code.

## D1 migration says `No SQL statements detected`
Paste the `CREATE TABLE IF NOT EXISTS ...;` statement alone, without Markdown, leading prompt characters, or other formatting. The user subsequently received `This query successfully executed` for `nutrition_ai_usage`.

## Release management
Tag source releases with component versions; keep changelog and deploy notes. Record deployment timestamps, D1 migrations applied, and acceptance results. Keep credentials and personal data out of Git.
