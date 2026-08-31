# Contributing to NONZERO

NONZERO is optimized for reliability and low-friction personal use.

## Development rules

1. Branch/version forward from the latest working release.
2. Never modify an archived Basecamp artifact in place.
3. Pairing/runtime changes require explicit regression testing.
4. Do not make Roku a second general-purpose state writer.
5. ErgData remains the PM5 Bluetooth owner unless architecture is deliberately changed.
6. Avoid phone UI that duplicates Wall information without a phone-specific action.
7. Preserve saved-state compatibility whenever practical.
8. Update `CHANGELOG.md` and `ROADMAP.md` with every meaningful release.
9. Never claim physical Roku/device validation unless it actually occurred.
10. Prefer incremental releases over simultaneous rewrites of phone, Worker, and Roku.

## Versioning convention

Track component versions independently:

- Phone/PWA `v3.x`
- Worker `v4.x`
- Roku `v4.3.x`

A release note should always state the complete tested combination.

## Definition of a regression

Any of the following is release-blocking unless explicitly documented:
- pairing button disappears;
- Roku can no longer claim a six-digit code;
- cloud state fails to load;
- active workout fails to enter Performance;
- finished workout gets stuck indefinitely in Performance;
- timer resets because the phone changes apps;
- a release requires the user to re-enter secrets without necessity;
- phone Today becomes dominated by administration rather than training.

