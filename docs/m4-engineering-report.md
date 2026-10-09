# M4 — Agentic QA engineering handoff

Engineering complete for Phases 14–16 on e3426f234e6d4dbed9fb5811ae68cef61fcf85c3, with required Linux API/browser and Windows CI green at [run 37960577739](https://github.com/garontherocks/opsledger/actions/runs/37960577739). Actual CI checkout d19fed05c2e5822a5a100aaf61b0eb0af733e318 has exactly the same tree as the branch code commit; [receipt](../evidence/phase16-ci-receipt.json) records both identities. The final handoff successor adds documentation/evidence only and retains its own required checks.

**Milestone boundary reached. Formal M4 acceptance remains pending actual human/desktop outcomes. No Phase 17/M5 started. PR #6 is not merged.**

## Individual phase boundaries

| Phase | Scope / decision | Required phase engineering gate |
|---|---|---|
| 14 | Separate QA index, pinned space, bounded provenance, scoped/stale/poisoned context tests; reject default adoption because mechanical coverage is not measured live strategy/value benefit | 5628a6bb1bfc3891bcc9050237b375edeb490fa8 / [37956355456](https://github.com/garontherocks/opsledger/actions/runs/37956355456), all three lanes green before Phase 15 |
| 15 | Typed PostgreSQL checkpoints, immutable history, reviewed expiring risk memory; retain direct runtime after isolated comparison; native independent-process recovery | 7018867f64b058c08026b808085e8254214a7bb3 / [37957661131](https://github.com/garontherocks/opsledger/actions/runs/37957661131), all three lanes green before Phase 16 |
| 16 | Bounded durable registered check workflow, fenced recovery, SHA/action/identity/expiry HITL and one transactional local report effect | e3426f234e6d4dbed9fb5811ae68cef61fcf85c3 / [37960577739](https://github.com/garontherocks/opsledger/actions/runs/37960577739), all three lanes green |

Reports: [14](phase14-report.md), [15](phase15-report.md), [16](phase16-report.md). Decisions: [QA context](adr/009-qa-context-adoption.md), [durability/runtime](adr/010-qa-durable-state.md). [Current architecture/data flow](m4-architecture.md).

## Actual validation

| Layer | Actual observed result |
|---|---|
| Existing domain/provider/controller units | 48 passed |
| QA context / provenance / paired mechanics | 3 passed; 5/5 known mechanical evidence needs found, no semantic/value inference |
| Native Phase 15 state/history/memory | 7 tests passed; independent Node child recovered committed revision 2 |
| Native Phase 16 workflow/API/crash/real runner | 12 tests passed, zero skips |
| Abrupt native child crash modes | context, claim, receipt, approval, report, after_report: all recovered; one stored report each |
| Actual fixed registered suite | all four gates passed on Linux and Windows, bound to actual checkout SHA |
| Existing native product integrations | 83 passed, zero skips; lifecycle lock-overlap regression also passed |
| Existing MCP / Skill / agent fixtures | 8 MCP, 7 M3, 8 agent fixtures passed |
| Existing AI regression / egress | 114 deterministic regressions passed; zero unexpected egress; M2 fixture bundle passed |
| Browser | all nine existing flows + QA review flow; five fresh lifecycle runs, no retries |
| Build / static / dependencies | lint, strict typecheck, build, audit passed; zero reported vulnerabilities |
| M4 desktop harness in Work | 16 fixture abstentions, zero provider/contract errors; not live generation or human acceptance |

Commands are in [.github/workflows/phase4.yml](../.github/workflows/phase4.yml). Local supplemental PGlite/Chromium 153 UI checks passed, but native PostgreSQL and CI-pinned Playwright/Chromium remain the required evidence. [Exact receipt](../evidence/phase16-ci-receipt.json); artifact uploads preserve generated native/Windows/browser results. [Development failures](../evidence/phase16-development-failures.json) and [initial PGlite child limitation](../evidence/phase15-development-failure.json) remain honest records.

## Security / evaluation summary

Authorization and workspace/owner isolation, current SHA/provenance/expiry, immutable receipt integrity and approval identity/action/replay/TOCTOU checks are deterministic. Invalid proposals cannot supply executable paths/commands or required-check outcomes. Fixed suite execution releases the DB connection, then revalidates membership/target; revoked access discards its result. A lease allows at most two read-only attempts and rejects late fenced completions. Atomic unique report insertion prevents duplicate effects after rollback or lost acknowledgement. Memory stores reviewed risk codes and citation metadata, not raw secrets/transcripts/instructions.

AI remains optional/unverified with no operational authority. QA retrieval is experimental and rejected for default adoption; the desktop bundle is a known-case paired generation/interpretation experiment, not model promotion. Valid hashes/quotes establish integrity/reference validity, not truth. Direct reading is still the baseline. Existing M2 calibrated bilingual promotion threshold/policy is unchanged; no product-value claim. Full CI is independent of the four local lab checks and cannot be bypassed by approval/model prose.

## Preserved M1–M3 facts

Base main c55eee55fcfeb4c31e0b252a1573156e2a9d41b4 is the user's PR #5 merge of formally accepted M3. Original Windows --import failure and lifecycle deadlock failure/correction remain versioned. Actual M3 live result remains 9/9 turn_budget, 54 provider calls, zero errors, zero drafts. No prompt/model/budget change or historical rewrite; no desktop/Teach-Back repeat. M1/M2 behavior and all required deterministic gates remain intact.

## Remaining acceptance work versus debt

Required milestone human gates: [one desktop bundle](m4-desktop-validation.md), [selected material samples](m4-human-review.md), [one consolidated Teach-Back](m4-teach-back.md). Actual user outcomes are pending; fixture approvals never count as human judgments. No engineering blocker remains on the tested implementation; final handoff-head CI status must also be green.

Non-blocking limited-lab debt: fresh calibrated bilingual QA-plan/value evidence; M3 live tool-selection failure; no default retrieval adoption; reviewed repository corpus rather than dynamic tenant ingestion; no automatic model/memory-to-executor wiring; same-owner reviewer rather than four-eyes approval; one-hour runs/short metadata with no long-term retention/purge policy; process/JS guards rather than an OS/native sandbox; trusted checkout/dependencies/secret and local PATH Git assumptions; cooperative cancellation cannot roll back arbitrary external effects (none authorized here); no production HTTP/TLS/OAuth/release workflow. HMACs do not protect against a compromised application secret or DB owner who can alter enforcement. Existing main protection plan limitation remains procedural, not claimed enforced.

## Recommendation

Finish the single M4 human/desktop checkpoint, then decide M5 explicitly. Recommend M5 only as a bounded learning/comparison experiment with a concrete orchestration need; there is no evidence yet to adopt n8n/specialists or grant operational authority. Keep the direct deterministic workflow as the comparison baseline and retain rejection/inconclusive outcomes as valid results. Do not start Phase 17 automatically.
