# Formal M3 acceptance check — 2026-10-09

Decision: **NOT formally accepted yet**. The human/desktop checkpoint is complete. A required browser CI failure on the actual handoff remains unresolved; this is a blocking engineering gate, separate from live model quality. No model/prompt/budget change, desktop rerun, Teach-Back repetition, PR merge or M4 implementation was performed.

## Unchanged roadmap / phase DoD

| Gate | Assessment / evidence |
|---|---|
| Phase 11: mandatory checks cannot be skipped; invalid proposals never execute | Satisfied by deterministic controller fixtures/unit tests, with live six-turn fail-closed behavior consistent with boundedness; live runs do not independently exercise every invalid proposal |
| Phase 12: direct/MCP behavior parity; stderr diagnostics preserve stdout protocol | Satisfied by actual modern/legacy stdio contracts, wire transcript, correction and Windows CI |
| Phase 13: no metadata-based permission grant; local-only deployment | Satisfied by progressive reviewed skill/prompt tests, hostile metadata/resource denials, local HTTP scope/audience/Host/Origin/expiry/replay matrix |
| Cross-platform launcher defect | Corrected; original zero-run failure preserved; Windows CI and actual desktop rerun execute the three lanes |
| Desktop milestone execution | Completed at 52b1f567766a0098313c5637e4ec6f00c7d54c0d; 9 runs / 54 provider calls / 0 provider errors; 9 blocked by turn_budget; 0 drafts |
| Human semantic sampling | Complete: representative blocked run accepted as safe controller denial; final draft review not applicable |
| Consolidated learning | Complete: seven actual answers, two architecture explanations, execution/HTTP controlled failures and two Senior/Staff scenarios |
| Per-phase reports, architecture, evidence and security review | Preserved; current checkpoint recorded without retroactively rewriting failure evidence |
| Full required CI at corrective code cf4c6f0… | Passed run 37867155568: API, Windows and nine browser flows |
| Full required CI at final handoff 52b1f56… | **Blocking failure:** run 37867546978; API and Windows passed, browser lifecycle failed; earlier green code CI does not erase this subsequent failure |
| PR #5 merge / M4 authorization | Not authorized; PR remains open/unmerged; stop before Phase 14 |

## Live 9/9 turn_budget classification

All three lanes show the same repeated allowed read. This is bounded live-model quality evidence, not a transport-specific failure and not successful task completion. The controller did not manufacture a draft or bypass mandatory coverage. The Phase 11–13 DoD clauses above concern enforced boundaries, parity and knowledge/authority separation; they do not require a successful live final draft. Therefore this observed safe blockage does not itself block **Agent Foundations** acceptance under those unchanged phase DoD.

The roadmap section N still contains **provisional release targets**, including tool selection >=0.90 on allowed scenarios. This checkpoint does not establish that target and must not be called a passing tool-selection evaluation. Nine repeated executions of one known task are not a calibrated representative allowed-scenario dataset. Observed task finalization is zero of nine on this task; no numeric semantic pass rate or generalization claim is inferred. No target is waived, lowered or silently converted to satisfied. This model/prompt is not validated for effective live agent completion or automatic promotion. Product/release quality remains unmet; that matters before relying on agent output operationally or making benefit claims.

## Blocking engineering issue discovered by the final check

Actual handoff pull-request CI: [run 37867546978](https://github.com/garontherocks/opsledger/actions/runs/37867546978). Jobs: windows-launchers 113617805984 success; acceptance (api) 113617806126 success; acceptance (browser) 113617806093 failure.

The browser failed tests/browser/lifecycle.spec.ts:38 after clicking Reopen: getByLabel('Resolution summary', exact=true) was not visible within 5 seconds. Incident and knowledge flows passed before that failure; the complete nine-flow suite did not pass in this run. Root cause is not established by the failure log alone. It may be an application/test synchronization issue, but it is not labeled harmless flakiness and is not waived. The handoff was documentation/evidence-only above the earlier green corrective code; identical code plus a previous pass does not resolve an intermittent required gate failure.

Required resolution: diagnose this browser lifecycle failure, correct any implementation/test synchronization defect without blanket retries or weaker assertions, and demonstrate the required deterministic gate is satisfied. Do not rerun the desktop bundle or Teach-Back to address this unrelated CI gate. [Failure receipt](../evidence/m3-handoff-ci-failure.json). No code correction was performed in this checkpoint-recording assignment; governance requires stopping at the unresolved required deterministic gate.

## Non-blocking debt for the limited foundations lab

- Poor live tool progression/finalization: repeated same read, no successful drafts. Blocks functional model-quality/promotion claims; preserve unchanged pins/budgets until an authorized eval-driven experiment.
- Known fixed task / consumed fixtures, no fresh calibrated bilingual held-out promotion evidence; no demonstrated benefit over direct reading.
- Synthetic approved source registry, no private tenant/source lifecycle adapter.
- JavaScript/process egress guard is not OS/native/child-process isolation; cooperative cancellation cannot roll back arbitrary external side effects.
- Local HTTP educational profile, no production TLS/OAuth platform; reusable bearer with fresh request IDs remains usable until expiry/revocation within existing scope/audience.
- GitHub private-plan main protection limitation remains procedural.

## Recommendation and authorization

Complete the outstanding browser CI diagnosis/gate first. Once that deterministic blocker is resolved, the supplied human checkpoint and honest live quality evidence need not be repeated merely for documentation; reassess M3 formal acceptance using the unchanged DoD. Recommend M4 only conditionally after M3 engineering acceptance and explicit user authorization, as eval-driven research with the model-quality limitation visible. Phase 14's own measurable-benefit DoD must not be presumed satisfied from M3.

The original Windows failure remains failure evidence. The final nine-run bundle remains a completed experiment with zero drafts. Human checkpoint completion does not by itself override required CI. PR #5 remains unmerged. No Phase 14/M4.
