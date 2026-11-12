# Phase 5 learning materials

This phase adds no AI/agentic concept. The mandatory AI teach-back gate is not applicable. Material is prepared; no learner mastery or demonstration is claimed.

## Five practical questions

1. Why must a feature flag be enforced on the server even when a UI button is hidden?
2. What should a client do after a write times out, and why is automatic retry dangerous?
3. What does a zero-violation axe result establish, and which accessibility checks remain manual?
4. Why does a quiesced embedded DB/files restore not prove native live backup or volume durability?
5. Which measurement conditions must stay comparable before attributing latency changes to a future AI feature?

## Architecture explanation

Explain startup configuration → server capability response → presentation controls, and the independent API rejection boundary. Discuss read-only business requests, still-available authentication and already-queued effects. Connect incident revisions and stable operation keys to uncertain network outcomes.

## Controlled failure

Run the API and browser suites. An injected ECONNREFUSED becomes a redacted 503 then recovers without restart; a controlled browser HTTP 503 preserves entered fields before a deliberate resubmission. Run quality:baseline to restore a separate synthetic DB/files pair with exact fingerprints and scoped login. None simulates a host power loss.

## Security boundary

Consolidated review is in phase5-security.md. Workspace membership/role/revision and file ownership remain authoritative. Feature switches only remove availability. Evidence contains no backup bytes, password, session cookie or private customer data. The operator and lab schema owner remain trusted; role isolation is pending deployment proof.

## Interview scenario

A dashboard reports zero accessibility violations, low p95 and a successful restore. Defend only the measured claims: selected automated screens plus keyboard/mobile checks, serial embedded inject timings and a same-version quiesced fixture restore. Propose screen-reader/user testing, realistic native concurrent load, coordinated backup and actual volume restore before a production statement.

## Evidence and status

Six browser workflows, selected pixel baseline, axe JSON, recovery tests, restore fingerprints and conventional timings establish a local v1 baseline. Remote CI/native release gates remain pending. Phase 6 has not started.
