# Consolidated M2 Teach-Back

Phase 6 understanding is already demonstrated. Do not repeat that checkpoint or assume learner answers. Checkpoint completed 2026-10-08. The following original prompts remain for reference; actual supplied answers are in [human checkpoint](m2-human-checkpoint.md):

1. What can JSON/state/ID/quote validation guarantee, and why can a valid cited answer still be false?
2. Why do embedding digest, dimensions and chunk/index version define a vector space? What changes require reindexing?
3. Diagnose missing relevant results: scope/publication, coverage, identity or ranking. Explain Recall@5 versus MRR.
4. Explain release of DB connections during inference and membership/revision/publication rechecks afterwards.
5. Separate retrieval failure from generation failure using fixed-context and end-to-end lanes. When should the answer abstain?
6. What do repeated live trials and consumed held-out cases tell you? Why are fixture repetitions not quality evidence?
7. Use the denied disabled-telemetry event to explain flags versus enforced egress boundaries and process-guard limits.
8. Given the direct-reading baseline, what measured value justifies optional AI? Why does feedback grant no authority?

Explain two flows: published runbook → chunks → pinned embeddings → scoped retrieval; question/sources → generation → validation → current-source recheck → unverified display. See [architecture](m2-architecture.md).

Educational failures: [contract-valid falsehood](../evidence/phase7-eval-report.json), [mixed digest/withdrawal/revocation](../evidence/phase8-boundaries.json), [valid quote with false claim](../evidence/phase9-evals.json), [telemetry denial](../evidence/phase10-telemetry-denial.json).

Senior/Staff scenarios: defend boundaries when asked to auto-close incidents from convincing cited text; design a paired fresh-held-out/repeated experiment when a benchmark-winning model worsens Spanish retrieval or abstention.

Use [selected samples](m2-human-review-samples.md). The learner supplied all eight answers, both architecture flows and both Senior/Staff scenarios; understanding checkpoint completed. Stop before M3.
