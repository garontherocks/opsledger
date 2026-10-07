# OpsLedger — Phase 1 execution report

Date: 2026-10-07 UTC. Authorized scope: Phase 1 only.
Branch: feat/incident-first-slice.
Validated source SHA: 9ba5b0cf6c6a113d0c6b376fcaae50a9a97ae0ef.
Status: implementation and local acceptance verified; full phase completion remains pending native PostgreSQL and remote CI evidence. No Phase 2 work, merge, deployment or remote PR.

## Required completion fields

| Field | Result |
|---|---|
| Completed | Authenticated create/list/detail, safe identity/services, minimal UI, database constraints, repeatable migration/seed, startup/readiness, OpenAPI, CI workflow, documentation and evidence. Native clean-checkout acceptance and actual CI execution are incomplete. |
| Architecture | Same-origin React/Vite → Fastify/Zod → Better Auth session → active membership → scoped parameterized pg queries → PostgreSQL constraints. Server owns identity/state/revision/timestamps. Workspace-visible incidents only. Signed keyset cursors bind user/workspace. |
| Validation | Lint, strict typecheck, build, four domain tests, twelve acceptance subtests (13 including parent), one browser E2E, startup smoke, lockfile reinstall, dependency audit and bounded secret review passed locally. Exact commands below. |
| Security | Unknown authority fields rejected; revoked/expired sessions denied; no public signup; workspace/service scoping; composite foreign key; cursor tampering/replay checks; origin enforcement; safe DTOs/errors; body/rate limits; secure production cookies and no production lab seeding. |
| Evidence | evidence/integration.log, unit.log, e2e.log, startup.log, build.log, lint.log, typecheck.log, audit-phase1.json, secret-review.json, incident-detail.png, local-validation.json; docs/openapi.json; migrations/; workflow; source git bundle in the deliverable package. |
| Trade-offs / Debt | PGlite socket is a dev-only, single-connection test harness, reporting server_version 18.3. It does not establish native PostgreSQL 18.6 deployment, durability or concurrent-client parity. Native image pull/Compose and GitHub Actions execution remain unverified. Chromium download fallback is explicit. No snapshot guarantee under concurrent edits. No full accessibility audit. |
| Learning | Validation shapes input; authentication identifies a user; authorization determines permitted workspace access; database constraints protect relationships independently. Tests target actual boundaries and failures. |
| Teach-Back Checkpoint | Mandatory AI/agentic gate is not applicable: this phase introduces none. Optional six-part practical materials are ready in docs/phase1-learning.md; no learner demonstration or learning completion is claimed. |
| Interview Defense | Why a valid UUID or authenticated cookie cannot substitute for workspace authorization, and why the database foreign key complements rather than replaces the user permission check. |
| Next Phase | Phase 2 — Incident state machine and concurrent edits |

## Actual local checks

Runtime: Ubuntu 24.04.3, Node 24.19.0, npm 11.9.0.
Database: pg client over PGlite socket 0.2.11 / PGlite 0.5.8; queried server_version 18.3.
Browser: Playwright 1.64.0 controlling explicitly selected Chromium Headless Shell 141.0.7390.37 (downloaded with Playwright 1.56.1 tooling outside project dependencies). The default requested Chromium 156 download returned invalid ZIP data. Neither that binary nor native PostgreSQL 18.6 is claimed as locally validated.

