# ADR 004: Authentication Does Not Grant Domain Authority
Status: Accepted; live integration gate pending.

Problem: session identity must not become cross-workspace/object authority.
Decision: Better Auth + Drizzle adapter 1.7.7; seeded local email/password, database sessions, no OAuth/Magic Link/SSO/public signup. Domain authorization checks every action/query.
Alternatives: own password/session implementation adds risk; cloud auth is unnecessary.
Consequences: preserve full Set-Cookie handling, fixed trusted baseURL and origin checks; no raw session DTO exposed.
Validation: adapter construction/typecheck now; signup disable/sign-in/session/revocation/origin and rate-limit concurrency on live DB before full readiness.
