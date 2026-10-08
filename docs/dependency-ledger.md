# Tested Dependency Ledger

Registry resolved 2026-10-07. Exact probe pins and lockfile govern reproduction. No prerelease selected. Node target 24.21.0; actual probe 24.19.0. PostgreSQL target 18.6; live execution pending.

| Package | Pin | License | Engine / peer evidence |
|---|---|---|---|
| typescript | 7.0.2 | Apache-2.0 | {"node":">=16.20.0"} |
| react | 19.3.0 | MIT | {"node":">=0.10.0"} |
| react-dom | 19.3.0 | MIT | {"react":"^19.3.0"} |
| vite | 8.3.3 | MIT | {"node":"^20.19.0 // >=22.12.0"} |
| @vitejs/plugin-react | 6.1.2 | MIT | {"node":"^20.19.0 // >=22.12.0"} |
| fastify | 5.12.5 | MIT | {} |
| zod | 4.6.5 | MIT | {} |
| fastify-type-provider-zod | 7.0.0 | MIT | {"@fastify/swagger":">=9.5.1","fastify":"^5.5.0","openapi-types":"^12.1.3","zod":">=4.1.5"} |
| @fastify/swagger | 9.9.1 | MIT | {} |
| better-auth | 1.7.7 | MIT | {"pg":"^8.0.0","vue":"^3.0.0","next":"^14.0.0 // ^15.0.0 // ^16.0.0","react":"^18.0.0 // ^19.0.0","mysql2":"^3.0.0","prisma":"^5.0.0 // ^6.0.0 // ^7.0.0","svelte":"^4.0.0 // ^5.0.0","vitest":"^2.0.0 // ^3.0.0 // ^4.0.0 // ^5.0.0","mongodb":"^6.0.0 // ^7.0.0","solid-js":"^1.0.0","react-dom":"^18.0.0 // ^19.0.0","drizzle-kit":">=0.31.4 // >=1.0.0-beta.1","drizzle-orm":"^0.45.2 // >=1.0.0-rc.1 <2.0.0","@sveltejs/kit":"^2.0.0","@lynx-js/react":"*","@prisma/client":"^5.0.0 // ^6.0.0 // ^7.0.0","@tanstack/react-start":"^1.0.0","@tanstack/solid-start":"^1.0.0"} |
| @better-auth/drizzle-adapter | 1.7.7 | MIT | {"drizzle-orm":"^0.45.2 // >=1.0.0-rc.1 <2.0.0","@better-auth/core":"^1.7.7","@better-auth/utils":"0.4.2"} |
| drizzle-orm | 0.45.3 | Apache-2.0 | {"pg":">=8","gel":">=2","knex":"*","kysely":"*","mysql2":">=2","sql.js":">=1","sqlite3":">=5","postgres":">=3","@types/pg":"*","bun-types":"*","@netlify/db":">=0.4.0","expo-sqlite":">=14.0.0","@types/sql.js":"*","@libsql/client":">=0.10.0","@prisma/client":"*","@upstash/redis":">=1.34.7","better-sqlite3":">=7","@xata.io/client":"*","@vercel/postgres":">=0.8.0","@opentelemetry/api":"^1.4.1","@libsql/client-wasm":">=0.10.0","@electric-sql/pglite":">=0.2.0","@planetscale/database":">=1.13","@tidbcloud/serverless":"*","@types/better-sqlite3":"*","@aws-sdk/client-rds-data":">=3","@neondatabase/serverless":">=0.10.0","@cloudflare/workers-types":">=4","@op-engineering/op-sqlite":">=2"} |
| drizzle-kit | 0.31.11 | MIT | {} |
| pg | 8.23.1 | MIT | {"node":">= 16.0.0"} |
| @types/pg | 8.23.1 | MIT | {} |
| @types/node | 24.19.1 | MIT | {} |
| @types/react | 19.3.0 | MIT | {} |
| @types/react-dom | 19.3.0 | MIT | {"@types/react":"^19.3.0"} |
| @playwright/test | 1.64.0 | Apache-2.0 | {"node":">=20"} |

@types/node is intentionally from Node 24 line, not registry latest 26. GitHub/official sources are in sources.md. Only core probe packages installed; runtime and dev tooling classification in this disposable package is not the future app distribution.

Override: @esbuild-kit/core-utils → esbuild 0.25.12, scoped to Drizzle Kit loader dependency. Initial npm audit: four moderate findings from one transitive esbuild advisory. Final audit: zero reported vulnerabilities; migration generation passes. Review/remove override when upstream fixes its range; do not downgrade Drizzle Kit to the audit suggested old release.

No container digest was verified, so none is claimed. Docker/PG images must be pinned when the live gate runs. Embedded Postgres npm packages were investigated but only prerelease wrappers and an older 18.4 binary were available; not adopted.

## Phase 5 addition

Dev-only @axe-core/playwright 4.13.0, MPL-2.0, exact lockfile: selected browser accessibility evidence. axe-core transitives are locked. No AI or new runtime dependency. See phase5-sources.md and phase5 dependency/audit evidence.

## Phase 6 update

See phase6-report.md, phase6-security.md and phase6-sources.md for the local runtime/model boundary, actual receipts, advisory-review limits and pending human/native/remote gates. No npm dependency added; no model operational authority.

## Phase 8 additions

Exact dev dependency @electric-sql/pglite-pgvector 0.0.9 (Apache-2.0), compatible peer PGlite 0.5.8, lock integrity retained. Embedded extension reports 0.8.1; native build uses pgvector 0.8.7 with verified archive SHA-256 and postgres:18.6 base. Native image build/digest verification remains pending because Docker is unavailable in Work. No separate vector database or ANN dependency. Temporary browser tooling is ignored under .local and is not a product dependency.

## Phase 10 local evaluation profile

Promptfoo 0.124.1 was rejected: its jks-js → node-forge dependency had a high-severity advisory with no patched published node-forge release. The reviewed local JavaScript evaluation API instead uses exact Promptfoo 0.116.7, with scoped patched csv-parse 7.0.2, fast-xml-parser 5.7.0, mathjs 15.2.0, sharp 0.35.5, tmp 0.2.7 and uuid 11.1.1. Global basic-ftp 6.2.2 fixes its advisory; global drizzle-orm references the existing direct 0.45.3 pin. npm ci --ignore-scripts and the used eval/product paths are validated; npm audit reports zero known findings. Other Promptfoo cloud, image, XML, certificate and provider adapters are not supported or exercised by this profile. Maintain these overrides rather than silently upgrading; review/removal requires renewed audit and compatibility checks.

Pinned Promptfoo's telemetry opt-out still tried to send a telemetry-disabled event. The reviewed local adapter explicitly suppresses sendEvent and an independent process egress guard denies remote network APIs. Evidence retains the initial denial. This is not an OS sandbox and does not grant authority to untrusted executable providers/graders. Only reviewed code and handwritten text cases execute.

## M2 native CI receipt — 2026-10-08

PostgreSQL 18.6 / pgvector 0.8.7 source-hash-verified image builds and all 82 native integration checks pass on validated code c5c7a84078c41555c2c9ae5e13e5559949a9ba02. All nine compatible Chromium flows, including the unchanged golden, pass. See evidence/m2-ci-receipt.json. This supersedes earlier pending build/test observations, not actual least-privilege/native-backup/multi-worker production debt. Desktop model/digest/runtime quality acceptance remains pending.
