# NONZERO · Actual PM5 workouts

Pi 7.16.0 · Phone 3.63 · Worker 5.16

PM5 recordings can finalize the actual workout through one phone action. Conservative three-hour automatic recognition protects warmups, cooldowns and mixed strength/circuit work. Both clients use the shared weekly rebalancing policy, preserving recovery and original strength prescriptions. Replaced records remain available for Undo.

Read [installation](README-FIRST.md) and [behavior and limits](docs/PM5-ACTUAL-WORKOUT.md).

Canonical sources live under src; build-manifest.json declares all generated phone, Wall and Worker outputs. Run `python3 tools/build.py --check` for reproducibility. Tests and actual execution evidence are under QA. This release uses targeted policy, Worker, sync-coordinator and real Chromium regression checks; prior release QA remains historical.

Raw USB PM5 capture remains Pi-local. Cloud summaries and canonical workout state use the existing authenticated Worker, revision checks and signed Wall pairing. Existing coaching D1 bindings and secrets are retained. Generated scenery and soundtrack remain local; third-party licenses are recorded in THIRD-PARTY-NOTICES.md.
