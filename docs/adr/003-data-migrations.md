# ADR 003: PostgreSQL and Reviewed SQL Migrations
Status: Accepted; live integration gate pending.

Problem: realistic transactions/concurrency and future vectors without another database.
Decision: PostgreSQL 18.6, Drizzle 0.45.3, Kit 0.31.11 stable, node-postgres. Generate/review/apply SQL migrations; no push on shared environments.
Alternatives: SQLite reduces parity; Drizzle RC unnecessary; Prisma/Kysely remain fallbacks only if measured incompatibility.
Consequences: DB setup required. Parameterized SQL construction is verified separately from server round-trip.
Validation: isolated migration/rollback/constraint and real auth session tests required; no false completion without DB.
