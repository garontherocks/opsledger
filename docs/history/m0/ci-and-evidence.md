# Expected Commands and Evidence Contract

Future application scripts: npm ci; npm run lint; npm run typecheck; npm run build; npm run test:unit; npm run test:integration; npm run test:api; npm run test:e2e. These are planned contracts, not existing app commands.

The Phase 0 spike only has typecheck, test and build. Do not claim lint or browser E2E ran without a corresponding implementation/output.

Future local startup: docker compose up -d db; npm run db:migrate; npm run db:seed:lab; npm run dev. DB readiness waits on a real health check, not a sleep. npm run db:seed:lab refuses production and does not silently reset existing databases.

Future CI: install frozen lock; lint/typecheck/build; unit; isolated PostgreSQL migration + API integration; critical Chromium flow; advisory/secret review; artifact upload even on failure. All commands exit nonzero on real failure. Retrying does not delete first-attempt evidence.

Evidence manifest must record command, start/end, exit status, runtime/package-lock hash, OS, DB/browser version when used and artifact path. No credentials in command logs. Required check failure remains failure; environment unavailability is blocked/inconclusive, not pass.

Playwright version and its installed browsers must match. Browser install is separate from npm package installation. Pin container digests after verification; do not invent a registry digest.

Future GitHub branch: chore/phase0-readiness; Phase 1: feat/incident-first-slice. Main stays protected; no automatic merge. PR summary leads with problem/behavior, scope and actual validation. Owner-only self-review is not independent approval.

## Phase 5 baseline

The existing acceptance workflow now collects phase5 CI evidence and runs an isolated embedded restore/benchmark in the API lane in addition to native SQL acceptance. Six browser flows include selected accessibility/visual/maintenance checks and an authenticated v1 demo. Remote execution has not occurred; source configuration is not CI evidence. Checked-in pixel expectations describe Linux/Chromium 141; native CI uses the pinned driver default browser and must review rendering differences before acceptance. Never overwrite a baseline to conceal a regression. Only selected evidence is uploaded; private browser traces/reports and fixture credentials/backups are excluded.
