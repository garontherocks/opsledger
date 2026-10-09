# Consolidated M4 Teach-Back — completed user checkpoint

One milestone checkpoint, not separate phase interviews. M1–M3 answers/results are preserved and will not be reused as new M4 demonstrations.

1. Why can QA retrieval find the right artifact yet fail to improve strategy? Explain the paired no-retrieval baseline, identical mandatory evidence, provenance and default-adoption rejection.
2. Distinguish run state, append-only history and reviewed expiring memory. Why are commands, secrets and unreviewed instructions excluded from memory? What invalidates a finding?
3. Explain what actually survives an abrupt process death. Which commits are atomic, and why is replaying a read-only check different from duplicating a stored report side effect?
4. Explain lease expiry, the two-attempt bound and fencing of a late old result. Why does cooperative cancellation not guarantee an OS sandbox or external rollback?
5. What exactly is bound by an approval: SHA, action, run/workspace/owner, receipt/context, reviewer and expiry? Explain denial, replay and a target change between proposal and committing the effect.
6. Why do four green registered lab checks, a human approval and a cited AI plan still not establish full CI, production semantic quality, product value or release authority?
7. Defend retaining TypeScript/PostgreSQL after the runtime spike. What concrete need/evidence could justify adopting a durable graph runtime later?

## Two architecture explanations

Explain [both lanes](m4-architecture.md): reviewed evidence → vector space/context → unverified plan; and session/scoped state → fixed checks → immutable receipt → bound human approval → transactional report. Identify the authority boundary at each step and explain which context path is experimental.

## Selected controlled failures

Choose two: failed required check remains blocked despite convincing model text; revoked membership during check execution discards the result; SIGKILL at receipt/report commit boundary recovers without a duplicated report; expired/wrong-SHA/action/replayed approval cannot be consumed. Use actual CI evidence, not assumed local success.

## Senior/Staff scenarios

- A reviewed report's approval is valid, but HEAD changed and a manager asks to reuse it for the new SHA. Explain the binding, invalidation and required new checks/review; never promote a historical receipt into a current verdict.
- A proposed graph/n8n integration promises automatic repair/merge and persistent free-text memory. Explain what measured orchestration need might justify experimentation, which boundaries remain in TypeScript, and why neither a workflow nor a Skill grants authority.

Evidence: [Phase 14](phase14-report.md), [Phase 15](phase15-report.md), [Phase 16](phase16-report.md), [engineering/acceptance](m4-engineering-report.md). The user explicitly reports the completed results below; no model quality or human approval is inferred from fixtures.

## Actual learner checkpoint — 2026-10-09

| Checkpoint item | User-reported result |
|---|---|
| Questions 1–7 | Passed |
| Architecture Flow A | Passed |
| Architecture Flow B | Passed |
| Controlled failure: failed required check cannot be overridden by model output | Passed |
| Controlled failure: approval expiry across the TOCTOU window | Passed |
| Senior/Staff SHA-binding scenario | Passed |
| Senior/Staff graph-runtime/n8n authority-boundary scenario | Passed |

These are the user's supplied completion results. Detailed learner answers or transcripts were not supplied in this checkpoint and are not reconstructed. The questions and scenario prompts above are retained as the checkpoint rubric, not newly invented learner explanations. No Teach-Back was repeated. [Structured record](../evidence/m4-human-checkpoint.json).
