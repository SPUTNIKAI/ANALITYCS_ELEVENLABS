## 1. Investigation and Reproduction
- [ ] 1.1 Confirm current ElevenLabs webhook URL and compare it with the new Render domain (`https://analitycs-elevenlabs-81xj.onrender.com/webhook/elevenlabs`).
- [ ] 1.2 Manually send a signed test request to `/webhook/elevenlabs` on the new domain and verify HTTP status and logs.
- [ ] 1.3 Check Render logs to confirm whether any webhook requests arrive from ElevenLabs after the domain change.

## 2. Configuration and Code Adjustments
- [ ] 2.1 Update ElevenLabs console to use the correct production webhook URL on the new Render domain.
- [ ] 2.2 Ensure the Render service exposes `/webhook/elevenlabs` over HTTPS without extra prefixes or path changes.
- [ ] 2.3 (If needed) Adjust server logging around `/webhook/elevenlabs` to include domain, path, status, and signature-parse info under DEBUG.

## 3. Observability and Documentation
- [ ] 3.1 Add a simple, documented procedure for verifying webhook delivery after any domain change (curl example plus expected logs).
- [ ] 3.2 Update `memory-bank/integrations/elevenlabs-webhook.md` with the current production URL and verification steps.
- [ ] 3.3 Ensure `render.yaml` and `readme.md` mention the public webhook URL contract and domain-change checklist.

## 4. Validation
- [ ] 4.1 Trigger a real webhook from an ElevenLabs test workflow and verify it reaches `/webhook/elevenlabs` on the new domain and is stored in `webhook_events`.
- [ ] 4.2 Verify at least one event goes through the full pipeline (webhook → DB → analysis → CRM export, if enabled) after the domain change.
- [ ] 4.3 Confirm that future domain changes follow the documented checklist and do not break webhook delivery.


