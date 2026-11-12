# Phase 4 learning materials

This phase introduces deterministic queueing/storage, not AI or agentic concepts. The mandatory AI teach-back gate does not apply. Optional materials are prepared; no learner demonstration or mastery is claimed.

## Five practical questions

1. Why must pg-boss enqueue use the same SQL client as the operation transaction?
2. What is the difference between delivery deduplication and an idempotent external effect?
3. What happens when a file is durable but its ready metadata has not committed?
4. How do bounded retries become an explicit failure and a deliberate manual recovery?
5. Why must a download recheck membership and use a server-generated storage key?

## Architecture explanation

Explain incident transaction → outbox → dispatcher/send transaction → queue → locked operation → filesystem or notification → DB completion → queue acknowledgement. Identify the two commit gaps and how replay handles each. Use phase4-architecture.md.

## Controlled failure

Run test:integration. Test-only audit/outbox triggers prove transaction rollback. A temporary storage method failure after fsync leaves a pending object; a real pg-boss retry verifies it. Deliberately omit acknowledgement after DB effect commit, fail the claim, then replay and add a duplicate job; only one logical effect remains. Permanent storage failure consumes exactly 3 attempts, then exposes failure; repair plus explicit owner retry succeeds. These are controlled interruption simulations, not OS kill/power-loss tests.

## Security boundary

Caller membership, incident scope, file ownership, conservative UTF-8 input and server UUID paths protect the boundary. Queue messages contain operation ID only. Reads reject symlinks and force downloads as inert attachment text. Database and filesystem operators are trusted; native roles and host/volume guarantees remain deployment checks.

## Interview scenario

A worker commits an export then dies before acknowledging. Another worker sees the job. Explain why redelivery can happen, why its effect must be a no-op, and why claiming “exactly once delivery” would not establish exactly once side effect. Then explain how filesystem-first failure differs from committed DB effect failure.

## Evidence and status

See phase4-job-timeline.json, phase4-storage-cleanup.json, real pg-boss API tests and four browser flows. Native PostgreSQL, actual process kill/power loss, independent worker processes/roles and remote CI are pending. Phase 5 is not started.
