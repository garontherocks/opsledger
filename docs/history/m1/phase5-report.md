# OpsLedger — Phase 5 execution report

Date: 2026-10-07 America/Buenos_Aires; evidence timestamps use UTC 2026-10-08.
Scope: Phase 5 only. Branch: feat/deterministic-v1-baseline.
Validated source SHA: 7ab2159fc72388282eea1ee6dd733737de234a88.

**Status: deterministic v1 implementation and local quality baseline verified; full Phase 5/M1 release remains gated by inherited native deployment checks, native backup/restore and actual remote CI.** No AI feature/service was introduced. Phase 6 has not started. No remote PR, merge or deployment.

## Required report fields

| Field | Result |
|---|---|
| Completed | Startup server flags for maintenance/knowledge/async; typed server capabilities; recoverable loading/activity errors and safe request references; bounded client requests without automatic write retry; retained failed reporting fields; related-incident notification navigation; responsive/keyboard/contrast polish; selected accessibility/visual checks; conventional latency baseline; isolated quiesced DB/files restore; authenticated v1 demo; consolidated security/dependency review and CI evidence configuration. |
| Architecture | `/me` publishes server-derived capabilities; independent API guards enforce availability. Membership/role/revision/transaction/file controls remain authoritative. Client timeout does not imply rollback. Restore requires a quiesced DB/files pair; route measurements isolate the conventional local API. |
| Validation | Locked clean install, lint/typecheck/build, 12 unit tests, 54 passing integration results with 1 native-only skip, 6 browser workflows with completed per-flow reports, startup smoke, same-version synthetic restore and 90 measured successful route requests. Dependency audit: 0 vulnerabilities. |
| Security | Consolidated implemented trust-boundary/control/debt matrix, server flags independent of UI, no-store v1 responses, safe error references, unchanged Origin/session/tenant/revision/private-file controls. No critical auth/data-integrity issue identified in this bounded review; least-privilege/native deployment assurance remains open. |
| Evidence | OpenAPI capability contract, final check logs, accessibility/browser summaries, reviewed login expectation, mobile/maintenance/workflow screenshots, authenticated WebM demo, restore fingerprints, conventional performance JSON, dependency/audit/AI-free/secret review, source/history bundle and checksum manifest. |
| Trade-offs / Debt | Selected automated accessibility states are not full WCAG conformance. One headless browser/one visual baseline; serial embedded inject timing is not user/network/SLA latency. Same-version quiesced embedded restore is not native live backup/PITR/volume or crash recovery. Startup flags require restart; existing queued work can finish during READ_ONLY. Native and remote CI gates remain pending. |
| Learning | Availability flags do not grant authorization. A failed or timed-out write can already be committed. Automated UI passes and low p95 establish only the measured conditions. Restore must preserve the database and private-file relationship. |
| Teach-Back Checkpoint | No AI/agentic concept introduced; mandatory AI teach-back gate is not applicable. Six-part learning material contains exactly five practical questions; no learner demonstration or mastery is claimed. |
| Interview Defense | Defend test distribution, scope enforcement versus UI switches, uncertain network results, selected automated/manual accessibility evidence, coordinated restore boundaries and comparable conventional measurement conditions before AI. |
| Next Phase | Phase 6 — Local inference and AI assistance. Named only; not started and no model/AI dependencies installed. |

## Actual commands and evidence

| Command | Result / file |
|---|---|
| npm ci --ignore-scripts | Passed; phase5-clean-install.log |
| npm run lint / typecheck / build | Passed; phase5-lint.log, phase5-typecheck.log, phase5-build.log |
| npm run test:unit | 12 passed, 0 failed; phase5-unit.log |
| npm run test:integration | 55 total results: 54 passed, 0 failed, 1 native-only skip; phase5-integration.log. Parent results are included; not 54 independent scenarios. |
| PW_CHROMIUM_EXECUTABLE=/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell npm run test:e2e | Six separate server workflows passed, retries 0; phase5-e2e.log and phase5-browser-summary.json. Runner checks completed JSON expected/unexpected/skipped/flaky counts, not exit code alone. |
| npm run quality:baseline | Quiesced synthetic DB/files restore and serial pre-AI benchmark passed; phase5-baseline.log, phase5-restore.json, phase5-performance.json |
| node --experimental-strip-types scripts/startup-smoke.ts | Repeat migration/seed, actual API process/queue startup, readiness, built SPA and retained synthetic login passed; phase5-startup.log. Not a separate worker deployment test. |
| node --experimental-strip-types scripts/openapi.ts | Capability and current contracts generated; phase5-openapi.log |
| npm audit --json | 0 reported vulnerabilities; phase5-audit.json |
| git diff --check | Passed |
| Bounded deliverable secret review | No known generated credential or selected secret-pattern hits; phase5-secret-review.json. Heuristic, not proof of absence. |

