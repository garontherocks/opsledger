# Phase 1 architecture

Browser → same-origin Fastify API → strict Zod contract → Better Auth database session → active workspace membership → scoped pg SQL → PostgreSQL constraints → safe response DTO.

Auth owns password hashing, expiry and cookies. Cookie caching and public signup are disabled. The server chooses reporter identity, initial reported state, revision 1 and UTC timestamps. Clients cannot submit authority fields. Phase 1 visibility is every incident in an actively joined workspace; no state transitions or generalized RBAC engine.

Create repeats membership/service checks in its INSERT. The composite foreign key enforces service/workspace consistency. Reads use workspace and incident ID together. Unknown and unauthorized resources return the same 404. DTOs exclude credentials/session/database internals.

Keyset pagination sorts created_at and UUID descending. The HMAC cursor is bound to workspace and user. Equal timestamps have stable traversal on an unchanged dataset. Pagination is not a concurrent-edit snapshot.

Security includes origin/Fetch Metadata checks, a restrictive CSP, bounded bodies, rate limiting and secure cookies in production. Auth's private client-IP header is overwritten with Fastify's direct peer IP; submitted forwarding headers do not define identity. Deployment behind proxies requires a separately reviewed configuration.

Migration SQL is ordered and checksummed under an advisory transaction lock. Editing applied migrations fails. Seeds insert stable synthetic data, never overwrite authorization/passwords or erase incidents. Lost credential files require recovery or a fresh disposable DB; generating a different file does not update existing accounts.

The product requires pg/PostgreSQL. PGlite/socket are dev-only SQL test tools. Their single-connection execution does not prove native deployment, durability or concurrent-client parity. CI targets independent fresh PostgreSQL 18.6 containers. A configured workflow does not prove a CI run.

TypeScript 6.0.3 replaces the incompatible 7.0.2 proposal because typescript-eslint 8.71.1 supports versions below 6.1. No force-install. Node-compatible erasable syntax is checked by typecheck and execution. Phase 0 probes remain outside workspace checks.

No AI/model, worker, vector, attachments or Phase 2 work.
