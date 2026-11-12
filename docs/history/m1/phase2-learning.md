# Phase 2 learning materials

This phase is deterministic. The mandatory AI/agentic teach-back release gate does not apply. Optional materials are ready; no learner demonstration is claimed.

## Five practical questions

1. Why does checking expectedRevision only in the browser still allow lost updates?
2. Which records must roll back together when a comment insertion fails?
3. Why can a workspace admin not automatically resolve an incident?
4. Why does the server check stale revision before applying the current-state transition rule?
5. What does the two-tab/PGlite result prove, and what remains for two native PostgreSQL backends?

## Architecture explanation

Explain this scoped flow without assistance: session identity → locked active membership → locked incident → role/revision/domain checks → guarded update → activity/comment inserts → commit. Show where the 409 exits and where a failed insert triggers rollback. Use the state diagram in phase2-architecture.md.

## Controlled failure

Run npm run test:integration with the default transient synthetic databases. The Phase 2 suite creates a test-only trigger which raises during an activity insert, then a separate trigger which raises during a comment insert after the activity has been inserted. Both requests return safe 500 errors. Assertions verify revision 1 and zero persisted activity; no product endpoint exposes fault injection. Finally blocks remove each trigger/function. Evidence: phase2-integration.log and the named rollback subtests.

## Security boundary

Identity does not grant object actions. Active workspace membership, server-loaded role and scoped incident ID authorize the operation. Strict request schemas deny role/reporter/state injection. Another workspace receives 404; a reporter/editor/admin attempting triage receives 403.

## Interview scenario

Two responders open revision 1 and submit different assignments. Explain why one command must lose with a conflict, why retrying silently would discard the first user's intent, and how transactionally bound history proves the winning command. Explain the native test's controlled lock and why local PGlite evidence alone cannot validate independent backend locking.

## Evidence and status

Six domain tests include a 175-combination state/action/role matrix. API/DB regressions include atomic rollback, invalid actions, scoped assignment, stale writes and overlapping HTTP requests. Two browser flows include stale tabs and a persisted lifecycle. Native concurrent-backend evidence is pending; learner demonstration is not recorded.
