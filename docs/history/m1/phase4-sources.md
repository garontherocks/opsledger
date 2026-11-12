# Phase 4 dependency and source decision

Checked 2026-10-07 UTC. Roadmap requires pg-boss; pinned stable 12.37.0. npm registry reports Node >=22.12.0; actual runtime Node 24.19.0. MIT package, schema version 45. Lockfile governs transitives. No Redis, AI package or file parser introduced. Audit result is in phase4-audit.json, not assumed from package choice.

Primary references read:
- https://github.com/timgit/pg-boss/releases — stable 12.37.0 / schema 45.
- https://pgboss.io/api/jobs — send Db adapter, retry/expiry/retention and settlement options.
- https://pgboss.io/api/queues — bounded queue defaults.
- https://pgboss.io/api/workers — work callback/polling and graceful shutdown.
- https://pgboss.io/api/adapters — enqueue inside the owning SQL transaction.
- https://github.com/timgit/pg-boss/blob/master/docs/database-backends.md — explicit PGlite backend support.

Installed package declarations/source were inspected to bind the implementation to this pin. Tests use the real library and SQL schema through the explicit PGlite backend, without a queue mock. This establishes local behavior, not PostgreSQL 18.6 multi-backend parity. Runtime local bootstrap can migrate pg-boss schema with the lab owner credential; production role separation/bootstrap must be validated separately.
