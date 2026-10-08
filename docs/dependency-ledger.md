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
