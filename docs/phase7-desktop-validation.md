# Phase 7 desktop validation — one batch

Checkout feat/structured-ai-outputs and pull its published commit. Keep the Phase 6 private .env and databases; no reset, migration or secret upload is needed. Do not repeat Phase 6 installation/outage checks.

First verify the new UI acceptance with its explicitly deterministic provider fixture (the harness owns a disposable PGlite database/API and a generated test password). No ordinary API/worker may hold port 3100:

```powershell
npm run build
$env:E2E_AI_FIXTURE="true"
$env:E2E_FLOW="assistance"
npx playwright install chromium
npx playwright test tests/browser/assistance.spec.ts
Remove-Item Env:E2E_AI_FIXTURE, Env:E2E_FLOW -ErrorAction SilentlyContinue
```

Then start the owned local Ollama lab in a separate terminal, preserving Phase 6 pinning/cloud-off/loopback configuration:

```powershell
$env:OLLAMA_HOST="127.0.0.1:11434"
$env:OLLAMA_NO_CLOUD="1"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"
ollama serve
```

In the repository terminal, with AI_ENABLED=true, the full 8B digest and AI_TIMEOUT_MS=120000 in the private .env from Phase 6:

```powershell
npm run ai:structured-pilot
```

Twelve generations use the four existing synthetic fixtures and three repetitions, one exact pinned model. The 768-token structured budget differs from the Phase 6 256-token baseline: do not claim matched latency improvement. The result is evidence/desktop-private/phase7-structured-pilot.json. Upload this JSON and the browser result together; if a command fails, keep partial evidence and the error rather than rerunning the entire batch. Do not upload .env, credentials, database files or browser traces. No app API or worker needs to run for this standalone model pilot.

One grouped human review and the new Phase 7 teach-back conclude acceptance; the script never decides that a contract-valid output is true. Phase 8 stays stopped.
