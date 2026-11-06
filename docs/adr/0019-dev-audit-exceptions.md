# ADR 0019 — Scoped, expiring dev-only audit exceptions; keep Promptfoo 0.116.7

Status: accepted 2026-11-06 (owner decision). Review by 2027-02-06.

Numbering: ADRs 001–010 use three digits; the most recent, 0018, uses four digits and the phase number. This ADR continues from the most recent one as 0019 in the four-digit form. The 011–017 gap is historical and is not backfilled.

## Context

The CI step `npm audit --audit-level=moderate` in `.github/workflows/phase4.yml` failed on main. A non-breaking `npm audit fix` (lockfile only) resolved @azure/msal-node, body-parser, follow-redirects, qs, ip-address, fast-uri and undici. Path analysis of the rest showed that, contrary to first assumption, four advisories still reached runtime or non-Promptfoo paths:

- GHSA-mrhx-c7xc-m3w5 zod <4.6.6 through the direct runtime pin zod 4.6.5 (and better-auth);
- GHSA-3g3m-2fjr-6pw4 glob through @fastify/static 10.1.5 → glob 13.0.7;
- GHSA-rmxm-3fg6-px4f @hono/node-server through @modelcontextprotocol/node 2.1.1 → @hono/node-server 1.19.17;
- GHSA-g3hv-75wg-m249 minimatch through eslint/typescript-eslint (dev) and, before the fix above, glob via @fastify/static.

Those were fixed, not excepted: exact patch pins zod 4.6.6, @fastify/static 10.1.10 (glob ^14 → 14.0.4) and fastify 5.12.8 (low GHSA-389g-gv7q-r4x8), plus a scoped override `@modelcontextprotocol/node → @hono/node-server 2.1.6`. The published 2.1.2 of @modelcontextprotocol/node has byte-identical `dist/` to 2.1.1 and only widens its range to `^1.19.9 || ^2.1.3` while raising its server peer to ^2.4.0, so the override reproduces upstream's declared-compatible combination without an MCP server upgrade. It uses only `getRequestListener`.

What remains at moderate or higher after that:

| Advisory | Installed nodes | Only reachable through |
|---|---|---|
| GHSA-mrhx-c7xc-m3w5 zod (high) | zod 3.25.76 under promptfoo and its @adaline/* adapters (12 nodes) | promptfoo |
| GHSA-3g3m-2fjr-6pw4 glob (moderate) | promptfoo/node_modules/glob 11.1.0 | promptfoo |
| GHSA-g3hv-75wg-m249 minimatch (moderate) | minimatch 10.2.6 (dev) | eslint, typescript-eslint, promptfoo |

npm offers only Promptfoo 0.125.1 (semver-breaking) for the first two. No minimatch 10.x fix exists, and current eslint 10.14.0 and typescript-eslint 8.72.1 still require ^10. Low findings (e.g. deepmerge GHSA-gcqx-w48m-w2h4 via puppeteer-extra-plugin-*) are below the gate threshold.

## M2 reproducibility constraint

Accepted Phase 10 / M2 eval evidence was produced with exact Promptfoo 0.116.7 plus the reviewed scoped overrides in the dependency ledger. Upgrading Promptfoo changes the evaluation engine behind that evidence, its egress/telemetry behavior and the override set, and would require re-running and re-reviewing accepted evidence. Accepted evidence is not rewritten.

## Options considered

1. **Upgrade Promptfoo to 0.125.1.** Clears the Promptfoo chain but breaks reproducibility of accepted M2 evidence and needs a new egress/telemetry and compatibility review. Rejected now; it is the intended exit when justified.
2. **Scoped, expiring exception (chosen).** List exact advisory ids with their package, severity, required ancestors, reason, decision date and expiry. A gate verifies on every run that every affected path goes through a required ancestor, so the same advisory reappearing on a runtime path fails CI.
3. **`npm audit --omit=dev` plus a separate dev audit.** Hides all dev findings from the blocking check by category rather than by reviewed advisory, and the dev audit would still need its own exception mechanism. Rejected as a blanket ignore, which the roadmap's security policy rules out.

Forcing minimatch 11 through an override was also rejected: it is a major change under the linter, adds a transitive package, and the patterns it handles come from repository configuration, not untrusted input.

## Decision

Keep Promptfoo 0.116.7. Replace the CI audit step with `node --experimental-strip-types scripts/audit-gate.ts`, which runs `npm audit --json` and:

- fails on any advisory at moderate or higher not listed in `security/audit-exceptions.json`;
- fails if a listed advisory reaches any affected node through a dependency path from the project root that avoids all of its `requiredAncestors`, computed from `package-lock.json`;
- fails if an exception is expired, malformed, duplicated, or its package or severity no longer matches the advisory;
- fails closed when the audit cannot produce a report;
- warns, without failing, for exceptions no longer reported, so they get removed.

The exceptions are those three advisories, decided 2026-11-06 and expiring 2027-02-06.

## Consequences

Runtime and new findings block CI as before. The excepted advisories stay installed in dev tooling: Promptfoo runs only the reviewed local profile with handwritten fixtures behind the egress guard, and lint reads repository-owned configuration. They are not reachable from the product runtime. The gate's path check relies on the lockfile mirroring the installed tree, which `npm ci` guarantees. The exception list is part of code review; widening an ancestor or extending an expiry is a reviewed change with a recorded reason. The gate needs registry access, as `npm audit` already did.

## Review trigger

Re-review on the earliest of:

- **Expiry:** 2027-02-06. The gate fails from 2027-02-07.
- **A non-breaking Promptfoo fix:** a release that fixes the zod/glob chain without breaking changes, which can then be adopted with re-validated M2 evidence.
- **A minimatch fix:** eslint or typescript-eslint accepting a fixed minimatch.
- **A stale-exception warning.**
- **A severity change**, which the gate reports as a failure.
