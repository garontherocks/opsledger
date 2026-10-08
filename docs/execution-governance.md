# Approved execution governance — 2026-10-08

The user-approved amendment in [roadmap.md](roadmap.md#authorized-milestone-execution) governs execution. Individual phase scopes and engineering DoD remain unchanged. Finish each phase before starting the next, preserve phase reports/evidence and coherent history, and fix ordinary technical problems autonomously.

Current authorization: Phase 6 human-reviewed/closed; complete Phase 7, then 8 → 9 → 10. Stop at **M2 — AI Product**. Do not start Phase 11/M3 without explicit authorization. Other milestones remain M1 0–5, M3 11–13, M4 14–16, M5 17–19 and M6 20.

Human gates are consolidated at milestone boundaries: practical 5–8-question Teach-Back, architecture/data flow, selected failures/security/interview scenarios, material semantic review samples and one Desktop Validation Bundle. Generate per-phase learning materials without assuming answers. Do not repeat deterministic validation on the desktop without a specific reason.

Stop earlier for a failed required deterministic gate, serious security issue, human/product architecture decision or unresolved material prerequisite. Engineering rigor, explicit authority boundaries, local-first setup, evidence-backed claims and honest failure/inconclusive reporting are unchanged. No automatic merge or deployment authority is granted.

## Authorization update — 2026-10-08 after M2 closure

M2 is formally accepted under docs/m2-quality-acceptance-policy.md and merged to main. The user requested the next phase, authorizing Phase 11, the first Agent Foundations phase. The earlier M2-only authorization statement is historical and superseded for Phase 11. This assignment implements Phase 11 only; do not silently add Phase 12/13 implementation. Keep learning/desktop checks accumulated rather than requiring a new phase-level human checkpoint. No M4/Phase 14 transition is authorized.

## Authorization update — 2026-10-08 Phase 12

The user explicitly ordered PR #3 merge and Phase 12 start. PR #3 merged with both current-head CI lanes successful, using a merge commit (no squash/rebase or branch deletion), at b0b785a922288a831fe28266c4d2bb27462b6e5a. This assignment implements Phase 12 only, preserving its individual DoD and accumulated M3 learning/desktop validation. No Phase 13 implementation or M4 transition is included. Main protection remains unavailable under the recorded private-plan limitation; actual checks are still required before integration.
