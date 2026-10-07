# OpsLedger — Phase 3 execution report

Date: 2026-10-07 UTC. Scope: Phase 3 only.
Branch: feat/knowledge-search-audit.
Validated source SHA: 701bf77816f9e1e1e6b5c1beb6dfef8b0f035250.

**Status: implementation and local acceptance verified. Full phase completion remains pending native PostgreSQL deployment/concurrency and actual remote CI evidence.** The user authorized proceeding beyond the earlier pending gates. Those gates are preserved, not retroactively claimed complete. Phase 4 has not started; no remote PR, merge or deployment.

## Required report fields

| Field | Result |
|---|---|
| Completed | Immutable numbered runbook content, draft/publish/withdraw lifecycle, stable version/hash addresses, scoped keyword search with filters/sorting/keyset pagination, knowledge UI, metadata audit API/UI, atomic incident/knowledge audit, synthetic corpus, role/query matrix and regressions. Native/remote acceptance remains incomplete. |
| Architecture | Session → server-loaded membership → scoped object → role/revision → immutable content or publication pointer → metadata audit → commit. Search uses PostgreSQL generated tsvector/GIN and parameterized websearch_to_tsquery. No model dependency. |
| Validation | Lint/typecheck/build, 8 unit tests, 35 passing integration results including 3 parent results, 1 native-only skip, 3 browser flows and startup smoke. Dependency audit: 0 vulnerabilities. Bounded secret review: 142 files, 0 hits. |
| Security | Active workspace scope and roles, restricted drafts/withdrawals, strict input, revision conflicts, inert Markdown, canonical content hash, immutable SQL content, scoped signed cursors, safe request IDs, atomic audit writes, metadata-only denials and retained production rate limits. |
| Evidence | Migration 0003, OpenAPI, phase3-architecture.md ACL/query matrix, phase3-query-acl.json, final unit/integration/browser/startup/build/lint/typecheck logs, three screenshots, dependency audit and secret review. Source history bundle in package. |
| Trade-offs / Debt | PGlite serializes SQL and reports PostgreSQL 18.3. Native target is 18.6, locally unexecuted; actual remote CI missing. Literal Markdown rather than rich rendering, simple keyword search without relevance ranking or stemming, non-snapshot keyset pagination, no independent tamper-evident audit. Accessibility conformance and default browser-download parity unverified. |
| Learning | Version content and publication state are separate; a stable citation identifies immutable content even while reader access can change. Audit failure must roll back the domain action. Cursor timestamp precision must match SQL ordering. |
| Teach-Back Checkpoint | Mandatory AI/agentic gate is not applicable: no AI concept is introduced. Optional six-part materials with exactly five questions are ready. Learner demonstration and mastery have not occurred. |
| Interview Defense | Explain immutable version/hash versus current publication pointer, withdrawal without fallback, draft ACL, scoped keyset pagination, transactional audit, privileged DB bypass and why serialized PGlite is not native concurrency evidence. |
| Next Phase | Phase 4 — Reliable async operations and files |

## Actual commands and results

| Command | Actual result / artifact |
|---|---|
| npm run lint | Passed; phase3-lint.log |
| npm run typecheck | Passed; phase3-typecheck.log |
| npm run build | Passed; API/contracts compile and Vite build; phase3-build.log |
| npm run test:unit | 8 passed; 0 failed; phase3-unit.log |
| npm run test:integration | 36 total results: 35 passed, 0 failed, 1 native-only skip; phase3-integration.log |
| PW_CHROMIUM_EXECUTABLE=/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell npm run test:e2e | All 3 separate server flows passed; retries 0; phase3-e2e.log |
| node --experimental-strip-types scripts/startup-smoke.ts | Passed repeated migrations/seed, real server readiness, built SPA and retained seeded login; phase3-startup.log |
| node --experimental-strip-types scripts/openapi.ts | Current incident/knowledge/audit contracts generated; phase3-openapi.log |
| npm audit --json | 0 reported vulnerabilities; phase3-audit.json |
| git diff --check | Passed |
| Bounded source/evidence secret review | 142 files reviewed; no generated credential or selected secret-pattern hits; phase3-secret-review.json |

Runtime: Node 24.19.0, npm 11.9.0, Ubuntu 24.04.3. Playwright 1.64.0 uses the explicit previously downloaded Chromium Headless Shell 141.0.7390.37 override locally. No dependency was introduced or expanded in Phase 3. External Phase 2 native binaries are excluded from delivery.

