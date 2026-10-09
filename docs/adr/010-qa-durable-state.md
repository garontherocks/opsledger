# ADR 010 — Explicit PostgreSQL durability before a graph runtime

Status: selected in Phase 15, retained in Phase 16.

Separate signed typed run state, append-only history, reviewed expiring risk metadata, workflow leases, immutable check receipts and approval/report records. Use the existing PostgreSQL and application membership/transaction model; no second vector memory store or implicit persistent instructions.

Actual [LangGraph 1.4.21 spike](../../evidence/phase15-runtime-spike.json) demonstrated interrupt/resume and node replay, and showed a new RAM saver loses old state. This does not evaluate PostgresSaver or prove framework inferiority. Current official [persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence), [interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts), [PostgreSQL 18 locks](https://www.postgresql.org/docs/18/explicit-locking.html) and [node-postgres transactions](https://node-postgres.com/features/transactions) were checked on 2026-10-09.

Retain the direct controller because the current linear four-check/one-effect workflow needs no additional graph capability. Provenance, current auth, expiry, idempotency and authority stay in application code under either runtime. A durable runtime comparison may be justified later by actual branching/recovery requirements, not résumé keywords. No local-model compatibility or performance claim for LangGraph; no framework package added to the repository.
