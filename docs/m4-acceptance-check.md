# Formal M4 acceptance check — engineering ready, human checkpoint pending

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
| Actual M4 desktop paired model observations | Pending | one hardware-specific bundle, no rerun of M3 |
| Material human semantic/security sampling | Pending | selected pairs/poison/absence and HITL review; no invented judgments or numeric percentage |
| Consolidated learner Teach-Back | Pending | seven questions, two flows, selected failures and two scenarios; no per-phase checkpoint |
| Formal M4 acceptance | Pending human milestone gate | engineering ready does not imply actual user understanding/semantic acceptance |
| M5 authorization | Not granted | stop before Phase 17; PR #6 unmerged |

The engineering acceptance result does not promote any model/prompt, establish production semantic quality or product benefit, or authorize an operational action. Known M3 quality debt and Phase 14 rejection remain visible. See [consolidated engineering/debt](m4-engineering-report.md).
