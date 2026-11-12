# One M5 Desktop Validation Bundle

Only actual local Qwen inference requires this machine. Native DB, n8n runtime, browser, Windows launcher and registered-suite execution are already required CI checks; do not repeat them here. Do not rerun/tune accepted M4 evidence.

On the reviewed final PR #7 branch head, clean checkout, Node 24.19.0 and the existing private .env, preserve LAB_MODE=true, nonproduction, AI_ENABLED=true, approved qwen3:8b-q4_K_M digest sha256:500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41 and OLLAMA_EXPECTED_VERSION=0.34.0. Do not share .env or credentials. The script rejects other model/digest/runtime values. No embedding/retrieval change or additional dependency is required.

```powershell
git rev-parse HEAD
npm ci --ignore-scripts
npm run m5:desktop
```

The wrapper binds QA_TARGET_SHA to the actual clean checkout and checks it after execution. This single bundle compares four known synthetic cases × two repetitions × direct/tool/handoff on identical evidence/identity with reversed mode order: at most 56 provider calls. Calls are bounded; outage, deadline, token/contract failure or expiry is inconclusive. Do not retune or silently retry cases to improve outcomes. Keep any observed failures.

Outputs remain private in evidence/desktop-private/m5-bundle.json and m5-specialist-comparison.json. Return sanitized JSON evidence and material samples/judgments requested in m5-human-review.md, plus Teach-Back/security judgments. Check model failure counts, not only bundle completed. Completed means measurement ran, not semantic acceptance, cost benefit or passed QA. Fixture output cannot substitute for this run.

No Docker Hub token is used by this bundle. No incident mutation, report approval/effect, arbitrary shell, merge/release or M6. Recommendation remains no default specialist adoption unless reviewed paired evidence justifies reconsideration; rejection/insufficient benefit is a valid milestone result.
