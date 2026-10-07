# Add durable notification jobs, private incident exports and bounded text attachments

Incident writes now capture notification events atomically, and the pg-boss dispatcher creates recipient-specific jobs transactionally. Members request immutable revision snapshots or bounded UTF-8 text attachments; generated private object keys, hashes and locked operations make repeated delivery safe. Scoped UI/API exposes job progress, bounded retries, deliberate recovery, downloads and cleanup.

Validation includes real pg-boss jobs, enqueue/outbox rollback, controlled crash-point replay, exhaustion/manual repair, quotas, scoped access and private filesystem boundaries, plus existing incident/knowledge browser regressions. Native PostgreSQL, separate worker-process/role deployment, actual process-kill/power-loss behavior and remote CI remain release gates. Local draft only; no remote PR, merge or deployment.
