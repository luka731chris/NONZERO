# D1 schema and data lifecycle

**Database:** existing Nutrition D1 database (distinct from `nonzero_coach` and AutoPilot databases). Confirm its exact Cloudflare name in the dashboard before running SQL.

## Tables
| Table | Purpose | Status |
|---|---|---|
| `records` | Generic synced nutrition entities, `kind/id/payload/deleted/revision/updated_at` | Existing |
| `mutations` | Idempotent mutation tracking | Existing |
| `food_catalog` | Personal food names, brands, normalized keys, payload, usage count | v7.18.3.0 migration; verify deployed |
| `food_search_cache` | Cached external search results and expiry | v7.18.3.0 migration; verify deployed |
| `nutrition_ai_usage` | Monthly estimated text-AI spend/reservations/request count | **CREATE TABLE executed successfully on 2026-11-03** |

## Conversational usage migration (additive)
```sql
CREATE TABLE IF NOT EXISTS nutrition_ai_usage (
    month TEXT PRIMARY KEY,
    spent_usd REAL NOT NULL DEFAULT 0,
    reserved_usd REAL NOT NULL DEFAULT 0,
    requests INTEGER NOT NULL DEFAULT 0
);
```

## Verification
```sql
SELECT name FROM sqlite_master
WHERE type = 'table'
AND name IN ('records','mutations','food_catalog','food_search_cache','nutrition_ai_usage')
ORDER BY name;
```

```sql
SELECT month, spent_usd, reserved_usd, requests
FROM nutrition_ai_usage ORDER BY month DESC LIMIT 12;
```

## Records, tombstones and historical diagnostic
`records.payload` is JSON. Active food entries contain `name`, `day`, macros, etc. Deleted entries can have `payload={}`, `deleted=1`, and an incremented `revision`; this is intentional. In a user-provided 2026-11-03 diagnostic, D1 held one active `D1 sync verification` entry and two revision-2 tombstones. This **did not** establish that the Phone UI correctly removed the old protein shake.

## Operational rules
- Never truncate or recreate `records` to fix a display bug.
- Back up D1 before schema changes.
- Never replace a tombstone with a stale local entry without a conflict resolution flow.
- Preserve local-only foods separately for user review, not silent deletion.
- Food-search cache is not authoritative nutrition history; it can be expired or rebuilt.
- `nutrition_ai_usage` is an **estimated application ledger**, not the OpenAI invoice.
