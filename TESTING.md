# Regression tests and acceptance criteria

**Testing status:** local syntax/package checks were reported for v7.19.0; live iPhone, Cloudflare, photo, and cross-device end-to-end tests remain outstanding. Do not label this production-verified.

## Critical acceptance checklist
- [ ] Version matches on deployed Phone and Worker.
- [ ] Existing nutrition history is intact after migration.
- [ ] Typing `MASF Supplements Smashin Greens` yields relevant matches or a clear no-match message, not 14 unrelated generic foods.
- [ ] Partial search and clear button work; blank search does not show raw `invalid_query`.
- [ ] Search result names are short, with brand, serving and source visible where available.
- [ ] A free-text entry such as `taco casserole, two servings of Doritos, protein cookie dough` produces multiple editable food items and a combined estimate.
- [ ] No unverified macro estimate is mislabeled as USDA-verified.
- [ ] Logging a reviewed meal creates one record per intended item, without duplicates on retry.
- [ ] Automatic phone-to-D1 upload works without pressing Sync now.
- [ ] Editing and deleting a phone entry propagate to the laptop after refresh.
- [ ] Deleting a laptop entry removes it from phone UI **and** local persistence after refresh.
- [ ] Offline food creation survives reload, then syncs on reconnect without duplicates.
- [ ] A stale local record does not resurrect a D1 tombstone.
- [ ] Simulated `409` revision conflict does not silently overwrite cloud data.
- [ ] Today macros and 7-day history reflect actual saved entries, not pending or duplicate items.
- [ ] AI text budget response behaves safely near the threshold.
- [ ] Photo endpoint is tested separately because it is outside the conversational budget.
- [ ] Workout/PM5 features and Pi remain unaffected by the Phone release.

## Test data safety
Use disposable test foods and stable unique names. Never delete real nutrition history as a troubleshooting shortcut. Capture a sanitized before/after snapshot of D1 IDs and revisions for failed cases.

## Minimum release gate
No release is considered stable until create/edit/delete/reload/offline sync pass on a real iPhone and a second browser against the deployed Worker, with evidence of no duplicate records or resurrected tombstones.
