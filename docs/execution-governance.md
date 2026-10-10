# Approved execution governance — 2026-10-08

The user-approved amendment in [roadmap.md](roadmap.md#authorized-milestone-execution) governs execution. Individual phase scopes and engineering DoD remain unchanged. Finish each phase before starting the next, preserve phase reports/evidence and coherent history, and fix ordinary technical problems autonomously.

Current authorization: **M4 — Agentic QA, Phases 14–16**, explicitly authorized on 2026-10-09 from accepted/merged M3 main c55eee55fcfeb4c31e0b252a1573156e2a9d41b4. Engineering boundary reached; stop before Phase 17/M5. Earlier authorization annotations below are history, superseded by the latest M4 update. No automatic merge/deployment authority.

Human gates are consolidated at milestone boundaries: practical 5–8-question Teach-Back, architecture/data flow, selected failures/security/interview scenarios, material semantic review samples and one Desktop Validation Bundle. Generate per-phase learning materials without assuming answers. Do not repeat deterministic validation on the desktop without a specific reason.

Stop earlier for a failed required deterministic gate, serious security issue, human/product architecture decision or unresolved material prerequisite. Engineering rigor, explicit authority boundaries, local-first setup, evidence-backed claims and honest failure/inconclusive reporting are unchanged. No automatic merge or deployment authority is granted.

## Authorization update — 2026-10-08 after M2 closure

M2 is formally accepted under docs/m2-quality-acceptance-policy.md and merged to main. The user requested the next phase, authorizing Phase 11, the first Agent Foundations phase. The earlier M2-only authorization statement is historical and superseded for Phase 11. This assignment implements Phase 11 only; do not silently add Phase 12/13 implementation. Keep learning/desktop checks accumulated rather than requiring a new phase-level human checkpoint. No M4/Phase 14 transition is authorized.

## Authorization update — 2026-10-08 Phase 12

The user explicitly ordered PR #3 merge and Phase 12 start. PR #3 merged with both current-head CI lanes successful, using a merge commit (no squash/rebase or branch deletion), at b0b785a922288a831fe28266c4d2bb27462b6e5a. This assignment implements Phase 12 only, preserving its individual DoD and accumulated M3 learning/desktop validation. No Phase 13 implementation or M4 transition is included. Main protection remains unavailable under the recorded private-plan limitation; actual checks are still required before integration.

## Authorization update — 2026-10-08 Phase 13 / M3 gate

The user reviewed PR #4 and explicitly ordered merge plus Phase 13. PR #4 current-head CI run 37854227994 succeeded; merge commit 95caf7486c0380a22bebe5c2c55a24419fcdf239 preserves both parents and all branches. Implement Phase 13 above that main state. Stop at the M3 milestone human gate after its engineering DoD: consolidated Teach-Back, selected material review, one desktop bundle and an honest acceptance report. No Phase 14/M4 is authorized. Actual human/desktop outcomes remain pending until supplied by the user; M2 answers must not be copied into M3 as new answers.

## M3 corrective authorization — 2026-10-09

The user reported a real Windows Node --import startup defect at handoff 544f22edf55c4abd806751e693162d936c0aa7e0, before all nine agent runs, and explicitly authorized cross-platform launcher fixes, diagnostic/regression coverage, full deterministic CI, evidence preservation and a new handoff for one desktop rerun. This is not a model/provider/MCP quality result. Corrective work stays on feat/m3-skills-http / PR #5 with existing pins, fixed launch allowlists and egress boundaries. Actual M3 desktop/human acceptance remains pending. No PR #5 merge, Phase 14 or M4 start is authorized.

## Actual M3 milestone checkpoint and acceptance check — 2026-10-09

The user completed the desktop/human checkpoint at 52b1f567766a0098313c5637e4ec6f00c7d54c0d: 9 agent runs, 54 provider calls, 0 provider errors, 0 drafts; all 9 safely blocked at six-turn turn_budget across direct/stdio/HTTP. Representative blocked run: Accept as safe controller denial. Final draft review: not applicable. Seven learner answers, two architecture flows, controlled failures and both Senior/Staff scenarios are recorded in [actual checkpoint](m3-human-checkpoint.md); no additional answers or judgments inferred. No desktop/Teach-Back rerun or model/prompt/budget change.

The 9/9 bounded blockage is poor/inconclusive live model quality, not transport failure or successful task completion. It does not violate the Phase 11–13 foundations DoD by itself; provisional tool-selection release quality is not demonstrated. Formal M3 acceptance is nevertheless **blocked** by the later required browser lifecycle CI failure on this handoff (run 37867546978), despite API/Windows passing and earlier corrective CI being green. [Formal acceptance check](m3-acceptance-check.md) distinguishes this engineering blocker from model debt. Earlier pending-human notices are historical and superseded; actual checkpoint is complete, milestone acceptance remains pending engineering resolution. PR #5 unmerged; no Phase 14/M4 authorization.

## Formal M3 closure after focused lifecycle remediation — 2026-10-09

M3 is formally accepted for the limited Agent Foundations lab scope at tested code a55fbe29bcfb5e78fdee4dc4c54b5cdca44be479. Full CI run 37953380880 passed API/browser/Windows; controlled native evidence changes from mutation SQLSTATE 40P01 to both handlers committed under identical lock overlap. Five targeted native lifecycle browser runs and all nine full browser flows passed, along with 83 native integrations without skips and unchanged security/AI checks. [Acceptance](m3-acceptance-check.md), [causal remediation](m3-lifecycle-remediation.md), [exact receipt](../evidence/m3-lifecycle-remediation-ci-receipt.json).

This supersedes the previously unresolved lifecycle blocker. Original failure evidence and actual human checkpoint remain preserved. The desktop outcome is still 9/9 safe turn_budget blocks, zero drafts: poor/inconclusive live quality, not promoted model quality or product benefit; provisional release targets remain unproven. No desktop/Teach-Back repeat or AI changes. No required M3 blocker remains; non-blocking limited-lab debt stays documented. PR #5 remains open/unmerged. Recommendation: M4 only after explicit authorization; no Phase 14/M4 has begun. This update changes no roadmap phase scope, DoD or threshold.

## M4 authorization — 2026-10-09

The user explicitly authorized M4 Phases 14 → 15 → 16 from merged main c55eee55fcfeb4c31e0b252a1573156e2a9d41b4. PR #5 is merged and M3 formally accepted. Preserve each individual phase DoD, security review, evidence and commits; proceed autonomously only after each engineering gate passes. Consolidate material human review, desktop checks and Teach-Back at M4. Stop before Phase 17/M5; no merge/release authority is granted. Preserve actual M3 9/9 turn_budget / zero drafts and both original Windows startup and lifecycle failures.


## M4 engineering boundary reached — 2026-10-09

Phases 14–16 each completed their engineering scope and separate gate/report before the next began. Tested Phase 16 code e3426f234e6d4dbed9fb5811ae68cef61fcf85c3 passed all Linux API/browser and Windows lanes in run 37960577739. Exact receipts and scope/debt are in [M4 engineering report](m4-engineering-report.md). Default QA retrieval adoption remains rejected; model quality/value/promotion remains unproven. Actual M3 results and all failures remain preserved. One desktop bundle, selected material review and consolidated Teach-Back await actual user outcomes. Formal M4 acceptance is pending that milestone checkpoint. PR #6 remains unmerged. Stop before Phase 17/M5; no additional milestone authorization granted.


## M4 final expiry correction — 2026-10-09

Final review reopened the Phase 16 engineering gate for approval expiry during an asynchronous SHA check. Corrective code e1fb584b4c3808ae8371f514d0678cd4d0841d20 passed all required lanes in [run 37962926938](https://github.com/garontherocks/opsledger/actions/runs/37962926938), including native application/DB-clock denial tests. Earlier receipts remain historical; [corrective receipt](../evidence/phase16-expiry-ci-receipt.json) supersedes that gate. Final docs-only head retains its own required CI. Actual M4 human/desktop/Teach-Back remains pending; PR #6 unmerged, stop before Phase 17/M5. No phase scope, DoD, threshold or authority change.

## Formal limited-scope M4 acceptance — 2026-10-09

The user completed the final M4 human checkpoint: 16 live desktop generations, zero provider/contract failures, six explicit semantic judgments, limited-scope HITL acceptance and all consolidated Teach-Back items passed. [Actual checkpoint](../evidence/m4-human-checkpoint.json), [formal acceptance](m4-acceptance-check.md). Provenance worked mechanically; retrieval did not reliably improve semantic reasoning and remains experimental/not adopted by default. No percentage, promotion or product-value claim.

All unchanged phase DoD and milestone requirements are satisfied within the limited M4 lab scope; formal acceptance is recorded with required CI on the resulting docs/evidence-only head. Failed final-head gates must reopen acceptance. No scope/threshold waiver or executable change. Earlier pending annotations are preserved history, superseded by this checkpoint. M3 9/9 turn_budget/zero drafts and original Windows/lifecycle/expiry failures remain preserved. PR #6 must not be merged. Phase 17/M5 is not authorized; stop at M4.

## M5 authorization and execution — 2026-10-09

The user confirms PR #6 merged and explicitly authorizes M5 — Advanced Agentic QA, Phases 17–19. Verified main merge: 7cd2ca0ba226c2979a887a5f987874208ce6a279. Begin on feat/m5-advanced-qa. Finish each phase's unchanged scope/DoD/security/evidence and full required CI before the next; consolidate desktop/human/Teach-Back at the M5 boundary. Stop before Phase 20/M6. No automatic merge/release or additional operational authority. M4 acceptance, default-retrieval rejection, all historical failures and M3 9/9 turn_budget/zero drafts remain unchanged. Previous M5-not-authorized annotations are preserved history and superseded by this explicit authorization.
