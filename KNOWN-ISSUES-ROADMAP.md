# Known issues, gaps and roadmap

## P0 — data integrity
- **Historic food deletion mismatch:** The protein shake remained on Phone despite D1 tombstones. Candidate fixes in 7.18.1.2–7.18.1.4 and later have not been proven successful in live tests. Must verify before daily reliance.
- **Sync conflict and duplicate prevention:** Cross-device concurrency, offline queue replay, stale in-memory UI, and legacy local IDs need full integration testing.

## P1 — functionality and experience
- Conversational estimates are not yet per-item grounded in USDA or verified labels. Add source-backed nutrient calculation and uncertainty/portion handling.
- Food search relevance, personal catalog persistence, and partial-name behavior require live testing.
- No comprehensive 30/90-day goal forecast or proactive meal planning.
- AutoPilot insights on Today are a placeholder/partial mapping, not verified live schedule intelligence.
- Full background iOS synchronization is not available when the browser/web app is suspended.

## P1 — costs/security
- Conversational-only $5 usage threshold does not cover photo AI. Add a unified limiter across all OpenAI endpoints, enforce it with atomic reservations, and reconcile actual usage.
- Browser-stored bearer token is not appropriate for a commercial multi-user service.

## P2 — ecosystem
- Workout history has previously shown anomalously long/duplicated PM5 sessions; investigate separately without destabilizing the Pi.
- Improve recipe-level reuse, barcode coverage, meal-photo accuracy, and nutrition source provenance.
- Establish CI regression suite, staging Worker/D1, release tagging, and deployment verification.

## Suggested next milestones
1. Validate deployed v7.19.0 with the acceptance checklist.
2. Close delete-sync P0 with instrumented cross-device tests.
3. Build verified ingredient grounding and universal AI budget controls.
4. Add goal-phase history, 30/90-day trends and AutoPilot scheduling integration.
5. Commercial hardening: user identity, isolation, licensing, telemetry, CI/CD.
