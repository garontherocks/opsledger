# M2 — AI Product engineering handoff

Authorized boundary: Phases 6–10. Phase 6 is human-reviewed and closed. Each later phase retains its own scope, implementation, validation, learning material, security/evaluation evidence and report. No Phase 11 implementation is authorized.

| Phase | Engineering delivery | Commit |
|---|---|---|
| 6 | Pinned local provider and read-only assistance, reviewed desktop baseline | cccafb47a8921a84a758568b0674ed7f83c29c95 |
| 7 | Strict structured drafts, deterministic state/ID checks | d20ef91bda8c573b20b299f221ec61befda7ad6f |
| 8 | Versioned chunks, local embeddings, scoped exact pgvector retrieval | 59d8bd786d53b4a5599f14b97d00f49a6868814e |
| 9 | Grounded copilot, exact citations, return-time source revalidation | 1652eb471bae26910524f6ecb38e2970d01396a9 |
| 10 | Signed append-only quality feedback, adversarial regression and integrated desktop harness | b7519d65bbd3d3afffc2c9d2d1ced4d4a5a7ef93 |

Work: clean ignore-scripts install, lint/types/build, 36 unit checks, 82 integration checks (81 pass, one native-only skip), 114 deterministic Promptfoo evaluations and a 36-generation synthetic desktop rehearsal. Zero unexpected evaluation egress after the recorded denied telemetry event and reviewed suppression. Embedded quiesced restore includes nonempty chunks and feedback. Fixture success does not prove live model quality.

Native CI uncovered an inherited shared-database fixture problem and a pipeline that masked failures through tee. Corrective commits enable bash pipefail, create independent generated test databases without resetting the supplied DB, and wait for normal connection termination before dropping only owned fixtures. The disposable CI role needs CREATEDB; that is not production least-privilege proof. Current native/browser results and validated commit are in [CI receipt](../evidence/m2-ci-receipt.json). Historical phase reports preserve what was observed then.

M2 acceptance remains distinct from implementation: actual pinned desktop model/retrieval quality, calibrated representative semantic review, product usefulness and consolidated Teach-Back are pending. [One Desktop Bundle](m2-desktop-validation.md), [samples](m2-human-review-samples.md), [Teach-Back](m2-teach-back.md), [architecture](m2-architecture.md) and [security/evals](m2-security-evals.md) provide one milestone session, without reproducing deterministic CI tests.

Debt: provisional quality thresholds; consumed held-out fixtures; Markdown-only bounded ingestion; exact retrieval without ANN scale proof; incomplete pattern-based redaction; sampled rather than peak GPU measurements; process guard rather than OS sandbox. Realistic least-privilege deployment, multi-worker kill/crash recovery and native backup/restore remain inherited operational gates, not proven by privileged CI or embedded restore.

Recommendation: accept M3 only after engineering gates and the single M2 desktop/quality/understanding session are accepted, then explicitly authorize it. Model suggestions never gain operational authority. History is preserved, no squash/force push/main merge. Draft PR: https://github.com/garontherocks/opsledger/pull/1 . Branch: feat/m2-ai-regression.
