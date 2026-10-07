# OpsLedger — Phase 1

Authenticated incident creation, list and detail. No model dependency. Branch: feat/incident-first-slice. No merge or deployment.

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

Generate OpenAPI with `node --experimental-strip-types scripts/openapi.ts`. See docs/phase1-architecture.md, docs/phase1-report.md and evidence for actual results. Phase 0 probes are preserved in lab/phase0, outside product checks.

Remote CI/native server acceptance remains pending until a real run is available. Phase 2 has not started.
