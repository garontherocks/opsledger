# One M4 Desktop Validation Bundle

Engineering CI proves deterministic state, authorization, crash/recovery, fixed execution and approval gates. Do **not** rerun M3 or reproduce all those tests manually. This single bundle needs the actual desktop generation/embedding runtime for the optional paired QA-plan experiment.

## Setup once

From the existing desktop checkout, with no local code edits:

```powershell
git fetch origin
git switch feat/m4-agentic-qa
git pull --ff-only
git rev-parse HEAD
npm ci --ignore-scripts
```

Compare HEAD to the final handoff SHA supplied with PR #6. Keep the approved M2/M3 Node/Ollama/model/embedding versions and full digests; do not replace them to seek a green model result. Keep the existing .env private: LAB_MODE=true, nonproduction, AI_ENABLED=true, EMBEDDINGS_ENABLED=true, OLLAMA_EXPECTED_VERSION=0.34.0, pinned qwen3:8b-q4_K_M and embeddinggemma:300m with the existing full digests. The approved Qwen digest is sha256:500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41. Do not copy credentials into versioned evidence.

With Ollama running:

```powershell
npm run ai:m4-desktop
```

No API/database/browser process is needed for this hardware-specific experiment. It performs 16 generations: four known QA cases × two repetitions × baseline/retrieval, rotating lane order. Both lanes receive identical fixed mandatory evidence; the retrieval lane adds bounded QA context. The poison case is an explicit asymmetric adversarial stress test, not part of a fair aggregate benefit score. English/Spanish and absent-evidence behavior are visible separately. No model tool, incident action or operational authority exists.

Output: evidence/desktop-private/m4-validation.json (ignored). Report the printed summary and selected safe samples, not your .env, private databases or full unrelated desktop files. Execution errors and contract/citation failures remain evidence; completed=true does not mean semantic acceptance. Runtime/digest mismatch fails, never falls back. Do not rerun or tune simply to manufacture a draft.

## Selected human review

See [sampling guide](m4-human-review.md). Judge two paired samples and the security/abstention samples; no numeric semantic pass rate from this tiny purposive sample. Direct reading remains the baseline; default QA retrieval adoption remains rejected unless useful paired evidence is established. Existing model/prompt promotion policy requires fresh calibrated bilingual held-out evidence and no critical unsupported operational claims.

## Integrated local product inspection (optional, same handoff)

The complete workflow is demonstrated by native CI and the QA browser test. To inspect the actual local feature, migrate the existing lab DB once (`node --env-file=.env --experimental-strip-types scripts/migrate.ts`, using its existing private DATABASE_URL), add QA_LAB_ENABLED=true and QA_TARGET_SHA=<exact current git rev-parse HEAD> to .env, and start the usual API/web processes. Keep loopback binding and source-tree startup; production/compiled deployment is not the QA lab target. Sign in using your existing synthetic lead/admin account, then Open QA lab.

For the integrated server, stop the old API first, run `npm run build`, then `node --env-file=.env --experimental-strip-types apps/api/src/server.ts` and open http://localhost:3100. This loads the private .env explicitly and serves the newly built UI. Do not overwrite existing secrets/passwords or reseed to work around an authentication problem.

Create a QA run → prepare checkpoint → run registered lab checks → inspect checks/SHA/action digest → approve or deny → store one local report if approved. Save the run ID; reload or restart the API and Load QA run to inspect persistence. This is one integrated inspection, not a required manual rerun of all deterministic tests. SHA drift, dirty tracked executable inputs, failed checks or expired approval fail closed. The four local lab checks are not all native/browser/build/audit CI checks and cannot issue a release verdict.

Turn QA_LAB_ENABLED=false afterward if returning to ordinary product use. Do not begin M5 or merge/release through the QA feature. Milestone human/desktop results remain pending until supplied; report only what actually happened.