Runtime: Node 24.19.0, npm 11.9.0, Ubuntu 24.04.3. Playwright 1.64.0 uses explicit Chromium Headless Shell 141.0.7390.37; no bundled-current-browser parity claim. Video uses downloaded Playwright FFmpeg build 1013. Dev-only @axe-core/playwright 4.13.0 and locked axe-core engine, MPL-2.0. No new runtime, AI, inference or telemetry dependency. No Redis/external service.

## Selected quality findings

Seven axe states — login, empty incidents, mobile, incident detail, files, knowledge and notifications — report zero violations for wcag2a/wcag2aa/wcag21a/wcag21aa tags. Additional browser checks verify keyboard skip-link focus, 320 px without horizontal overflow and retained form input after controlled HTTP 503. The login pixel expectation is compared without updating it during final acceptance. Screenshots and a sample demo frame were visually inspected. Screen-reader/user testing, all interaction states and cross-browser/platform conformance remain open.

Maintenance tests bypass the browser and receive 503 before incident insertion; incident reads, sign-in and sign-out remain available. Disabled runbook/async API access returns 503 independently of presentation. `/me.features.ai` is literal false and tested. A controlled API database error becomes a redacted correlated 503 then recovers without restart. Client unit tests prove interrupted writes make one fetch call, preserve safe references and reject unexpected non-JSON success responses. Notification navigation fetches the incident through normal scope checks.

The authenticated demo records persisted incident detail, comment/activity, a real worker-completed export, an explicit runbook version, notifications and the related incident. Authentication occurs through a request before the recorded page opens; credentials are not displayed. Existing incident/lifecycle/knowledge/private-file tests continue to pass.

The restore drill stops queue effects and copies a quiesced embedded DB plus private files, closes the source and loads a separate same-version DB/files directory. It verifies exact fingerprints for 13 application tables, five migration checksums, retained queue job references and notifications, exported revision 2/hash, root 0700/file 0600, retained synthetic sign-in and cross-workspace 404. Temporary backup bytes/credentials are deleted; only redacted checksums and timing evidence are delivered. This establishes neither native pg_dump/PITR nor live/crash recovery.

Performance uses 3 warmups then 30 serial successful authenticated Fastify inject requests per route; no network/browser latency. Two workspaces, 24 runbooks and one revision-2 incident; PGlite 0.5.8/embedded server 18.3, pool max=1. Exact timings and hardware/lockfile hash are in phase5-performance.json. These conventional timings are a before-AI measurement method, not AI quality or production performance evidence. Re-run under matched conditions before comparison.

## Open gates and delivery boundary

Native PostgreSQL 18.6 migration/upgrade, independent concurrency barrier/multi-worker claims, separate API/worker processes and restricted roles, shared-volume durability/permissions, actual process-kill/power-loss, native coordinated backup/restore and actual remote CI artifacts remain unverified. Earlier separate-process PGlite failure remains recorded in Phase 4; the passing local browser harness shares the API process and SQL pool with the real worker callback/poller. No repeat privileged native setup attempt or bypass was made.

The existing CI workflow is configured to collect current evidence and run native SQL acceptance plus the isolated embedded restore/benchmark; it has not run remotely. Its browser environment differs from the local Chromium override, so pixel baseline rendering needs explicit review before remote acceptance. Configuration is not passing evidence. No full Phase 5/M1 or Phase 6 readiness claim.

Origin is a local Phase 0 checkout. Delivery contains tracked source/evidence, full git history and checksums; it excludes .env, generated credentials, live/test DB bytes and backups, private storage, dependencies/builds, downloaded binaries and private browser reports/traces. Historical Phase 0–4 evidence is preserved; current rerun screenshots/timeline are copied under Phase 5 names. See phase5-architecture.md, phase5-security.md, phase5-learning.md and the local PR draft.
