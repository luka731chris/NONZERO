# NONZERO nutrition D1 schema sources

Recovered migration sequence (for **new empty** databases only):

1. `migrations/001-nutrition-records-baseline.sql` (records, mutations; earlier Nutrition Worker Command Center release)
2. `migrations/002-nutrition-smart-search.sql` (food_catalog, food_search_cache; v7.18.3)
3. `migrations/schema-conversational.sql` (nutrition_ai_usage; v7.19; already uploaded in prior step)

**Do not re-run or replace the live database based on this file list.** The actual production D1 schema and applied migration history have not been independently verified. Back up D1 before any changes. SQL here is a reconstruction from prior release artifacts, not an export of production data.
