# Nutrition Worker API (v7.19.0 candidate)

All paths below are relative to your **existing** Nutrition Worker URL. Exact hostname is intentionally not documented because it has not been confirmed. The Worker uses `Authorization: Bearer <API_TOKEN>` for protected endpoints and a configured `ALLOWED_ORIGINS` CORS allowlist. Do not expose the token in screenshots or GitHub.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Service health | No |
| GET | `/version` | Component/version | No |
| GET | `/v1/records?kind=food` | Fetch records, including tombstones | Yes |
| POST | `/v1/records` | Upsert/delete with revision and mutation ID | Yes |
| GET | `/v1/food/search?query=...` | USDA-backed legacy search | Yes |
| GET | `/v1/food/barcode?code=...` | UPC/EAN lookup | Yes |
| POST | `/v1/food/analyze` | Meal or label photo analysis | Yes |
| GET | `/v2/food/search?query=...` | Ranked catalog + external smart search | Yes |
| POST | `/v2/food/catalog` | Save/reuse verified food in personal catalog | Yes |
| GET | `/v3/nutrition/usage` | Monthly conversational AI usage/budget | Yes |
| POST | `/v3/nutrition/interpret` | Interpret free-text meal into estimated items | Yes |

**Endpoint shapes and fields:** Inspect `Worker/index.js` in the v7.19.0 release for the authoritative request/response contract. The following record mutation structure is representative:

```json
{
  "kind": "food",
  "id": "uuid-generated-by-client",
  "payload": {"id":"uuid-generated-by-client","day":"2026-11-03","name":"Example meal","meal":"Dinner","cal":450,"protein":35,"carbs":40,"fat":16},
  "deleted": false,
  "expectedRevision": 0,
  "mutationId": "unique-mutation-uuid"
}
```

To delete an existing record, send the same ID and kind with `deleted: true`, its current `expectedRevision`, and a new `mutationId`. The Worker stores `{}` as the deleted payload while retaining the record ID, revision and tombstone. A `409 revision_conflict` must not be ignored.

## Important API constraints
- `/v1/records` caps the response at 3,000 records and reports `truncated`; pagination is not implemented in this candidate.
- `/v1/food/barcode` expects 8–14 digits.
- Photo endpoint accepts a base64 JPEG/PNG/WebP data URL and has a request-size limit.
- Free-text interpretation has a model timeout and is budget-gated; AI estimates must be reviewed.
- Error strings are machine-readable; Phone UI should translate them into plain-language guidance rather than showing `invalid_query` or similar raw errors.
