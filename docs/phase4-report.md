# OpsLedger — Phase 4 execution report

Date: 2026-10-07 America/Buenos_Aires; logs use UTC.
Scope: Phase 4 only. Branch: feat/reliable-async-files.
Validated source SHA: d215196986a1186a21ee88f2b4fddece7565ee24.

**Status: implementation and local single-process worker acceptance verified. Full phase completion remains gated by native PostgreSQL/worker/volume deployment and actual remote CI.** The user authorized continuing from Phase 3 despite the earlier pending gates; none is retroactively claimed complete. A separate API/worker Node-process attempt disconnected in the PGlite socket harness. That is a recorded deployment limitation, not passing evidence. Phase 5 has not started. No remote PR, merge or deployment.

## Required report fields

| Field | Result |
|---|---|
| Completed | Durable incident notification outbox; transactional pg-boss enqueue; recipient-specific in-app notifications/read receipts; fixed-revision incident JSON exports; bounded UTF-8 text attachments; scoped private downloads; idempotent storage effects/removal; retry exhaustion and deliberate recovery; operation timeline/history; quotas and orphan sweep; UI, contracts, OpenAPI, CI and optional private-volume runtime configuration. Native/separate-process deployment remains incomplete. |
| Architecture | Incident/audit/history transaction → durable outbox → dispatcher enqueue transaction; file request/snapshot/metadata/audit and pg-boss send share a SQL client. Worker locks operation, performs idempotent effect, commits metadata, then queue acknowledges. Filesystem effects use generated UUID key, size/hash, fsync and atomic non-overwriting hard link. |
| Validation | Clean locked install, lint/typecheck/build, 9 unit tests, 48 passing integration results including 4 parent results, 1 native-only skip, 4 passing browser flows and startup smoke. Real pg-boss 12.37.0/schema 45, not a queue mock. Dependency audit: 0 vulnerabilities. Bounded secret review: 175 files, 0 hits. |
| Security | Strict UUID-only jobs; server membership/scope/revision; recipient/requester ownership; composite scope FKs; canonical bounded base64 UTF-8; conservative names; generated file paths; root 0700/files 0600; no-follow reads/hash check; forced attachment/nosniff/no-store; bounded queue/file budgets; safe status/error metadata. Native role separation remains unverified. |
| Evidence | Migration 0004, OpenAPI, architecture/ACL matrix, job timeline JSON, cleanup JSON, worker deployment gate JSON, final install/unit/integration/browser/startup/build/lint/typecheck/audit/secret evidence, five screenshots, source/history bundle and checksum manifest. |
| Trade-offs / Debt | Local PGlite serializes SQL (server_version 18.3); independent native backends are not proven. Controlled crash-point errors/omitted acknowledgement replace actual process-kill/power-loss tests. Separate-process PGlite smoke failed. Native PostgreSQL 18.6, Docker image/named volume, multi-worker behavior, least-privilege roles and remote CI remain pending. Text-only attachments, bounded export history, simple notification UI, FIFO outbox fairness and permanent DB metadata retention remain limitations. |
| Learning | Atomic durable enqueue prevents a committed request from losing its job. It does not make filesystem effects transactional or delivery exactly once. Idempotent effect identity and replay verification protect the two commit gaps. |
| Teach-Back Checkpoint | No AI/agentic concept introduced; mandatory AI teach-back gate is not applicable. Optional six-part material with exactly five questions is ready; learner demonstration/mastery has not occurred. |
| Interview Defense | Explain domain outbox vs direct transactional enqueue, filesystem-before-metadata and metadata-before-ack crash gaps, effect identity vs job delivery, bounded retry/exhaustion/manual repair, scope/credential separation and the limits of embedded evidence. |
| Next Phase | Phase 5 — Deterministic v1 and quality baseline |

## Actual commands and results

| Command | Actual result / evidence |
|---|---|
| npm ci --ignore-scripts | Passed locked clean install; phase4-clean-install.log |
| npm run lint | Passed; phase4-lint.log |
| npm run typecheck | Passed; phase4-typecheck.log |
| npm run build | Passed API/contracts compile and Vite build; phase4-build.log |
| npm run test:unit | 9 passed, 0 failed; phase4-unit.log |
| npm run test:integration | 49 total results: 48 passed, 0 failed, 1 native-only skip; phase4-integration.log |
| PW_CHROMIUM_EXECUTABLE=/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell npm run test:e2e | 4 separate server flows passed; retries 0; phase4-e2e.log |
| node --experimental-strip-types scripts/startup-smoke.ts | Passed repeat migrations/seed, real API process with queue startup, readiness, built SPA and retained seeded login; phase4-startup.log. Separate worker processing is not part of this passing smoke. |
| node --experimental-strip-types scripts/openapi.ts | Current incident/knowledge/async/file/notification contracts generated; phase4-openapi.log |
| npm audit --json | 0 reported vulnerabilities; phase4-audit.json |
| git diff --check | Passed |
| Bounded source/evidence secret review | 175 files reviewed, no generated credential or selected secret-pattern hits; phase4-secret-review.json |

Runtime remains Node 24.19.0, npm 11.9.0, Ubuntu 24.04.3. Browser driver Playwright 1.64.0 uses the previously downloaded Chromium Headless Shell 141.0.7390.37 override. New direct runtime dependency: pg-boss 12.37.0, MIT, Node >=22.12.0. Exact lockfile governs its transitives. Schema version 45 is installed by local bootstrap. No Redis, file parser, rich rendering, scanner or AI dependency. Primary references and dependency rationale are in phase4-sources.md.

