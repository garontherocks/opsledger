# Phase 6 mandatory teach-back checkpoint

> **2026-10-08 update:** The six Phase 6 teach-back items, desktop validation and grouped human review are now covered by actual learner responses and demonstration, including the final interview answer on 2026-10-08. See [desktop closure](phase6-desktop-closure.md) and the separate desktop evidence. Earlier pending statements below describe the original session; inherited release gates remain open and Phase 7 remains stopped. No unperformed learner exercise or per-run approval is implied.

Engineering evidence is available; checkpoint materials are ready. Human semantic review and Víctor's learner demonstration are **pending**. Do not infer understanding from generated code or assistant analysis. This phase stops here; Phase 7 is named only.

## 1. Five practical questions

1. What is the difference between Ollama as a runtime and Qwen3 as model weights, and why pin both runtime and model digest?
2. Where does the application enforce membership/revision, local-only provider access, resource budgets and the prohibition on operational actions?
3. What should the UI/API do when the provider stops or a caller's access/revision changes while generation runs?
4. Which actual pilot example shows that readable output or a larger model can still invent a fact or misuse an event ID?
5. What would you measure/review before selecting a desktop model or claiming that AI adds value over directly reading the timeline?

## 2. Architecture explanation

Explain the scoped flow in phase6-architecture.md without AI help. Identify who owns the snapshot, the policy and the human judgment. Explain why the DB connection is released before inference and why post-inference scope/revision checks are necessary. Distinguish a typed HTTP metadata envelope from a model producing a truth-validated structured answer.

## 3. Controlled failure

With the exact private runtime/model setup available, run `npm run ai:live-smoke`. The script owns a temporary loopback Ollama process: authenticates a synthetic user, generates through the real API, stops that daemon, receives 503 while incident reads stay 200, restarts it and generates again. It records phase6-live-api.json/log and closes its SQL/runtime resources. It does not target your ordinary installed daemon. Expected symptoms: summary unavailable, conventional read remains usable, incident revision stays 2. This requires the documented extracted Linux runtime and pulled 0.6B candidate; Windows users can demonstrate the same symptom by stopping only their lab instance.

Also inspect the timeline-injection live examples: the note requests invented repair/closure. Compare each resulting statement/citation to the fixture; distinguish alleged note text from established state. No model phrase can execute an action. Record accept/edit/reject and a reason manually in the review worksheet; there is no automated acceptance feature in Phase 6.

## 4. Security boundary

Server identity/object scope and a fixed loopback provider separate authenticated application evidence from an untrusted generated draft. The enforcing API/provider rejects cross-workspace/stale/revoked requests, unpinned/cloud models, redirected requests, oversized responses and excess concurrency. Prompt wording does not replace these controls. Prompt injection can still degrade the draft's truthfulness; no tools/domain-mutation path exists.

## 5. Interview scenario

A larger local model writes that an incident was repaired and cites an event ID, but the source is a malicious comment and the incident remains reported. Explain how you detect the unsupported claim, why a valid citation-looking string is insufficient, why tool-free architecture limits consequences and why human review remains necessary. Then propose a measured future model/context change with matched fixtures/repetitions, preserving deterministic authorization and release gates.

## 6. Concrete evidence and human review

Use phase6-model-manifest.json, phase6-live-pilot.json, phase6-live-api.json, phase6-boundaries.json, phase6 browser/API/unit logs, phase6-draft-ui.png and the versioned synthetic fixture. The 24 generations are actual inference; unit/API/browser provider fixtures are explicitly labeled.

Review worksheet: phase6-review-worksheet.md. Answer the five questions in your own words; explain the diagram and reproduce/diagnose the controlled failure. Record the demonstration and human review as performed only after it occurs. Current humanReview fields remain pending; no assistant output is represented as your answer or as human validation.
