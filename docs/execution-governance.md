# Approved execution governance — 2026-10-08

The user-approved amendment in [roadmap.md](roadmap.md#authorized-milestone-execution) governs execution. Individual phase scopes and engineering DoD remain unchanged. Finish each phase before starting the next, preserve phase reports/evidence and coherent history, and fix ordinary technical problems autonomously.

Current authorization: Phase 6 human-reviewed/closed; complete Phase 7, then 8 → 9 → 10. Stop at **M2 — AI Product**. Do not start Phase 11/M3 without explicit authorization. Other milestones remain M1 0–5, M3 11–13, M4 14–16, M5 17–19 and M6 20.

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
