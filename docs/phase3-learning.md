# Phase 3 learning materials

No AI/agentic concept is introduced; its mandatory teach-back gate is not applicable. Optional materials below are ready; learner demonstration has not occurred.

## Five practical questions

1. Why must a citation identify a numbered version rather than just a runbook head?
2. Why does withdrawing the current publication not restore an older version automatically?
3. Which scope and ordering fields must a pagination cursor bind, and why preserve microseconds?
4. Which writes roll back if metadata audit insertion fails?
5. What can UPDATE/DELETE audit triggers establish, and what can privileged database operators bypass?

## Architecture explanation

Explain session identity → locked membership → scoped locked head → role/revision → immutable version or status change → metadata audit → commit. Use phase3-architecture.md publication diagram and explain why search current-version policy differs from historical citation access.

## Controlled failure

Run test:integration. The Phase 3 suite installs a test-only trigger that raises during audit insertion. Assert safe 500 and absence of new runbook/incident, unchanged incident revision/activity/comment. Finally remove trigger/function. Product endpoints expose no fault injection.

## Security boundary

Draft access, service scope and workspace identity are server policies. Browser hiding is not authorization. Markdown is escaped text, and malicious stored strings cannot introduce executable nodes. An audit administrator does not automatically become an incident lead.

## Interview scenario

An editor publishes version 2 while another editor still sees head revision 2. Explain stale-command rejection, unchanged version 1 hash, why a withdrawn version returns 404 to a reader and how the metadata event shares the successful write transaction. Explain the limits of local serialized PGlite evidence.

## Evidence and status

See Phase 3 integration/domain/browser logs, query/ACL JSON, screenshots and report. Native PostgreSQL and remote CI remain pending. No learning mastery or full phase release is claimed.
