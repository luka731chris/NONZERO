# Security, privacy and cost controls

## Secrets and access
- Keep `OPENAI_API_KEY`, `USDA_API_KEY`, and `API_TOKEN` in Cloudflare Worker secrets/variables, not GitHub source.
- Configure `ALLOWED_ORIGINS` to the exact trusted GitHub Pages origin(s); CORS is **not** a substitute for authentication.
- The Phone App currently needs a bearer token to access the Worker. Treat client-stored tokens as sensitive: a browser-delivered client is not a robust multi-user authentication architecture. Commercialization requires per-user authentication and authorization, scoped access to D1 records, abuse prevention, and secret rotation.
- Use HTTPS; redact tokens, private meal notes, and personal health data from logs, screenshots, and issue reports.
- Meal descriptions and photographs submitted for AI analysis are sent to the configured OpenAI API endpoint. Review privacy, retention, and consent before broader use.

## Cost architecture
- Existing Cloudflare Workers paid subscription: user-reported **$5/month**; usage overages depend on plan limits and traffic.
- USDA/Open Food Facts searches do not consume OpenAI API tokens, but have their own usage and fair-use limits.
- OpenAI text interpretation and photo analysis incur separate token/image charges; ChatGPT subscription does not pay API usage.
- v7.19.0 `nutrition_ai_usage` has a **$5/month conversational-only application threshold**, with a $3 warning concept and $0.03 per-request reservation. This is not a guaranteed billing cap; reservations and estimated final costs can differ.
- Photo endpoint `/v1/food/analyze` is **not** included in that budget. Nor are other apps using the same API project.
- Default text model in the release source: `gpt-4.1-mini` via `OPENAI_NUTRITION_MODEL`. Cost estimator defaults in code to $0.40 input/$1.60 output per million tokens. These are **code assumptions**, not independently verified current OpenAI pricing. Update rates if model or prices change.

## Required hardening before commercial use
1. Centralize **all** AI endpoints under one usage ledger and shared spending policy.
2. Use model-specific token prices, actual usage reconciliation, per-user quotas, rate limits, and alerts.
3. Add request-id tracing and sanitized logs.
4. Enforce strong user identity, tenant isolation, input validation, and least-privilege access.
5. Define data retention, deletion/export, consent, and breach-response policies.
6. Verify provider terms and data licensing for commercial food-data redistribution.

## Budget monitoring
Use OpenAI's actual API usage/billing dashboard as the source of truth. The D1 ledger is for internal application telemetry and may not equal invoices.
