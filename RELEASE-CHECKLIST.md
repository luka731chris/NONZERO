# NONZERO Release Checklist

## Before packaging
- [ ] Version numbers updated.
- [ ] `CHANGELOG.md` updated.
- [ ] `ROADMAP.md` statuses updated.
- [ ] No secrets/API tokens/private sync keys committed.
- [ ] Phone JavaScript syntax checked.
- [ ] Worker JavaScript syntax checked.
- [ ] Roku XML parses.
- [ ] Roku ZIP integrity checked.
- [ ] Existing saved-state schema compatibility reviewed.

## Phone regression
- [ ] Today renders on iPhone.
- [ ] Surgery date field visible and persists.
- [ ] Countdown updates after date entry.
- [ ] Pain/energy inputs work.
- [ ] Start/Pause/Reset work.
- [ ] Finish/save works.
- [ ] BikeErg setup UI works.
- [ ] Wall administration remains in Settings, not prime Today real estate.

## Cloud regression
- [ ] `/health` reports intended version.
- [ ] `rokuPairing:true`.
- [ ] `bikeErgAuto:true` where expected.
- [ ] `simpleShortcut:true` where expected.
- [ ] Existing KV binding preserved.
- [ ] Existing secrets preserved.
- [ ] Cron preserved where Concept2 reconciliation is expected.

## Roku regression
- [ ] Existing paired Roku can load state, or release explicitly documents re-pair requirement.
- [ ] Six-digit pairing works.
- [ ] Ambient renders.
- [ ] Active workout → Performance.
- [ ] Paused workout remains Performance.
- [ ] Completion → Victory/scheduled release as designed.
- [ ] Night renders.
- [ ] Deep renders.
- [ ] Deep → morning Ambient tested when overnight behavior changes.
- [ ] Quote controls work.
- [ ] LukaLab branding/flag assets render.

## BikeErg end-to-end
- [ ] ErgData Is Opened automation runs immediately.
- [ ] No POST/header/private key required in Shortcut for v4.3+.
- [ ] Opening ErgData starts NONZERO.
- [ ] Roku flips to Performance.
- [ ] Returning to ErgData does not reset timer.
- [ ] Switching to another phone app does not stop session.
- [ ] If Concept2 configured: completed result reconciles and Wall releases Performance.

## Promotion
A release becomes a new Basecamp only after the relevant end-to-end flows are verified on actual hardware. Do not promote based only on syntax/package checks.

