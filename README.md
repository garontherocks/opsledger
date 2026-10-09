# OpsLedger — M2 AI Product

Authenticated incidents, versioned knowledge, durable in-app notifications, private exports and bounded text attachments. Every action requires the current revision. Optional pinned local structured assistance, semantic retrieval and grounded runbook answers. Current baseline: `main`. M2 was formally accepted for its optional, unverified, non-operational lab scope and merged through PR #1 at `8fd90c6e6521e5c6c4083141f41f9bc2e85e68f9`. No production deployment or Phase 11/M3 authorization is implied.

## Native local startup

Requires Node 24.19.x, npm 11 and Docker Compose with PostgreSQL 18.6. From the repository root:

1. Run `npm ci --ignore-scripts`.
2. Copy .env.example to .env. Generate a database password and a separate random auth secret (at least 32 characters); replace placeholders. Never commit .env.
3. Set DB_PASSWORD in your shell to that database password. Run `docker compose -f infra/compose.yaml up --build -d`. The database listens on localhost and persists a volume. Changing the environment password does not update an existing database.
4. Run `node --env-file=.env --experimental-strip-types scripts/migrate.ts` twice.
5. Run `node --env-file=.env --experimental-strip-types scripts/seed.ts`. Use the generated .local/credentials.json to sign in. This file has restricted permissions. Retain it; repeat seeding never replaces existing passwords or memberships. LAB_MODE must be true and NODE_ENV must not be production.
6. Run `npm run build`, then `node --env-file=.env --experimental-strip-types apps/api/src/server.ts`. Open http://localhost:3100 and create an incident for InvoiceWorker.
7. /health/live checks process health; /health/ready checks database connectivity. Ctrl+C stops the server. Stop Compose without removing the volume when preserving data.

## Checks

Run npm scripts: lint, typecheck, build, test:unit and test:integration; run `npm audit --audit-level=moderate`.

For browser acceptance run `npx playwright install --with-deps chromium`, `npm run build`, `npm run test:e2e`.

Integration and E2E default to separate transient PGlite test databases. Set TEST_DATABASE_URL to use a fresh disposable native database on localhost with a name ending in _test. The native harness owns a generated database per fixture, requiring a disposable CREATEDB test role, and leaves the supplied database intact. Seeding deliberately does not reset existing passwords. Never use a product database. CI provides independently fresh PostgreSQL 18.6 API and browser lanes.

Optional harness: `LAB_MODE=true npm run db:lab` hosts persistent PGlite on port 55432. Explicitly set DATABASE_URL to postgresql://postgres@127.0.0.1:55432/postgres, then migrate/seed/build/start. This is test tooling, not native PostgreSQL deployment. The application never silently selects it.

Generate OpenAPI with `node --experimental-strip-types scripts/openapi.ts`. See docs/phase5-architecture.md, docs/phase5-report.md and evidence for actual results. Phase 0 probes and Phase 1 reports remain historical.

To upgrade a Phase 1 database, run migrations and the synthetic seed again using the retained credentials; incident rows and previous migration checksums are preserved. For lifecycle UI use north-lead@example.test with that same local synthetic password. Reporters can comment, responders can triage/assign/investigate, and only leads can resolve/close/reopen. Admin/editor membership does not imply lead privileges. Refresh after a stale-revision conflict; actions are never silently retried.

