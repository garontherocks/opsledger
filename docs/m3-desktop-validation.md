# One M3 Desktop Validation Bundle

Purpose: run the integrated M3 agent against the actual pinned local provider once, covering direct/stdio/authenticated local HTTP without manually repeating CI-proven deterministic tests. This is the M3 milestone gate; no Phase 14 work is authorized.

Handoff branch: feat/m3-skills-http. Validated code SHA: 4510690a9f10da7b094641c5cc0c52c398094f25. The later documentation/evidence-only closure SHA is supplied in the handoff response/PR; see evidence/phase13-ci-receipt.json for the exact tested code. Clone/checkout that branch or pull it once. Verify git status is clean and git rev-parse HEAD matches the supplied handoff SHA. Run npm ci --ignore-scripts once after this pull because the official Node adapter is a new locked dependency.

Use the existing private .env with nonproduction LAB_MODE=true, AI_ENABLED=true and the previously approved full OLLAMA_DIGEST/model pin. Preserve the exact Ollama runtime version used for the experiment; set OLLAMA_EXPECTED_VERSION in .env if it is not already set. Do not change the model or digest for convenience. Node remains 24.19.0. Record actual GPU/hardware yourself; no hardware is assumed from older conversations.

Only Ollama is needed for this synthetic agent bundle. OpsLedger API/web/worker/PostgreSQL do not need to run. The script owns/cleans up its reviewed stdio child and ephemeral 127.0.0.1 HTTP listener. It creates a random local bearer grant in memory, never logs it or starts a public/token issuance endpoint.

In PowerShell from the repo root:

```powershell
npm run ai:m3-desktop
```

The bundle rotates direct/stdio/HTTP order over three repetitions: nine agent runs, each bounded to six turns and 120 s, with 60 s provider requests, existing token/character gates and exactly the same reviewed synthetic context. The generation-call count varies with actual model decisions. A JSON console result states completed, drafts, blocked, providerErrors and providerCalls (attempts, not proof of successful generation). The private evidence file is evidence/desktop-private/m3-validation.json and is ignored by Git. Runtime/model/digest mismatches fail closed rather than silently changing the system. The file labels configured pins/expected runtime separately; successful generation metadata is in proposal traces.

completed=true means the experiment ran, NOT that AI quality passed. Inspect blocked reasons honestly: malformed proposal, unknown tool/ID, missing mandatory reads, timeout, token/output limits or provider/runtime failures remain evidence. Do not rerun until green or weaken gates. Three repeats on one known task do not establish generalization, statistical significance, production quality or product value.

Material human sampling only:
- Inspect one representative final draft (if any) for exact IDs, factual support, missing/unsupported claims and separation of proposed checks from executed SHA-bound evidence. Record Accept/Edit/Reject with a short reason.
- Inspect one divergent/blocked run (if any) to explain whether the controller safely denied it; otherwise state that no blocked/divergent run was observed. Do not manufacture one or inspect every draft.

Report the console summary, actual environment and those selected judgments. Raw files contain fixed synthetic sources, but still review before sharing; never upload .env, bearer grants, secrets or unrelated private evidence. If all runs block, report that inconclusive live tool-selection result; engineering gates are not replaced by a semantic quality score.

Complete the [seven-question consolidated Teach-Back](m3-teach-back.md) and architecture/scenario explanations in the same milestone checkpoint. Then record actual human/desktop outcomes and perform formal M3 acceptance. No repeated M2 desktop bundle or old Teach-Back is required. Stop before M4/Phase 14 until explicit authorization.

## Preserved first Windows attempt and corrective handoff

The first desktop attempt at 544f22edf55c4abd806751e693162d936c0aa7e0 failed during stdio startup with zero agent runs. It is preserved in evidence/m3-windows-startup-failure.json and is not a model/provider/quality trial. A corrective handoff will be supplied only after full Linux CI and Windows launcher/M3 integration CI pass. Pull that exact successor once, retain the approved runtime/model pins, and rerun this bundle once. Do not rewrite the failed attempt as completed; actual new desktop results remain pending.
