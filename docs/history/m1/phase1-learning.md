# Phase 1 learning materials

This phase is deterministic. The mandatory AI/agentic six-item release checkpoint does not apply. The materials below support explaining this slice; no learner answers or demonstration are claimed.

## Five practical questions

1. Why does validating a service UUID not authorize assignment to that service?
2. Which incident fields come from the browser, session and database respectively?
3. Why must a signed cursor still pass workspace membership checks?
4. What does the composite service/workspace foreign key enforce independently of the API?
5. Which conclusions can PGlite acceptance support, and which require native PostgreSQL evidence?

## Request flow to explain

A submitted form sends only title, description, severity and serviceId. Fastify validates the input; Better Auth resolves identity; membership authorizes the selected workspace; a parameterized INSERT repeats membership/service checks; PostgreSQL constraints enforce relationships; a strict DTO returns initial state/revision/timestamps. A reload follows the same auth boundary before reading persisted records.

## Controlled failure

Run `npm run test:integration` using its default transient test DB. Its named subtest “database outage returns 503 with safe correlated envelope” creates a separate pg pool aimed at closed localhost port 1 with a 100 ms connection timeout. It requests readiness and asserts 503, a present requestId and absence of ECONNREFUSED in the response. The reviewed handler emits a fixed safe error envelope. It closes that pool afterwards. No product database is stopped. Evidence: evidence/integration.log and tests/integration.test.ts. This does not establish every upstream outage's status mapping, especially package-owned auth endpoints.

## Security boundary

Authenticated identity is not workspace authority. The membership check denies another workspace with 404; create repeats the check in SQL. The database's composite foreign key separately rejects a mismatched service/workspace pair. Evidence: cross-workspace and foreign-key subtests.

## Interview scenario

A Senior engineer is asked to remove workspace checks because the client only shows permitted workspaces. Explain why a forged request bypasses the UI, where authorization belongs, and why a foreign key alone cannot establish user membership. Defend strict DTOs and safe diagnostic correlation without logging credentials.

## Evidence and status

4 domain tests, 12 acceptance subtests (13 including the parent), one real browser flow, startup smoke and a screenshot. Optional learner demonstration has not occurred. No AI learning completion is claimed.