## Acceptance and controlled failure

- Idempotent 24-runbook synthetic corpus across North/South; initially 18 current North publications. Equal titles/timestamps, draft, withdrawal, old withdrawn v1/current v2 and malicious Markdown are fixtures, not real operational content.
- Parameterized keyword search, category/service filters, both sorts and bounded paging. Equal-key and sub-millisecond tests return each fixture exactly once. Signed cursor reuse with changed query/sort/category/user/workspace is rejected. Incident cursors also preserve SQL timestamp microseconds.
- Draft/withdrawn versions return 404 to readers; management searches return 403 to readers; cross-workspace and revoked accesses are denied. Unknown authority fields and malformed revisions/cursors are rejected.
- Append version 2 without changing version 1 body/hash. Publish explicit versions with guarded head revision, reject stale writes, then withdraw current v2 without exposing v1 as current search output. Older still-published version addresses remain stable until withdrawal.
- SQL UPDATE/DELETE constraints reject content/scope/audit mutations with asserted SQLSTATE 23514. Test clients are explicitly leased on expected database errors, avoiding a socket reconnection race without suppressing or retrying product errors.
- A test-only audit trigger failure rolls back new knowledge, incident creation and incident action/history/comment. Safe 500 envelopes reveal no SQL details. Finally blocks remove fault injection; no product endpoint offers it.
- Audit results are bounded, workspace-scoped and contain actor/action/object/revision/request/time metadata, never body/password. Authenticated denials produce best-effort events only in a workspace where the actor has a membership record. Successful domain writes are atomically audited.
- Incident workflow completes while the runbooks table is temporarily unavailable. There is no knowledge/AI dependency in incident processing.
- Browser editor flow verifies create/publish/append/citation/withdraw/audit plus inert malicious Markdown. Stored HTML creates no script/image/iframe/javascript-link nodes and no execution side effect. Original incident/reload/signout and lead lifecycle/stale-tab flows still pass. Incorrect-password session failure is covered by API acceptance.
- Initial combined browser execution exhausted shared request limits. Final runner starts a new app lifetime per flow, preserving the production 100/minute limit. An explicit 101-request API regression verifies a safe 429. Default local flows each have fresh PGlite databases; native browser flows share their fresh job database and generated password, while API/browser CI jobs remain independent.
- Three screenshots were visually inspected. No accessibility conformance claim is made.

## Limits and pending gates

Audit UPDATE/DELETE triggers do not prevent privileged DDL/TRUNCATE or administrator bypass, and publication policy is enforced by application transactions. This is not independently tamper-evident storage. Existing incident history remains intact; no pre-migration audit backfill was fabricated. Search cursors order a live dataset, not a fixed snapshot. Withdrawn citations preserve content for editor/admin review while revoking ordinary-reader access. Markdown is escaped literal text rather than rich HTML rendering.

Local PGlite uses PostgreSQL protocol over one SQL connection; its overlap/two-tab tests do not establish independent native-backend locking. The Phase 2 native barrier test still explicitly skips. Phase 2 attempts obtained native 18.4 binaries, but this environment denied user/group changes and PostgreSQL cannot run as root. No bypass or additional futile native attempt was made. Target remains PostgreSQL 18.6. See historical phase2-native-blocked.json.

To finish the release gates:
1. Execute the documented Phase 2 → Phase 3 migration/startup/seed upgrade on native PostgreSQL 18.6; retain existing incidents, passwords and history.
2. Run fresh native API/browser acceptance lanes, including the distinct-backend row-lock barrier, and retain evidence.
3. Obtain actual remote CI results/artifacts tied to this source commit. .github/workflows/phase3.yml is configured for independent native API/browser jobs; configuration is not execution evidence.

The git origin is a local Phase 0 checkout, not a remote GitHub repository. No remote PR, push, merge or deployment occurred. docs/phase3-pr-draft.md is a reviewable local draft. Historical Phase 1/2 reports and screenshots remain intact. Delivery excludes credentials, local databases, dependencies, builds, native binaries and private failure traces/reports. The package includes tracked source/evidence, a complete git-history bundle and a checksum manifest.

See phase3-architecture.md for ACL/query matrix and publication diagram, phase3-learning.md for six optional learning components and README for native startup, upgrade, identities and corpus use. Phase 4 is named only; its implementation is not authorized or started.
