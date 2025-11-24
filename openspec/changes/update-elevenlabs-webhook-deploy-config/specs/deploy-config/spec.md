## ADDED Requirements

### Requirement: ElevenLabs Webhook Verification Procedure
Operators SHALL have a documented procedure to verify webhook delivery after any domain or base URL change.

#### Scenario: Operator verifies webhook after domain change
- **WHEN** the Render service domain changes (including creating a new `*.onrender.com` URL)
- **THEN** an operator updates the documented production webhook URL for ElevenLabs
- **AND** runs the verification steps (test webhook plus log and database check)
- **AND** confirms at least one event is stored in `webhook_events` for the new domain.

## MODIFIED Requirements

### Requirement: Render Deployment
The system SHALL support reliable deployment to Render.com, including stable public webhook delivery for ElevenLabs.

#### Scenario: Successful package resolution
- **WHEN** Render clones the repository
- **THEN** package.json is found in the correct location
- **AND** dependencies are installed successfully

#### Scenario: Authentication works
- **WHEN** Render accesses the GitHub repository
- **THEN** authentication succeeds without prompts
- **AND** repository is cloned successfully

#### Scenario: Build process completes
- **WHEN** build script runs
- **THEN** all dependencies are available
- **AND** application starts without errors

#### Scenario: ElevenLabs webhook endpoint reachable after domain change
- **WHEN** the service is deployed to a new Render domain
- **THEN** the public HTTPS URL for `/webhook/elevenlabs` on that domain is configured in ElevenLabs webhook settings
- **AND** a manual test request (curl or ElevenLabs test webhook) returns a 2xx status
- **AND** the request is visible in Render logs for troubleshooting.