## Recovery, isolation and cleanup evidence

- A matching request key returns the same operation; changed input conflicts. New exports require current revision and capture that snapshot before enqueue; later incident changes do not change its downloaded revision.
- An audit failure after real queue insertion rolls back the operation, file metadata and queue job. An outbox trigger failure after an incident action rolls back incident revision, activity/comment and audit.
- Strict text validation rejects unsafe paths/types/controls, invalid/noncanonical base64, invalid UTF-8, NUL and oversize content. Attachments are 1–16 KiB, conservative .txt names; markup remains literal downloaded text.
- Export download is requester-only. Attachment download requires active workspace membership. Removal requires owner or workspace lead/admin; operation detail/history/retry and notification receipts are requester/recipient-only. Cross-workspace composite FKs reject invalid file scope at the DB boundary.
- Controlled failure after a durable filesystem write but before metadata commit leaves one pending object; actual pg-boss fail/retry reuses/verifies that object and completes on attempt 2.
- Deliberately omit acknowledgement after an effect commits, then fail/retry the claimed job and send another duplicate job. Application attempts stay 1 and exactly one effect_committed event remains. No repeated logical export effect.
- A permanent storage failure exhausts 3 actual attempts (retryCount 2), becomes failed with retry_exhausted, then an explicit owner retry after repair completes at cumulative attempt 4. Another user's retry is 404; completed work cannot retry. At most 2 manual resubmissions are allowed.
- Notification outbox remains durable while no worker is running. Transactional dispatch plus repeated dispatch/delivery yields one notification per event/recipient. Read receipts and pagination are scoped; revoked requesters cancel unpublished work.
- A pending file cannot be removed while work is queued. Failed/cancelled queue work can be discarded; cleanup scrubs retained payload after deletion, and retry cannot resurrect removed files.
- The 21st pending attachment is rejected without another job or metadata row. Limits also include 100 pending workspace operations, 20 live incident attachments, 100 live workspace files, 8 MiB workspace storage and 256 KiB export size. These limits do not impose permanent DB metadata retention.
- Cleanup deletes the removed attachment and 3 stale unknown UUID entries (orphan blob, temporary file, symlink), retains 24 known files in the final fixture, preserves the external symlink target and confirms root mode 0700. Known pending objects are preserved for recovery.
- Four browser flows preserve incident/reload/signout, lifecycle/stale-tab and knowledge publication behavior, plus a real polling worker delivering export, text attachment, cleanup and recipient notification/read. Download headers, snapshot content and inert markup are asserted. JSON Content-Type is emitted only when a request has a body, fixing empty DELETE behavior.
- Five final screenshots were visually inspected. No accessibility conformance claim is made.

See phase4-job-timeline.json and phase4-storage-cleanup.json. Crash-point tests deliberately use controlled exceptions/omitted completion and real queue settlement; they do not claim an OS-killed worker, storage power loss or independently concurrent native backends.

## Deployment and release gates

The local E2E harness shares one SQL pool and runs the real worker callback/poller in the API test server process. Default integration tests use separate transient PGlite databases per test file. The native CI runner retains a generated fixture password across its fresh job database; native API and browser jobs remain separate. Browser flows have separate server lifetimes and unchanged production rate limits.

An exploratory separate API/worker Node-process smoke against the PGlite socket harness failed at worker queue startup with Connection terminated unexpectedly. It was stopped, recorded in phase4-worker-deployment-gate.json and excluded from passing startup evidence. The original repeat-startup smoke was rerun and passed. This local adapter failure does not establish a native deployment failure or success.

Inherited native barrier/concurrency test remains skipped. Phase 2 obtained native 18.4 binaries but user/group changes were denied; PostgreSQL cannot run as root. No bypass or repeated native installation attempt was made. Target remains PostgreSQL 18.6. The optional Compose runtime profile configures API and worker with a non-root Node image, private shared named volume and localhost API port; it was not built/run here and no image digest is claimed. Host startup uses the same absolute private directory in API/worker. Runtime lab bootstrap currently uses broad schema-owner credentials; JOB_DATABASE_URL can select a separate worker credential but production least-privilege installation/grants remain unverified.

Remaining gates:
1. Validate Phase 3 → 4 upgrade, retained incidents/passwords/checksums and pg-boss schema bootstrap on native PostgreSQL 18.6.
2. Validate API and worker as separate processes/roles against the same private volume; independent worker claims, expiry/recovery and the earlier row-lock barrier.
3. Perform actual process-kill/power-loss and volume durability/permissions checks on the deployment environment.
4. Obtain actual remote CI results/artifacts tied to the validated commit. .github/workflows/phase4.yml is configured; configuration is not execution evidence.

Other debt: FIFO outbox selection can hold up later work when the earliest workspace is full; durable rows remain. Notification UI shows state/revision; incident IDs are available in the API, but deep links await polish. Export history is the newest 50 entries, not an unlimited archive. Temporary/orphan/queue retention is bounded; operation, outbox and audit metadata retention is not. Database and filesystem administrators are trusted. Content/audit SQL protections are not independent tamper evidence. File scanning and untrusted rich formats are deliberately deferred.

No remote repository, PR, push, merge or deployment was created. Origin is a local Phase 0 checkout. Historical Phase 1–3 evidence remains intact. Delivery excludes .env, generated credentials, local databases/storage, dependencies, builds, external native binaries and private browser failure reports/traces. The package contains tracked source/evidence, a complete git-history bundle and checksum manifest. See README, phase4-architecture.md, phase4-learning.md and phase4-pr-draft.md. Phase 5 is named only and has not started.
