# Formal M4 acceptance — limited Agentic QA lab

Final review after the initial green implementation reproduced approval expiry during the asynchronous target check. The local report-only gap is corrected with a post-check revalidation and DB-clock INSERT predicate, plus two new deterministic cases. Corrective full CI passed on e1fb584b4c3808ae8371f514d0678cd4d0841d20, run [37962926938](https://github.com/garontherocks/opsledger/actions/runs/37962926938), including the native independent-clock denial. Earlier green receipts remain historical evidence and are not proof of this missing case. See [preserved red regression](../evidence/phase16-expiry-toctou-regression.json).

| Gate | Status | Evidence / qualification |
|---|---|---|
| M3 accepted base / evidence preservation | Satisfied | main c55eee55fcfeb4c31e0b252a1573156e2a9d41b4; no rewrite of live failures or checkpoints |
| Phase 14 index/context/provenance/security | Satisfied | three deterministic tests + separate reviewed QA path, no tenant/product index coupling |
| Phase 14 measurable-benefit adoption rule | Satisfied as rejected-feature exit | [ADR 009](adr/009-qa-context-adoption.md); no live plan/value benefit demonstrated, default adoption rejected |
| Phase 15 state/history/memory and recovery | Satisfied | native independent child recovery, expiry/poisoning/isolation/idempotency; phase gate passed before Phase 16 |
| Phase 15 runtime comparison | Satisfied at documented spike scope | real LangGraph interrupt/resume probe; direct retained, no superiority/local-provider claim |
| Phase 16 bounded workflow / actual registered execution | Satisfied | actual Linux + Windows fixed suites, fenced lease/recovery, required failures block |
| Phase 16 approval / replay / TOCTOU / exactly-once report | Satisfied | native denial/expiry/identity/action/SHA/concurrency and six SIGKILL boundaries; immutable one-time report |
| Required existing full CI / security regressions | Satisfied on tested implementation | [corrective receipt](../evidence/phase16-expiry-ci-receipt.json); final docs-only successor requires its own head CI |
| Local product reproducibility | Engineering satisfied | opt-in loopback lab, documented migration/config/session flow; native browser UI passed |
| Actual M4 desktop paired model observations | Satisfied | user reports 16 live generations, zero provider/contract failures; no automatic quality acceptance or rerun |
| Material human semantic/security sampling | Satisfied | six supplied judgments; limited-scope HITL accepted; retrieval remains rejected for default adoption, no semantic percentage |
| Consolidated learner Teach-Back | Satisfied | user reports Q1–7, both flows, two failures and both Senior/Staff scenarios passed; no answers invented |
| Formal M4 acceptance | Accepted for the limited M4 scope | engineering and supplied human gates satisfied; required final-head CI must stay green |
| M5 authorization | Not granted | stop before Phase 17; PR #6 unmerged |

The engineering acceptance result does not promote any model/prompt, establish production semantic quality or product benefit, or authorize an operational action. Known M3 quality debt and Phase 14 rejection remain visible. See [consolidated engineering/debt](m4-engineering-report.md).

## Formal decision — 2026-10-09

The unchanged roadmap/phase DoD and approved milestone governance are satisfied for Phases 14–16's limited lab scope. Phase 14 exits through the documented rejected-feature ADR: provenance works, but the supplied paired semantic judgments do not establish retrieval benefit; default adoption remains false. Phase 15's native state/isolation/recovery/idempotency and Phase 16's tested-SHA/fixed-check/HITL/crash/expiry boundaries remain backed by deterministic evidence. The user's final checkpoint closes the desktop, material human review and learning gates.

**M4 is formally accepted within that limited scope.** No required blocker was found in this acceptance review. This documentation/evidence-only head must pass its own existing required CI; a failed gate reopens acceptance rather than being waived. The exact final SHA/run/result are recorded in PR #6's body and GitHub checks after completion. The prior implementation handoff 12f60cc2d8e8d9ad757127931bfa06aafadb3a47 already passed all lanes in [run 37963567776](https://github.com/garontherocks/opsledger/actions/runs/37963567776).

[Actual user checkpoint](../evidence/m4-human-checkpoint.json), [semantic/HITL judgments](m4-human-review.md) and [Teach-Back results](m4-teach-back.md) record only the supplied outcomes. Neither desktop nor Teach-Back was repeated; no implementation/model/prompt/budget was changed. Existing debt and original failures remain preserved. Acceptance does not authorize merging PR #6, starting Phase 17/M5, adopting retrieval, promoting the model or issuing a release verdict.
