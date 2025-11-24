## Context
ElevenLabs sends post-call webhooks to the `/webhook/elevenlabs` endpoint on our Render-hosted service. After moving the service to a new Render domain, webhooks stopped arriving, indicating a gap between deploy configuration, external webhook URL settings, and observability.

## Goals / Non-Goals
- Goals:
  - Make webhook delivery resilient to future Render domain changes.
  - Provide a clear, testable procedure to verify webhook reachability after every deploy or base-URL change.
  - Ensure operators can quickly distinguish between “no traffic reaching Render” and “requests rejected by signature validation”.
- Non-Goals:
  - Redesign the webhook payload schema or HMAC verification logic.
  - Introduce complex monitoring/alerting platforms beyond simple logs and manual checks.

## Decisions
- Decision: Treat the public ElevenLabs webhook URL as part of deploy configuration (Render plus ElevenLabs console) and capture it in the `deploy-config` capability.
- Decision: Require a manual verification step (curl or ElevenLabs test webhook plus log check) after any domain or base URL change.
- Decision: Improve logging around `/webhook/elevenlabs` so failed deliveries can be debugged (status, path, signature parsing result) without exposing secrets.

## Risks / Trade-offs
- Risk: Relying on a manual checklist for domain changes can still be forgotten; however, it is a low-effort first step before automation.
- Trade-off: We avoid adding extra endpoints or heavy monitoring; instead, we use existing logs and a documented test flow.

## Migration Plan
- Update the `deploy-config` spec with new requirements for webhook reachability and verification after domain changes.
- Align Render deployment config, ElevenLabs webhook settings, and documentation with the new spec.
- Run through the verification checklist on the current `https://analitycs-elevenlabs-81xj.onrender.com` deployment and confirm successful delivery.

## Open Questions
- Should we introduce automated checks (for example, periodic synthetic webhook pings) in the future?
- Do we need environment-specific webhook URLs (staging versus production) documented separately?