| Exact command | Observed result |
|---|---|
| npm ci --ignore-scripts | Passed, 265 packages installed from lockfile; deprecation warnings for transitive esbuild-kit packages recorded |
| npm run lint | Passed |
| npm run typecheck | Passed with strict settings |
| npm run build | API/contracts compile and Vite production build passed |
| npm run test:unit | 4 passed, 0 failed/skipped |
| npm run test:integration | 12 subtests + parent passed, 0 failed/skipped; backend/version printed |
| PW_CHROMIUM_EXECUTABLE=/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell npm run test:e2e | 1 passed, retries 0; independent synthetic database |
| node --experimental-strip-types scripts/startup-smoke.ts | Passed: child-process CLI migration twice, seed twice, real API server, readiness, built SPA and seeded login |
| node --experimental-strip-types scripts/openapi.ts | Generated docs/openapi.json without connecting to DB |
| npm audit --json | 0 reported vulnerabilities, including dev dependencies |
| git diff --check | Passed |
| Bounded Python source/evidence secret scan | 77 files scanned at review time; no generated credential or selected private-key/token patterns found; heuristic only |

Build and unit inputs were unchanged by the test-harness shutdown correction. These commands were rerun after a clean dependency reinstall; API/browser/startup also ran against the source SHA above. Later commits contain documentation/evidence only.

## Acceptance coverage

| Cases | Evidence |
|---|---|
| Valid create/persisted detail/reload | API SQL row assertion, browser reload/detail |
| Unicode/length/whitespace/enum/unknown fields | Domain tests and API strict-body negatives |
| No session, expiry, logout/revocation | Better Auth integration and browser signout/reload |
| Foreign/inactive/unknown service, cross-workspace membership | 404 negatives and no-row insertion assertion |
| Safe identity and incident authority | Identity keys asserted; incident DTO schema and server fields verified |
| Stable pagination with equal timestamps | Five fixed-timestamp rows, unique traversal, tamper and user/workspace cursor replay rejection |
| DB unavailable | Separate closed-port pool yields 503 with requestId and no ECONNREFUSED disclosure |
| Origin/Host handling | Host does not define auth base; hostile origin denied |
| Browser usability | Keyboard focus, explicit labels, error and empty states, create/detail/signout; screenshot visually reviewed |

No full accessibility conformance or concurrent-write snapshot claim. The readiness failure case does not validate every failure mapping inside auth-package endpoints.

## Review findings and fixes

- TypeScript 7.0.2 could not satisfy typescript-eslint's supported range. Pinned TypeScript 6.0.3; did not force peer installation.
- Node strip-only execution rejected parameter properties. Replaced them with erasable declarations and assignments.
- Browser acceptance found worker password regeneration and ambiguous wrapped select labels. Preserved the parent fixture password and introduced explicit label associations.
- Startup smoke exposed socket detach running after WASM shutdown. Added an event-loop drain before closing the test database; smoke/API/E2E then passed.
- CLI seed refuses an absent or mismatched credential file when a synthetic account already exists, instead of inventing a replacement password. Repeat seed preserves existing authorization/passwords.
- Internal auth client-IP hint is overwritten with Fastify's direct peer IP; user-submitted forwarding headers are not trusted.

## Remaining completion gates

1. In a fresh checkout, pull/run the pinned native PostgreSQL 18.6 Compose setup and repeat documented startup.
2. Run both native acceptance lanes using independent fresh localhost *_test databases.
3. Publish the branch to an explicitly selected remote repository and obtain actual GitHub Actions logs/artifacts bound to the tested SHA. The workflow is configured and action tag SHAs were resolved, but no CI run exists in this session.

No remote repository or PR was created. A reviewable PR draft is included. Local source/evidence are committed and packaged; no merge or deployment occurred. Phase 0 readiness findings remain historical, not retroactively resolved by PGlite.

Secrets/credentials, local database directories, node_modules, build outputs, browser reports and failure traces are excluded from the package. Failure traces can contain synthetic login data and stay private. Recreate dependencies/builds from source.

## References

- docs/phase1-architecture.md and README.md: scope/startup.
- docs/phase1-learning.md: five questions, request flow, controlled failure, boundary, interview scenario and evidence.
- docs/phase1-pr-draft.md: review summary.
- https://typescript-eslint.io/users/dependency-versions/
- https://pglite.dev/docs/pglite-socket
- https://better-auth.com/docs/reference/security