Native PostgreSQL integration and remote CI passed, including [post-merge main run 37848330566](https://github.com/garontherocks/opsledger/actions/runs/37848330566). The native test uses a controlled row lock and checks two waiting backend PIDs; the default PGlite run explicitly skips it. Phase 3 local knowledge/search/audit acceptance is recorded; Phase 4 local async/file acceptance is recorded; Phase 5 local quality baseline is recorded; full release/M1 remains gated. Phase 6 local assistance is implemented; see the desktop closure below.

## Knowledge and audit

Upgrade a Phase 2 database by running migrations and the retained synthetic seed. Migration 0003 adds runbooks, immutable numbered content and metadata audit events; previous migration checksums and incident history remain intact. Existing history is not backfilled into invented audit records.

Sign in as north-editor@example.test (or north-admin@example.test) with the retained lab password. Open Knowledge, create a draft, then publish its explicit numbered version. Append a new version to change content. Withdrawal removes that version from reader access; withdrawing the current version leaves no published search result. Use the Version JSON API address and SHA-256 content hash for stable references. Superseded published versions keep their content and remain addressable until withdrawn. Markdown is displayed as escaped text.

The synthetic corpus contains 24 runbooks across two workspaces, including repeated titles/timestamps, drafts, withdrawn versions and malicious Markdown strings. Keyword search uses PostgreSQL simple full-text search, with service/category filters, title/newest order and signed scoped keyset pagination. No AI, embeddings or attachment parsing. Admin/editor may inspect workspace audit metadata; other roles read published knowledge only. Knowledge editor privileges do not grant incident lead privileges.

Browser acceptance runs seven separate server lifetimes to avoid exhausting a shared production rate-limit bucket. The default harness creates a fresh PGlite database per flow; the native browser lane shares its fresh job database and generated password across flows. Production rate limits are unchanged.

## Async operations and private files

Upgrade a Phase 3 database by running migrations and the retained seed. Migration 0004 adds durable notification outbox, operations, private-file metadata and notifications without changing prior migration checksums. Starting the API installs/checks pg-boss schema version 45. API and worker share the same database and the exact same absolute STORAGE_DIR. Use a private mounted directory (mode 0700), outside the web root; files are 0600. Set JOB_DATABASE_URL for a separate worker credential where roles are configured; the local Compose lab uses its existing owner credential. No credential enters a job payload or the browser. Production additionally requires an explicit STORAGE_DIR and HTTPS.

Start the API as before and, in a separate terminal with the same environment, run `node --env-file=.env --experimental-strip-types apps/api/src/worker.ts`. The worker delivers notification outbox rows, handles file effects and supervises queue expiry/retries. The API can continue creating/updating incidents while the worker is unavailable; notifications remain in the durable outbox. File requests return 202 and require worker processing. Graceful Ctrl+C stops polling before database shutdown.

For the optional PGlite API harness set LAB_DB_BACKEND=pglite explicitly. A separate API/worker process attempt disconnected in this socket harness and is not supported by the local acceptance claim. The E2E harness runs API and worker callbacks in one server process using the same SQL pool. Native PostgreSQL 18.6 remains the deployment target; separate processes/roles require deployment acceptance.

Open an incident → Open files → Request incident export. Export captures the requested revision and latest 50 activity rows as bounded JSON; stale revision returns 409. Only the requesting user can download an export. Other active workspace members can download attachments, but removal requires owner or workspace lead/admin. Upload accepts canonical base64 JSON for `.txt` UTF-8, 1–16 KiB, without NUL, path separators or reserved filenames. HTML strings stay text and downloads force attachment/nosniff/no-store. Rich files, parsing, antivirus and external object storage are deferred.

Use Refresh operation / Refresh files, or inspect Recent operations after reload. Failed work exposes a safe error code and timeline. After repair, the owner may explicitly Retry failed operation, at most twice; each queue submission permits 2 retries (3 attempts). It never retries indefinitely or silently overwrites a request. Ready files and failed pending files can be removed asynchronously. Open notifications to refresh recipient-only messages and mark read.

Limits: 20 pending user requests per requester, 100 per workspace, 20 live attachments per incident, 100 live files / 8 MiB per workspace; exports max 256 KiB. Deleted metadata remains but payloads are scrubbed. Queue jobs expire after 30 seconds active, remain eligible for 1 day and completed queue records retain 7 days. The worker sweeps unknown UUID blobs/temp files older than 24 hours hourly; known live/pending files are retained. Permanent operation/audit metadata retention is a documented limitation.

Tests use real pg-boss jobs with the PGlite backend and no queue mock. Four browser flows each start a fresh server; their harness runs the real worker callback/poller in the server process. Controlled crash-point errors prove replay behavior; an actual killed worker/power loss and native multiworker behavior remain pending. See phase4-job-timeline.json and phase4-storage-cleanup.json. No Redis or AI dependency.

Optional container runtime configuration (unexecuted here): after applying app migrations and seed to the native DB, run `docker compose -f infra/compose.yaml --profile runtime up --build`. API/worker share the private-files named volume with a non-root Node user; only API localhost:3100 is exposed. The default Compose command still provisions the database alone for host-based startup. The runtime image/volume/role acceptance is pending, and no image digest or successful container build is claimed.

## Quality baseline and server flags

READ_ONLY=true pauses all business API writes and presents maintenance controls; auth/read/refresh remain available and existing queued work may finish. KNOWLEDGE_ENABLED=false disables runbooks. ASYNC_ENABLED=false disables async APIs and bootstrap; restart API and worker for consistent rollout. Defaults preserve existing behavior. Flags are server configuration, not role grants. `/api/v1/me` exposes current capabilities with ai:false.

`npm run quality:baseline` (without TEST_DATABASE_URL) runs a disposable same-version quiesced PGlite DB/files restore and a serial conventional route benchmark. No live/user backup is taken or delivered. See phase5-architecture.md for conditions and native-backup gaps. The browser suite adds axe checks on selected states, keyboard focus/mobile recovery, one reviewed Linux login visual baseline, server-flag presentation and an authenticated v1 recording. Match the browser environment before reviewing a pixel comparison. Automated passes do not establish full WCAG conformance.

New evidence: phase5-accessibility.json, phase5-restore.json, phase5-performance.json, phase5-v1-demo.webm and phase5 final check logs. Native PostgreSQL 18.6 integration and remote CI passed. Independent production workers/roles, actual volume/crash recovery and native live backup remain unproven.

## Local incident draft assistance (Phase 6)

AI_ENABLED defaults false. In the nonproduction synthetic lab, enable it only with LAB_MODE=true and an installed local model/digest pin. Start Ollama on 127.0.0.1 with OLLAMA_NO_CLOUD=1; configure OLLAMA_URL, OLLAMA_MODEL and OLLAMA_DIGEST in .env, then restart the API. Model tags are a fixed server allowlist; a request cannot supply a model, prompt or URL. No paid/hosted provider is configured. See docs/phase6-local-startup.md for exact startup and pilot commands.

Open incident detail and choose Draft timeline summary. Review against activity; the draft does not mutate or save incident content. State/revision or membership changes during inference suppress stale/unauthorized output. Errors preserve incident operations and knowledge search. Runtime identity, prompt/context hashes, event IDs, token counts and latency accompany the draft; successful production-style server logs include metadata without raw prompts/output.

Original CPU evidence preserves 24 generations. The completed desktop batch adds 36 generations over 0.6B/1.7B/8B, plus actual API failure/recovery, learner human review and the completed six-part Phase 6 learning checkpoint. Quality failures remain: unsupported claims, invalid IDs and truncation. Víctor prefers direct reading for brief timelines and AI only as optional human-reviewed assistance. See [desktop closure](docs/phase6-desktop-closure.md). Inherited release/M1 and remote CI gates remain open. Phase 7 was subsequently authorized; see its section below.

## Phase 6 desktop handoff

Clone https://github.com/garontherocks/opsledger.git and checkout `feat/local-ai-assistance`. Original validated source/evidence commit: `e917d798346b6653d810d0c4bdb17eec97f5090a` (implementation: `aa2320a2327b083bbb07ce653146b39986e13802`). The later handoff commit changes documentation and ignore rules only; product code is unchanged. See [desktop instructions](docs/phase6-desktop-handoff.md). Desktop validation and grouped human review are recorded in [desktop closure](docs/phase6-desktop-closure.md), with explicit checkpoint coverage and inherited release limits. Phase 7 was subsequently authorized after the completed learning checkpoint; see below.

## Phase 7 — structured drafts and evaluation

Authorized after the Phase 6 closure. The incident endpoint now consumes a strict schema-constrained JSON model response with deterministic state/citation checks; unknown fields, unsafe markup, incomplete output and malformed JSON fail safely. Human accept/edit/reject decisions remain local and never change the incident. Contracts do not establish factual truth.

Run `npm run ai:eval` for the versioned fixture/oracle report. See [Phase 7 report](docs/phase7-report.md) and accumulated [learning](docs/phase7-learning.md). Structured browser behavior is verified in the consolidated CI receipt. Actual inference quality and understanding are reviewed once at M2. Historical Phase 6 evidence is preserved.

## M2 milestone handoff

See [engineering report](docs/m2-engineering-report.md), [architecture](docs/m2-architecture.md), [security/evals](docs/m2-security-evals.md), [one desktop bundle](docs/m2-desktop-validation.md), [selected review samples](docs/m2-human-review-samples.md), and [consolidated Teach-Back](docs/m2-teach-back.md). Governance permits autonomous consecutive phases only within an explicitly authorized milestone; stop after Phase 10. Individual phase reports and evidence remain intact.

AI/embeddings default off independently. Local inference is read-only and untrusted; optional signed feedback only records metadata. Native test fixtures require a disposable localhost `_test` connection and CREATEDB test role; the harness creates and normally drops only its generated databases, leaving the supplied database intact. Production least privilege remains a separate gate.

## Phases 8–10

Phase 8 adds bounded Markdown chunks, editor index/purge, pinned 768-dimensional embeddings and publication/workspace-scoped exact semantic search. Phase 9 adds quoted source-grounded answers with current-source revalidation and explicit abstention. Phase 10 adds optional signed append-only metadata feedback and local deterministic adversarial regression. See each phase report and evidence; fixture scores do not establish factual model quality.

For a new lab, configure EMBEDDINGS_ENABLED, EMBEDDING_MODEL and full EMBEDDING_DIGEST separately from the generation model. AI_ENABLED and embeddings remain off by default. Existing labs follow the single M2 desktop bundle instead of repeating seeding or CI tests.

## Actual M2 human checkpoint — 2026-10-08

Desktop bundle and consolidated learning/review completed on handoff 4e10225: 36 generations, zero execution errors, three literal failures, small-corpus Recall@5/MRR 1.0, mean latency approximately 3.79 s. See [actual judgments and answers](docs/m2-human-checkpoint.md) and [formal acceptance assessment](docs/m2-acceptance-check.md). These supersede earlier pending-human notices. AI remains optional/unverified and direct reading remains the short-timeline baseline. Formal M2 acceptance is recorded under the explicitly agreed limited-lab policy, without another desktop/checkpoint loop. M3 is not authorized.

## Formal M2 acceptance — 2026-10-08

The user explicitly agreed [Phase 9 / M2 quality policy](docs/m2-quality-acceptance-policy.md). All M2 gates are satisfied for the optional, explicitly unverified, human-reviewed-where-material, non-operational lab scope. Recall@5 1.0 / MRR 1.0 satisfy the agreed lab floors; no numerical semantic pass rate is inferred from the eight samples. Semantic defects and production/promotion debt remain recorded. The future >= 0.90 target requires fresh calibrated bilingual held-out data plus no critical unsupported operational claim. No product-value improvement, model/prompt promotion or M3 authorization is implied. Desktop and Teach-Back were not rerun. Phase 11 has not begun.

## Phase 11 — direct read-only QA harness

Authorized after M2 acceptance; isolated branch feat/bounded-qa-agent. Three transport-neutral snapshot readers, strict model proposals, controller-owned mandatory coverage/integrity checks, six-turn/deadline/character/token limits and complete synthetic traces. No product API, operational write, shell, MCP or suite execution is added. Run `npm run agent:eval`; actual pinned tool-selection quality remains for the integrated M3 desktop bundle. See [Phase 11 report](docs/phase11-report.md), [security](docs/phase11-security.md) and accumulated [learning](docs/phase11-learning.md). No production model/prompt promotion or later milestone authorization is implied.

## Phase 12 — MCP stdio lab

Phase 11 was merged through PR #3 at `b0b785a922288a831fe28266c4d2bb27462b6e5a`. Phase 12 exposes its same three approved synthetic snapshot readers and versioned resources using pinned official SDK server/client 2.3.1. No private incident data or operational authority is added.

Run `npm ci --ignore-scripts`, then `npm run mcp:test`. The test host launches the fixed server itself; do not start a second process. `npm run mcp:server` is the stdio entry for a reviewed compatible host: stdout is protocol only and diagnostics use stderr. For manual host configuration, use the absolute Node executable and fixed `scripts/qa-mcp-server.ts` path, with `--import` pointing to a valid `file://` URL for `scripts/mcp-egress.mjs` (use `new URL(..., import.meta.url).href`, never a Windows drive path) and `--experimental-strip-types`; do not use model-selected commands or download-on-connect launchers. The owned host defaults to pinned 2026-07-28; legacy 2025-11-25 is separately tested. No `.env`, Ollama or DB setup is needed for these synthetic protocol checks.

See [report](docs/phase12-report.md), [security and compatibility](docs/phase12-security.md), [learning](docs/phase12-learning.md) and [actual annotated wire transcript](evidence/phase12-protocol-transcript.json). Per-phase desktop/Teach-Back is not requested; accumulated M3 validation remains at its milestone boundary. Phase 13 is not implemented.

## Phase 13 / M3 — skills and authenticated local HTTP

PR #4 is merged at `95caf7486c0380a22bebe5c2c55a24419fcdf239`. `npm run m3:test` exercises the bounded agent over real MCP stdio and Streamable HTTP, progressive reviewed skill loading, reusable MCP prompt and the local credential/security matrix. The lab listener binds only `127.0.0.1`; grants are minted by the trusted in-process operator, never by an HTTP token endpoint. No private incident data or operational authority is added.

See [Phase 13 report](docs/phase13-report.md), [security](docs/phase13-security.md), [M3 engineering report](docs/m3-engineering-report.md), [consolidated checkpoint](docs/m3-teach-back.md) and [one Desktop Validation Bundle](docs/m3-desktop-validation.md). Desktop/live results and human answers are pending. This milestone is not formally human-accepted yet. Stop before M4 / Phase 14.

## M3 Windows corrective handoff

The original Windows attempt at 544f22edf55c4abd806751e693162d936c0aa7e0 failed before all nine agent runs; this is preserved as launcher/platform evidence, not model quality. Corrective code cf4c6f0c2a97bcc494eaeb2b2d5a39dcc16ea1d2 passed full Linux and new Windows CI. See [correction review](docs/m3-windows-launcher-correction.md), [actual CI receipt](evidence/m3-windows-correction-ci-receipt.json) and [one desktop rerun](docs/m3-desktop-validation.md). Keep approved runtime/model pins. Actual M3 human/desktop gate remains pending; no Phase 14/M4.

## Actual M3 milestone checkpoint and acceptance check — 2026-10-09

The user completed the desktop/human checkpoint at 52b1f567766a0098313c5637e4ec6f00c7d54c0d: 9 agent runs, 54 provider calls, 0 provider errors, 0 drafts; all 9 safely blocked at six-turn turn_budget across direct/stdio/HTTP. Representative blocked run: Accept as safe controller denial. Final draft review: not applicable. Seven learner answers, two architecture flows, controlled failures and both Senior/Staff scenarios are recorded in [actual checkpoint](docs/m3-human-checkpoint.md); no additional answers or judgments inferred. No desktop/Teach-Back rerun or model/prompt/budget change.

The 9/9 bounded blockage is poor/inconclusive live model quality, not transport failure or successful task completion. It does not violate the Phase 11–13 foundations DoD by itself; provisional tool-selection release quality is not demonstrated. Formal M3 acceptance is nevertheless **blocked** by the later required browser lifecycle CI failure on this handoff (run 37867546978), despite API/Windows passing and earlier corrective CI being green. [Formal acceptance check](docs/m3-acceptance-check.md) distinguishes this engineering blocker from model debt. Earlier pending-human notices are historical and superseded; actual checkpoint is complete, milestone acceptance remains pending engineering resolution. PR #5 unmerged; no Phase 14/M4 authorization.

## Formal M3 closure after focused lifecycle remediation — 2026-10-09

M3 is formally accepted for the limited Agent Foundations lab scope at tested code a55fbe29bcfb5e78fdee4dc4c54b5cdca44be479. Full CI run 37953380880 passed API/browser/Windows; controlled native evidence changes from mutation SQLSTATE 40P01 to both handlers committed under identical lock overlap. Five targeted native lifecycle browser runs and all nine full browser flows passed, along with 83 native integrations without skips and unchanged security/AI checks. [Acceptance](docs/m3-acceptance-check.md), [causal remediation](docs/m3-lifecycle-remediation.md), [exact receipt](evidence/m3-lifecycle-remediation-ci-receipt.json).

This supersedes the previously unresolved lifecycle blocker. Original failure evidence and actual human checkpoint remain preserved. The desktop outcome is still 9/9 safe turn_budget blocks, zero drafts: poor/inconclusive live quality, not promoted model quality or product benefit; provisional release targets remain unproven. No desktop/Teach-Back repeat or AI changes. No required M3 blocker remains; non-blocking limited-lab debt stays documented. PR #5 remains open/unmerged. Recommendation: M4 only after explicit authorization; no Phase 14/M4 has begun. This update changes no roadmap phase scope, DoD or threshold.
