# Deterministic v1 consolidated security review

Review scope: current auth, workspace incident lifecycle, versioned knowledge, asynchronous exports/text files, notifications and server flags. This is a bounded source/dependency/test review, not independent penetration testing. No critical auth/data-integrity defect is currently identified in this scope; release confidence remains limited by native deployment gates.

| Boundary / threat | Current control and evidence | Remaining limitation |
|---|---|---|
| Browser → API: cross-site commands/session theft | Better Auth DB sessions/closed signup, Origin and fetch-site checks, direct-peer auth rate limits, logout/revocation tests, CSP/self and nosniff | HTTPS enforced by production configuration; deployed TLS/proxy behavior unverified |
| Caller → workspace/object: tenant leakage or privilege escalation | Active membership on reads/writes; roles; scoped SQL/composite FKs; own operation/export/notification; denial/stale-write tests | Lab schema-owner privilege; separate native grants pending |
| Commands → DB: partial revision/history/audit/job commit | Single-client transaction; expected revisions; row locks; enqueue in same TX; rollback-trigger tests | Independent native concurrency barrier not proven in embedded harness |
| Stored knowledge → browser: script execution/tampering | React-escaped literal body, immutable SQL versions/hash and publication scope; malicious fixture and audit guards | SQL administrator trusted; no independent tamper-evidence service |
| Queue → effects: forged payload/duplicate replay | UUID operation-only jobs; lookup/locks; effect identity/hash; bounded retries/quota; scope recheck | Actual process kill, multi-worker claims and least-privilege roles pending |
| File metadata → filesystem/download: traversal/symlink/unsafe content | Server UUID paths, no-follow read, 0700 root/0600 files, bounded canonical UTF-8 .txt, forced attachment/no-store/hash, orphan sweep | Real shared-volume permissions/power-loss not proven; no rich formats/scanner |
| Availability: dependency/storage outage/unbounded work | Safe 503 with request reference; explicit refresh; timeout/no silent write retry; quotas/retry exhaustion; server maintenance flags | Metadata retention and FIFO fairness remain debt; no distributed/global rate-limit claim |
| Backup → restored service: inconsistent DB/files/credential exposure | Isolated quiesced dump and file copy, exact DB fingerprints/checksums/hash/scope/auth verification; temporary backup removed | Same-version embedded restore only; native coordinated backup, encryption, retention and PITR runbook unverified |

Dependency change: dev-only @axe-core/playwright 4.13.0 (MPL-2.0) for concrete accessibility checks; axe-core is its transitively locked engine. No AI SDK/model, telemetry collector, parser or external runtime service is introduced. Audit results and lockfile hash are evidence, not a guarantee of safety. Re-run audit for later dependency changes.

Client errors do not expose DB error strings or credentials. Selected safe request IDs are user-visible for correlation. Browser recording starts after synthetic authentication; private failure traces/reports, credentials, backup bytes and local storage are excluded from delivery. Source secret review is bounded to tracked deliverables and known generated credential/pattern checks.

Open deployment risks are listed in phase5-architecture.md and inherited phase4-worker-deployment-gate.json. Do not relabel these as fixed, or infer AI readiness from local test passes. No AI trust boundary exists in v1.
