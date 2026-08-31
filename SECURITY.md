# NONZERO Security

## Secrets

Never commit:
- NONZERO private sync key;
- `C2_API_TOKEN`;
- live Wall tokens;
- live BikeErg automation trigger URLs.

Use Cloudflare secrets for Concept2 credentials.

## Phone authentication

The private NONZERO sync key authenticates privileged phone/Worker operations.

## Roku pairing

The phone creates a short-lived six-digit pairing code through an authenticated route. The Roku claims the code and receives a random Wall token. The television should never require the private sync key.

## BikeErg one-link automation

Worker v4.3 creates a dedicated random automation token and returns a trigger URL. Apple Shortcuts stores/calls that URL instead of the private sync key.

Treat the URL as a secret capability link. If exposed:
1. revoke/reset it in NONZERO;
2. create a new link;
3. replace the URL in the Shortcut automation.

## Repository hygiene

Before every GitHub release:
- search for `C2_API_TOKEN`;
- search for `X-NONZERO-Key` values;
- search for Worker URLs containing `/automation/bikeerg/run/`;
- confirm example configuration uses placeholders only.

