# One M2 Desktop Validation Bundle

Use feat/m2-ai-regression at the exact final handoff commit. Preserve existing private .env, password and database volume. Stop old API/worker terminals.

```powershell
git fetch origin
git switch feat/m2-ai-regression
# If missing locally: git switch --track origin/feat/m2-ai-regression
git pull --ff-only
npm ci --ignore-scripts
docker compose -f infra/compose.yaml up --build -d db
node --env-file=.env --experimental-strip-types scripts/migrate.ts
npm run build
```

Retain your existing DB_PASSWORD shell value. Do not reset volumes, change passwords or reseed the existing lab. PostgreSQL stays 18.6; the verified pgvector 0.8.7 build precedes additive migrations. Preserve any startup/migration failure; do not bypass it.

Keep Phase 6 cloud-off/loopback/single-model Ollama settings, Qwen 8B full digest and private 120000 ms timeout.

```powershell
ollama --version
ollama pull embeddinggemma:300m
(Invoke-RestMethod http://127.0.0.1:11434/api/tags).models | Select-Object name,digest
```

Add to private .env:
```text
EMBEDDINGS_ENABLED=true
EMBEDDING_MODEL=embeddinggemma:300m
EMBEDDING_DIGEST=sha256:<full-installed-64-character-digest>
OLLAMA_EXPECTED_VERSION=0.34.0
```

0.34.0 is the recorded runtime; disclose any change instead of silently upgrading/downgrading. Keep AI_ENABLED=true, LAB_MODE=true, NODE_ENV=development and existing OLLAMA_MODEL/OLLAMA_DIGEST. Ollama must serve on literal 127.0.0.1:11434.

```powershell
npm run ai:m2-desktop
```

Keep TEST_DATABASE_URL unset. The harness owns disposable embedded DB port 55446, never the product DB. It indexes three synthetic runbooks, measures nine bilingual retrieval cases, then records 36 real generations: six structured, twenty-four fixed-context across four cases/two prompts/three repeats, six bilingual end-to-end. Candidate prompt v2 is not adopted automatically.

Output: evidence/desktop-private/m2-validation.json. Failures/partial stages/raw redacted outputs are retained; do not repeat the whole batch to manufacture green results. GPU/RAM observations are samples, not peaks. This is model/hardware evaluation, not native backup proof. Do not rerun proven CI suites.

Start API/worker with your existing commands. As editor, index one published runbook; inspect semantic search, copilot sources/version/spans/unverified label and optional feedback once. Inspect a normal incident. AI must not change state. Optional off flags preserve keyword/timeline fallback.

Share only synthetic report and relevant startup results, never .env, credentials, dumps, weights or private content. Review [samples](m2-human-review-samples.md) and complete [one Teach-Back](m2-teach-back.md). Stop before Phase 11.

## Actual milestone outcome — 2026-10-08

The desktop and human checkpoint is completed at handoff 4e10225. See [actual human record](m2-human-checkpoint.md) and [acceptance check](m2-acceptance-check.md). Original procedure/evidence limitations above remain historical; do not rerun the bundle or invent judgments. Three literal failures and all eight Accept/Edit/Reject judgments remain recorded. Threshold agreement is still provisional; no prompt/model is automatically promoted and M3 remains unauthorized.
