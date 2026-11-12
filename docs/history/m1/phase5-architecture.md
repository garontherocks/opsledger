# Phase 5 — Deterministic v1 baseline

The browser consumes `/api/v1/me.features`. Environment configuration is parsed at startup; changing flags requires restarting the relevant processes. The server independently enforces flags, so hiding UI controls is not authorization. There is no AI service, SDK, model, inference route or agent loop; `ai` is a literal false capability.

| Setting | Default | Server behavior | Browser behavior |
|---|---|---|---|
| READ_ONLY | false | Reject non-read `/api/v1/*` requests with 503/read_only before mutations. Auth remains available. Existing queued effects can finish. | Maintenance banner, disabled reporting/file writes, no lifecycle/comment/runbook write forms. Read/refresh/sign out remain available. |
| KNOWLEDGE_ENABLED | true | Runbook routes return 503/feature_disabled when false; incidents remain available. Audit is a separate administrative read. | Hide knowledge navigation. |
| ASYNC_ENABLED | true | Async access returns 503; API skips queue bootstrap and a newly started worker refuses false. Restart both processes to stop the feature. | Hide files and notifications navigation. |

Flags do not grant roles, change tenant scope, erase queued jobs or alter data. `/me` and all v1 responses use no-store. Feature state is startup state, not a live browser toggle; stale UI can encounter a server rejection until reload. Global maintenance applies equally to direct API clients, including receipt updates and retry/delete commands. Authentication has its own Origin/session controls.

The fetch helper combines caller cancellation with a 15-second timeout. Interrupted or non-JSON responses are actionable errors. Writes are never automatically retried: a timeout can follow a committed write. Check current state first; exports/uploads retain their operation request key. Domain stale-revision protection continues unchanged. Incident activity has an explicit retry independent of revision changes; root loading also has a retry. Failed creation retains entered fields.

Notification rows now open their related incident, fetched through the normal scoped detail route. Navigation wraps; controls fit 320 px; links use explicit contrasting colors; a keyboard-visible skip link moves focus to main. No rich rendering is introduced.

## Test distribution

| Layer | Purpose | Deliberate limit |
|---|---|---|
| Existing unit tests | Domain transitions and strict command/input policy | No imitation of UI/framework implementation |
| Real SQL/API integration | Membership/revision/transaction/idempotency/flags/outage boundaries | Default embedded SQL serializes clients; native barrier remains skipped |
| Browser acceptance | Six critical workflows, selected axe checks, keyboard/mobile, HTTP 503 form preservation, visual baseline and demo | One headless browser override; not full WCAG or cross-browser certification |
| Restore/benchmark script | Quiesced same-version synthetic DB+files restore; 30 serial successful route measurements | Not production recovery, live backup, PITR, SLA or end-to-end user latency |

No telemetry framework is added. Request IDs and safe error references already provide a useful local correlation boundary. A single justified dev dependency, @axe-core/playwright 4.13.0, supplies selected automated checks. npm audit and source review cover the locked dependency graph; neither is a penetration test.

## Baseline evidence and reuse

Run `npm run quality:baseline` without TEST_DATABASE_URL. It creates only a disposable embedded fixture, completes real queue effects, stops effects, captures DB and private files while quiesced, closes the source, restores a new DB/files directory, verifies exact fingerprints for 13 tables and all migration checksums, hashes an exported revision, checks file permissions and authenticates with the retained synthetic credential. Cross-workspace access remains 404. Temporary backup bytes/passwords are deleted, never delivered. Redacted hashes/checks and timings are persisted.

The route benchmark has 3 warmups and 30 timed serial requests per selected route, authenticated through Fastify inject, with no network/browser latency. Evidence records hardware, Node, backend, lockfile hash, fixture and p50/p95/max. Re-run with the same conditions before any future AI comparison; conventional route times do not measure retrieval or inference quality. This is a reproducible measurement method, not a speed gate.

The selected visual expectation is a login screenshot, captured and compared on Linux with the recorded Chromium 141 override. Browser/version/fonts/platform changes need deliberate baseline review. Do not update expectations just to silence a regression. The demo authenticates through a request before recording pages, so no credential form is recorded. It shows a persisted incident, knowledge and notifications without AI.

## Still-open release gates

PostgreSQL 18.6 migration/upgrade, independent lock/barrier and multi-worker claims; separate API/worker credentials/processes; volume durability; actual killed-process/power-loss recovery; least-privilege grants; native backup/restore and remote CI artifacts remain unverified. Phase 5 does not erase inherited Phase 0–4 gates. M1/full Phase 5 completion and permission to start Phase 6 are not claimed. No remote repository/PR/deployment was created.
