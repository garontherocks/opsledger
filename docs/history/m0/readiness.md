# Phase 0 Readiness

## Environment inventory

Observed Work environment: Ubuntu 24.04.3 LTS Linux x86_64, Node 24.19.0, npm 11.9.0, Git 2.51.1. The initial workspace disk check reported 26 GB available on a 32 GB overlay. Docker, nvidia-smi, psql and gh were not found on PATH.

These observations describe this execution environment, not Víctor's desktop. GPU model/VRAM, Windows/WSL2 configuration, local Docker availability and local disk remain unverified. GPU verification is not necessary for deterministic Phase 1 but must precede Phase 6. Docker/PostgreSQL readiness is necessary before claiming the full persistence spike passes.

Target runtime: Node 24.21.0 LTS per official release page; the probe runs on available 24.19.0 and must be rerun on the target patch before repository acceptance. Target database: PostgreSQL 18.6; no live database exists in this session.

Local machine checks, not executed here:

- PowerShell: node --version; npm --version; git --version; docker version; docker compose version.
- PowerShell: nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv; wsl --status; Get-Volume.
- Verify Docker can run the approved PostgreSQL image and that DB is bound only to 127.0.0.1.
- Record OS/tool versions, disk and GPU results without credentials or unrelated system data.

## Stack decisions

Keep all approved major decisions. Exact stable package pins were resolved from npm registry metadata and stored with integrity/license/engine/peer data. The compatibility experiment checks Fastify/Zod/OpenAPI, React/Vite build and Drizzle/Better Auth imports/construction.

Use Drizzle 0.45.3 stable and Kit 0.31.11. Do not adopt Drizzle 1.0 RC. Zod provider 7 has output serialization semantics that need explicit DTO checks; avoid coercion/transforms in public contracts initially.

Better Auth and its separate Drizzle adapter must both use 1.7.7. Official advisories GHSA-965c-763c-88jm and GHSA-44jh-23m7-hpcf list that patched version. The former concerns combinations of OAuth/Magic Link; the latter concurrent database rate limits. Do not infer all security is solved by a version pin.

Phase 1 auth scope: seeded synthetic email/password users, database sessions, logout/revocation. No public signup, OAuth, Magic Link, SSO, billing or real email. Domain workspace/object authorization stays in OpsLedger.

## Bootstrap boundary

Phase 0 supplies a reviewable local readiness package and isolated spike. It does not scaffold product workspaces or endpoints. Application repository bootstrap can occur only within authorized Phase 0 scope after live stack readiness is established, or as the beginning of a separately authorized Phase 1. No later dependencies are preloaded.

If repository creation tooling is unavailable, preserve this package and report that limitation. Do not create an unrelated Site or use a different service as a repository substitute.

## Exit criteria and honest status

| Criterion | Evidence / acceptance |
|---|---|
| Authoritative roadmap read | Current approved file loaded |
| Core decisions preserved | Seven ADRs; no architectural redesign |
| Stable versions resolved | Registry metadata and exact spike manifest |
| Near-term advisory review | Official sources and npm audit output |
| Runtime schema compatibility | Passing schema/OpenAPI spike |
| Frontend compatibility | Strict typecheck and production probe build |
| Auth/database adapter | Static construction passes; live behavior must be tested separately |
| PostgreSQL migrations/session round-trip | Pending live PostgreSQL; not replaced with SQLite or fake persistence |
| Desktop inventory | Pending user-machine command evidence |
| Phase 1 acceptance/risk/commands | Contract and CI documents |
| Corporate delivery | Local branch/commits if recorded; no invented remote PR |

Do not call Phase 0 fully complete while required live persistence/auth migration evidence is missing. Report document/spike deliverables as verified and the readiness gate as pending.

## Live compatibility follow-up inside Phase 0

On a permitted host with PostgreSQL 18.6:

1. Pin the official image digest and start a disposable DB on localhost with generated throwaway credentials.
2. Create Better Auth schema from the pinned adapter, review SQL migrations, apply to empty DB and rerun without duplicate effects.
3. Create a synthetic auth user, sign in through the Fastify adapter, preserve all Set-Cookie headers, call getSession, revoke session and confirm rejection.
4. Validate Origin denial, closed signup and concurrent auth rate-limit behavior.
5. Insert/read/rollback a disposable table via Drizzle/pg; verify constraints and close pools.
6. Record server version, SQL migration hash, exact package lock and pass/fail logs. Clean up test DB.

A runnable live-postgres.test.ts probe is included. Set PHASE0_TEST_DATABASE_URL to a disposable localhost database whose name begins phase0_, then run npm run test:live inside spike/. It verifies target server version, repeated migration application, sign-in cookie, session lookup, foreign-origin denial and logout/revocation. Without the variable it skips explicitly; a skip is not validation. Closed signup/concurrent rate limits and DB rollback/constraints still need the additional live checks above.

No incident API/UI is built in this follow-up; it remains a compatibility probe.
