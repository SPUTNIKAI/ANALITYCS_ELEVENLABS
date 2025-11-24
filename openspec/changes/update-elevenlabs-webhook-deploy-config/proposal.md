# Change: Ensure ElevenLabs webhooks work after Render domain changes

## Why
After moving the service to a new Render domain `https://analitycs-elevenlabs-81xj.onrender.com`, ElevenLabs webhooks stopped being delivered successfully. We need explicit requirements and process so that any future domain or deploy-config changes keep the `/webhook/elevenlabs` endpoint reachable and observable.

## What Changes
- Define deploy-config requirements for keeping the ElevenLabs webhook URL up to date when the Render domain changes.
- Specify observability requirements for webhook delivery (logs and a simple verification procedure).
- Align Render configuration and ElevenLabs console configuration so that production webhooks hit the correct HTTPS endpoint and return 2xx.
- Document an operator checklist for domain changes and webhook reconfiguration.

## Impact
- Affected specs: `deploy-config/spec.md` (Render deployment capability).
- Affected code: `render.yaml`, `src/server.js` (`/webhook/elevenlabs` handler and logging), deployment/runtime config, ElevenLabs webhook settings (external).


