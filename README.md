# OpsLedger — Phase 3

Authenticated incident creation, lifecycle, assignment, comments and activity. Every action requires the current revision. No model dependency. Branch: feat/knowledge-search-audit. No merge or deployment.

## Native local startup

Requires Node 24.19.x, npm 11 and Docker Compose with PostgreSQL 18.6. From the repository root:

1. Run `npm ci --ignore-scripts`.
2. Copy .env.example to .env. Generate a database password and a separate random auth secret (at least 32 characters); replace placeholders. Never commit .env.
3. Set DB_PASSWORD in your shell to that database password. Run `docker compose -f infra/compose.yaml up -d`. The database listens on localhost and persists a volume. Changing the environment password does not update an existing database.
4. Run `node --env-file=.env --experimental-strip-types scripts/migrate.ts` twice.
5. Run `node --env-file=.env --experimental-strip-types scripts/seed.ts`. Use the generated .local/credentials.json to sign in. This file has restricted permissions. Retain it; repeat seeding never replaces existing passwords or memberships. LAB_MODE must be true and NODE_ENV must not be production.
6. Run `npm run build`, then `node --env-file=.env --experimental-strip-types apps/api/src/server.ts`. Open http://localhost:3100 and create an incident for InvoiceWorker.
7. /health/live checks process health; /health/ready checks database connectivity. Ctrl+C stops the server. Stop Compose without removing the volume when preserving data.

## Checks

Run npm scripts: lint, typecheck, build, test:unit and test:integration; run `npm audit --audit-level=moderate`.

For browser acceptance run `npx playwright install --with-deps chromium`, `npm run build`, `npm run test:e2e`.

Integration and E2E default to separate transient PGlite test databases. Set TEST_DATABASE_URL to use a fresh disposable native database on localhost with a name ending in _test. Each lane needs its own fresh database: seeding deliberately does not reset existing passwords. Never use a product database. CI provides independently fresh PostgreSQL 18.6 API and browser lanes.

Optional harness: `LAB_MODE=true npm run db:lab` hosts persistent PGlite on port 55432. Explicitly set DATABASE_URL to postgresql://postgres@127.0.0.1:55432/postgres, then migrate/seed/build/start. This is test tooling, not native PostgreSQL deployment. The application never silently selects it.

Generate OpenAPI with `node --experimental-strip-types scripts/openapi.ts`. See docs/phase3-architecture.md, docs/phase3-report.md and evidence for actual results. Phase 0 probes and Phase 1 reports remain historical.

To upgrade a Phase 1 database, run migrations and the synthetic seed again using the retained credentials; incident rows and previous migration checksums are preserved. For lifecycle UI use north-lead@example.test with that same local synthetic password. Reporters can comment, responders can triage/assign/investigate, and only leads can resolve/close/reopen. Admin/editor membership does not imply lead privileges. Refresh after a stale-revision conflict; actions are never silently retried.

Remote CI/native PostgreSQL acceptance remains pending. The native test uses a controlled row lock and checks two waiting backend PIDs; the default PGlite run explicitly skips it. Phase 3 local knowledge/search/audit acceptance is recorded; Phase 4 has not started.

## Knowledge and audit

Upgrade a Phase 2 database by running migrations and the retained synthetic seed. Migration 0003 adds runbooks, immutable numbered content and metadata audit events; previous migration checksums and incident history remain intact. Existing history is not backfilled into invented audit records.

Sign in as north-editor@example.test (or north-admin@example.test) with the retained lab password. Open Knowledge, create a draft, then publish its explicit numbered version. Append a new version to change content. Withdrawal removes that version from reader access; withdrawing the current version leaves no published search result. Use the Version JSON API address and SHA-256 content hash for stable references. Superseded published versions keep their content and remain addressable until withdrawn. Markdown is displayed as escaped text.

The synthetic corpus contains 24 runbooks across two workspaces, including repeated titles/timestamps, drafts, withdrawn versions and malicious Markdown strings. Keyword search uses PostgreSQL simple full-text search, with service/category filters, title/newest order and signed scoped keyset pagination. No AI, embeddings or attachment parsing. Admin/editor may inspect workspace audit metadata; other roles read published knowledge only. Knowledge editor privileges do not grant incident lead privileges.

Browser acceptance runs three separate server lifetimes to avoid exhausting a shared production rate-limit bucket. The default harness creates a fresh PGlite database per flow; the native browser lane shares its fresh job database and generated password across flows. Production rate limits are unchanged.
