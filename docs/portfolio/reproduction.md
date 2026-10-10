# Reproduce only the evidence you need

[Entry point](../../README.md) · [CI and evidence detail](../ci-and-evidence.md)

Start from a fresh clone and a reviewed commit. Use Node 24.19.x/npm and the committed lockfile. No credentials, existing database or GPU are needed for deterministic source validation.

```bash
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
```

The default integration harness creates isolated PGlite fixtures. Native PostgreSQL-specific concurrency/locking is a separate required CI lane; an embedded pass cannot replace it. Tests use synthetic data. Never point a harness at production.

## Browser validation

```bash
npx playwright install --with-deps chromium
npm run build
npm run test:e2e
```

The existing browser runner launches a separate server per flow. AI/embedding browser scenarios use explicitly selected fixtures; their success is deterministic UI/contract evidence, not live model quality. Test scripts write generated evidence under `evidence/`; use a disposable fresh checkout, do not overwrite accepted historical records in a publication branch. Images/traces may contain generated synthetic identifiers; inspect before publishing.

## Local deterministic product with native database

Requires Docker and a private local `.env`; [example keys](../../.env.example) are placeholders, not usable secrets. Generate your own DB password and auth secret, use an owned empty database and private storage, and keep AI/embedding/QA flags off initially. Export the locally chosen `DB_PASSWORD` for Compose without printing it.

```bash
docker compose -f infra/compose.yaml up --build -d db
node --env-file=.env --experimental-strip-types scripts/migrate.ts
node --env-file=.env --experimental-strip-types scripts/migrate.ts
node --env-file=.env --experimental-strip-types scripts/seed.ts
npm run build
node --env-file=.env --experimental-strip-types apps/api/src/server.ts
```

In another terminal, run `node --env-file=.env --experimental-strip-types apps/api/src/worker.ts` with the same private storage configuration. Open the local app at `http://localhost:3100`. Seeding writes local synthetic account credentials; do not publish that file or run the seed against shared data. The repeated migration is an idempotency check, not a recovery guarantee. For the native test database setup and Windows launchers follow the existing [CI guide](../ci-and-evidence.md) and workflow, rather than substituting the embedded lane.

## AI / local-model evidence

Inspect accepted [M2](../../evidence/m2-human-desktop-validation.json), [M3](../../evidence/m3-human-desktop-checkpoint.json), [M4](../../evidence/m4-human-checkpoint.json) and [M5](../../evidence/m5-specialist-comparison-desktop.json) records first. Keep original SHA/model/runtime/corpus context. No accepted expensive experiment is rerun for Phase 20. Optional reproduction needs an appropriate local machine/GPU, Ollama/model artifacts and the matching milestone's desktop instructions; a different model/runtime produces new evidence, not a replacement historical result.

Credential-free fixture regressions (`npm run ai:regression`, `npm run mcp:test`, `npm run m3:test`, M4/M5 fixture tests) validate mechanical contracts/adversarial behavior. Do not call their output live model reasoning.

## n8n lab

Follow [the bounded lab guide](../../lab/n8n/README.md), unchanged pinned n8n `2.42.6` and PostgreSQL `18.6` with pgvector `0.8.7`. The actual smoke is `npm run m5:n8n-smoke` and requires its documented database/runtime setup. Credentials are operator-created local references; the checked-in export contains no values. Do not expose n8n administration, local model endpoints or the QA bridge publicly. n8n orchestration is not QA authority or an OS sandbox.

CI authenticates Docker Hub pulls using repository secrets before access, password-stdin and an ephemeral Docker config with cleanup. Manual users may need their own registry credentials/rate-limit capacity; tags remain mutable. Do not alter a pin or skip runtime validation to obtain green.

## What CI already proves

All required OpsLedger API, browser and Windows lanes must be green on the final M6 head. [Accepted M5 run](https://github.com/garontherocks/opsledger/actions/runs/38014060972) remains historical proof only. No reviewer needs to manually rerun an expensive experiment just to inspect its accepted findings. Full current-head native/Windows verification belongs to CI because this workspace has no Docker daemon or Windows host.

## Desktop-only requirements

Phase 20 adds no model, runtime or machine-specific mechanism. **No new GPU/local-model Desktop Validation Bundle is required.** The final user review concerns truthful copy, clarity and publication safety. Optional desktop viewing of the repository/site is presentation review, not new semantic evaluation. Website build/Playwright validation is recorded in its separate repository/PR.
