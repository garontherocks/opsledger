# OpsLedger — Phase 2 execution report

Date: 2026-10-07 UTC. Scope: Phase 2 only.
Branch: feat/incident-state-machine.
Validated source SHA: 810b783e30afc942889217154931f58664b79a95.

**Status: implementation and local acceptance verified. Full phase completion is pending native PostgreSQL concurrency/deployment and actual remote CI evidence.** Phase 1's native/CI prerequisites remain unresolved. The user explicitly authorized continuing Phase 2; no earlier pending gate is retroactively claimed complete. No Phase 3 work, merge or deployment.

## Required report fields

| Field | Result |
|---|---|
| Completed | Triage, assignment, investigation, resolution, closing, reopening, comments and paginated activity; role-aware UI; strict action schemas; transactional revision checks; rollback tests; state/RBAC matrix; OpenAPI and CI configuration. Native concurrency validation and actual CI remain incomplete. |
| Architecture | Session identity → locked active membership → scoped locked incident → server role/revision/domain policy → guarded update → activity/comment inserts → commit. The domain module has no persistence dependency. A fixed state machine is used. |
| Validation | Lint, strict typecheck, build, 6 domain tests, 23 passing API/DB results including 2 parent tests, 1 native-only test skipped, 2 browser E2Es and startup smoke. Dependency audit reports 0 vulnerabilities. Bounded secret scan reports no hits. Commands and evidence below. |
| Security | Server-loaded roles and active memberships; no implicit admin/editor lead privileges; cross-workspace 404; unknown authority fields rejected; qualified active assignment; guarded revisions; safe correlated errors; transaction rollback; existing session/origin/body/rate protections retained. |
| Evidence | Migration 0002, docs/openapi.json, phase2-architecture.md state diagram, phase2-integration.log, phase2-concurrency.json, phase2-e2e.log, screenshots, unit/build/typecheck/lint/startup logs, dependency and secret reviews, source history bundle. |
| Trade-offs / Debt | PGlite socket reports PostgreSQL version 18.3 but serializes SQL through one pooled client. Its overlapping HTTP/two-tab tests do not prove native backend locking. Native PostgreSQL 18.4 binaries were obtained, but this environment denies changing user/group; PostgreSQL cannot run as root. Target remains 18.6. Remote CI, default Chromium download parity, native upgrade/deployment and full accessibility assessment are pending. No generic workflow engine, independently tamper-proof audit system or Phase 3 scope. |
| Learning | Revision checks reject stale intent; row locking and transactions protect update/history invariants; authorization is independent of UI button visibility. A later failed comment insert must roll back the earlier activity and incident update. |
| Teach-Back Checkpoint | Mandatory AI/agentic gate does not apply: no AI/agentic concept is introduced. Optional six-part materials with exactly five questions are ready; learner demonstration has not occurred and learning completion is not claimed. |
| Interview Defense | Why two users with valid permissions cannot both commit expectedRevision 1, why automatic retry would overwrite intent, and what local serialized SQL evidence cannot establish about independent native backends. |
| Next Phase | Phase 3 — Knowledge, search and audit |

## Actual commands and results

| Command | Result / artifact |
|---|---|
| npm run lint | Passed; evidence/phase2-lint.log |
| npm run typecheck | Passed; evidence/phase2-typecheck.log |
| npm run build | Passed; API/contracts compile and Vite build; phase2-build.log |
| npm run test:unit | 6 passed; includes 175 state/action/role combinations; phase2-unit.log |
| npm run test:integration | 24 total results: 23 passed, 0 failed, 1 skipped; phase2-integration.log |
| PW_CHROMIUM_EXECUTABLE=/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell npm run test:e2e | 2 passed, retries 0; phase2-e2e.log |
| node --experimental-strip-types scripts/startup-smoke.ts | Passed: migrations and synthetic seed twice, real server, readiness, built SPA and seeded login; phase2-startup.log |
| node --experimental-strip-types scripts/openapi.ts | Generated the current action/history OpenAPI contracts |
| npm audit --json | 0 reported vulnerabilities; phase2-audit.json |
| git diff --check | Passed |
| Bounded Python source/evidence review | 104 files scanned at review time; 0 generated credential/selected secret-pattern hits; phase2-secret-review.json |

Environment remains Node 24.19.0, npm 11.9.0, Ubuntu 24.04.3. Browser driver is Playwright 1.64.0 with the explicit previously downloaded Chromium Headless Shell 141.0.7390.37 override. Project dependency versions were not expanded for Phase 2. The native binary download was external test tooling and is excluded from the distributable.

The integration runner shares a generated synthetic password across sequential test files for a fresh native CI database. Seeds preserve existing accounts and privileges; they never overwrite passwords. PGlite test files use separate transient databases.

## Acceptance and failure evidence

- Full legal lifecycle, reassignment, comment persistence, resolution retention, reopening and descending revision history.
- Exhaustive domain permission/transition matrix. Reporter/editor/admin cannot triage; responder cannot resolve; another workspace or revoked member cannot act/read history.
- Strict schemas reject missing revision, missing/blank resolution/reopen reason and injected authority fields.
- Foreign/inactive/unqualified assignees are denied without history writes.
- Reopening can atomically select an active replacement for a revoked assignee. Closing does not require the former assignee still to be active.
- Stale comments return 409 revision_conflict and create no comment.
- Test-only trigger failure at activity insertion rolls back incident revision.
- A separate trigger failure at comment insertion rolls back the earlier activity insertion and incident revision.
- The DB check rejects resolved state without a non-null resolution (SQLSTATE 23514 asserted).
- Overlapping HTTP actions yield 200/409, final revision 2 and exactly one activity entry. The JSON trace explicitly identifies serialized PGlite SQL.
- Browser regression preserves the original report/reload/signout flow. The second E2E covers lifecycle/reload and two tabs: a stale comment is rejected, the draft remains, and explicit refresh gets the current revision.
- Screenshots were visually inspected; no accessibility conformance claim is made.

The SQL constraint-negative test leases a client explicitly rather than discarding/reopening it after the expected statement error. This avoids a single-connection socket-adapter reconnect race and still asserts the actual database constraint code. No application retry or error suppression was introduced.

## Native and CI gates

The native-only test is present but **not executed** locally. It holds a controlled incident row lock, starts two domain commands and requires two distinct backend PIDs waiting in pg_stat_activity before releasing the lock. Expected result: one commit, one revision conflict, one history entry. This is stronger than merely observing two HTTP requests.

Attempts to install system PostgreSQL were blocked by network policy. Native 18.4 binary extraction succeeded, but chown returned Invalid argument and runuser could not set groups. No root-safety bypass was attempted and no native database was started. See phase2-native-blocked.json.

To complete:
1. Run the documented upgrade/startup and API/browser lanes with fresh native PostgreSQL 18.6 databases.
2. Execute the native barrier test and retain phase2-native-concurrency.json.
3. Obtain real GitHub Actions results/artifacts bound to the source commit. The workflow has independent API/browser databases and publishes Phase 2 evidence; configuration is not execution evidence.

No remote repository, PR, merge or deployment was created. A Phase 2 PR draft is included. Historical Phase 1 screenshots/reports are preserved. The package excludes credentials, local databases, native binaries, node_modules, build outputs and private browser failure traces/reports.

## Learning and review material

See docs/phase2-learning.md for five questions, transaction flow, controlled failure, trust boundary, interview scenario and evidence. See docs/phase2-architecture.md for the state diagram, API and role matrix. README documents startup/upgrade and synthetic operational identities.
